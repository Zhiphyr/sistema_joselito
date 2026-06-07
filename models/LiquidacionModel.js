const db = require('../config/db');

class LiquidacionModel {

    // Viajes finalizados o llegados que aún no tienen liquidación creada
    static async obtenerViajesLiquidables() {
        const query = `
            SELECT 
                v.id_viaje,
                v.fecha_salida,
                v.fecha_llegada,
                v.estado_operativo,
                v.tarifa_transportista,
                cam.placa AS vehiculo,
                cam.conductor AS chofer,
                r.ciudad_origen,
                r.ciudad_destino,
                COALESCE((
                    SELECT SUM(dc.peso_total)
                    FROM carga ca
                    JOIN detalle_carga dc ON ca.id_carga = dc.id_carga AND dc.estado != 2
                    WHERE ca.id_viaje = v.id_viaje AND ca.estado != 2
                ), 0) AS peso_total_kg,
                COALESCE((
                    SELECT SUM(i.monto_afectado)
                    FROM incidencias i
                    JOIN carga ca ON i.id_carga = ca.id_carga
                    WHERE ca.id_viaje = v.id_viaje AND i.afecta_a = 'Transportista' AND i.estado = 1
                ), 0) AS descuento_incidencia
            FROM viaje v
            JOIN camiones cam ON v.id_camion = cam.id_camion
            JOIN rutas r ON v.id_ruta = r.id_ruta
            LEFT JOIN liquidacion_viaje l ON v.id_viaje = l.id_viaje AND l.estado = 1
            WHERE v.estado != 2
              AND v.estado_operativo IN ('Llegó a Destino', 'Finalizado')
              AND l.id_liquidacion IS NULL
            ORDER BY v.fecha_salida DESC
        `;
        const [rows] = await db.query(query);
        return rows;
    }

    // Liquidaciones ya generadas (cuentas por pagar a choferes)
    static async obtenerLiquidaciones() {
        const query = `
            SELECT 
                l.id_liquidacion,
                l.id_viaje,
                l.peso_total_kg,
                l.monto_calculado,
                l.descuento_incidencia,
                l.monto_total,
                l.estado_pago,
                cam.placa AS vehiculo,
                cam.conductor AS chofer,
                r.ciudad_origen,
                r.ciudad_destino,
                COALESCE((SELECT SUM(monto) FROM pagos_transportista WHERE id_liquidacion = l.id_liquidacion AND estado = 1), 0) AS pagado,
                l.monto_total - COALESCE((SELECT SUM(monto) FROM pagos_transportista WHERE id_liquidacion = l.id_liquidacion AND estado = 1), 0) AS saldo
            FROM liquidacion_viaje l
            JOIN viaje v ON l.id_viaje = v.id_viaje
            JOIN camiones cam ON v.id_camion = cam.id_camion
            JOIN rutas r ON v.id_ruta = r.id_ruta
            WHERE l.estado = 1
            ORDER BY l.id_liquidacion DESC
        `;
        const [rows] = await db.query(query);
        return rows;
    }

    static async obtenerLiquidacionPorId(id_liquidacion) {
        const query = `
            SELECT 
                l.*, cam.conductor AS chofer, cam.placa AS vehiculo,
                COALESCE((SELECT SUM(monto) FROM pagos_transportista WHERE id_liquidacion = l.id_liquidacion AND estado = 1), 0) AS pagado
            FROM liquidacion_viaje l
            JOIN viaje v ON l.id_viaje = v.id_viaje
            JOIN camiones cam ON v.id_camion = cam.id_camion
            WHERE l.id_liquidacion = ?
        `;
        const [rows] = await db.query(query, [id_liquidacion]);
        return rows[0];
    }

    static async existeLiquidacionDeViaje(id_viaje) {
        const query = `SELECT id_liquidacion FROM liquidacion_viaje WHERE id_viaje = ? AND estado = 1`;
        const [rows] = await db.query(query, [id_viaje]);
        return rows[0];
    }

    // Genera la liquidación de un viaje calculando peso y descuentos al momento (snapshot)
    static async generarLiquidacion(id_viaje, id_usuario) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Tarifa del viaje
            const [[viaje]] = await connection.query(
                `SELECT tarifa_transportista FROM viaje WHERE id_viaje = ?`,
                [id_viaje]
            );
            if (!viaje) throw new Error('Viaje no encontrado');

            // Peso total real del viaje
            const [[{ peso }]] = await connection.query(
                `SELECT COALESCE(SUM(dc.peso_total),0) AS peso
                 FROM carga ca
                 JOIN detalle_carga dc ON ca.id_carga = dc.id_carga AND dc.estado != 2
                 WHERE ca.id_viaje = ? AND ca.estado != 2`,
                [id_viaje]
            );

            // Descuentos por incidencias imputadas al transportista
            const [[{ descuento }]] = await connection.query(
                `SELECT COALESCE(SUM(i.monto_afectado),0) AS descuento
                 FROM incidencias i
                 JOIN carga ca ON i.id_carga = ca.id_carga
                 WHERE ca.id_viaje = ? AND i.afecta_a = 'Transportista' AND i.estado = 1`,
                [id_viaje]
            );

            const montoCalculado = Number(peso) * Number(viaje.tarifa_transportista);
            const montoTotal = montoCalculado - Number(descuento);

            const [result] = await connection.query(
                `INSERT INTO liquidacion_viaje 
                    (id_viaje, peso_total_kg, monto_calculado, descuento_incidencia, monto_total, id_usuario)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [id_viaje, peso, montoCalculado, descuento, montoTotal, id_usuario]
            );

            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async obtenerPagosPorLiquidacion(id_liquidacion) {
        const query = `
            SELECT 
                p.id_pago, p.monto, p.es_adelanto, p.fecha_pago, p.referencia, p.observacion,
                mp.nombre AS medio_pago, u.nombre AS usuario
            FROM pagos_transportista p
            JOIN medios_pago mp ON p.id_medio_pago = mp.id_medio_pago
            JOIN usuarios u ON p.id_usuario = u.id_usuario
            WHERE p.id_liquidacion = ? AND p.estado = 1
            ORDER BY p.id_pago DESC
        `;
        const [rows] = await db.query(query, [id_liquidacion]);
        return rows;
    }

    // Registra un desembolso/adelanto al chofer + egreso en caja.
    // El trigger trg_pago_after_insert recalcula estado_pago de la liquidación.
    static async registrarPago(datos) {
        const { id_liquidacion, id_medio_pago, monto, es_adelanto, fecha_pago, referencia, observacion, id_usuario } = datos;
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [result] = await connection.query(
                `INSERT INTO pagos_transportista 
                    (id_liquidacion, id_medio_pago, monto, es_adelanto, fecha_pago, referencia, observacion, id_usuario)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [id_liquidacion, id_medio_pago, monto, es_adelanto ? 1 : 0, fecha_pago, referencia || null, observacion || null, id_usuario]
            );

            // Espejo en caja (Egreso)
            await connection.query(
                `INSERT INTO movimiento_caja (id_medio_pago, tipo_movimiento, monto, descripcion, id_usuario)
                 VALUES (?, 'Egreso', ?, ?, ?)`,
                [id_medio_pago, monto, `Pago a transportista - Liquidación #${id_liquidacion}`, id_usuario]
            );

            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = LiquidacionModel;
