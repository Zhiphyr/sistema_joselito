const db = require('../config/db');

class CobroModel {

    // Lista de cargas con saldo pendiente (usa la vista v_cuentas_por_cobrar + datos del viaje)
    static async obtenerCuentasPorCobrar() {
        const query = `
            SELECT 
                c.id_carga,
                c.id_viaje,
                v.estado_operativo,
                r.ciudad_origen,
                r.ciudad_destino,
                cam.placa AS vehiculo,
                rem.nombre_razon_social AS remitente_nombre,
                cli.nombre_razon_social AS cliente,
                cli.telefono,
                cli.numero_documento AS cliente_doc,
                c.flete_total,
                COALESCE((SELECT SUM(monto) FROM cobros WHERE id_carga = c.id_carga AND estado = 1), 0) AS cobrado,
                c.flete_total - COALESCE((SELECT SUM(monto) FROM cobros WHERE id_carga = c.id_carga AND estado = 1), 0) AS saldo,
                c.estado_cobro,
                c.estado_entrega
            FROM carga c
            JOIN clientes cli ON c.id_destinatario = cli.id_cliente
            JOIN clientes rem ON c.id_remitente = rem.id_cliente
            JOIN viaje v ON c.id_viaje = v.id_viaje
            JOIN rutas r ON v.id_ruta = r.id_ruta
            JOIN camiones cam ON v.id_camion = cam.id_camion
            WHERE c.estado != 2 AND c.estado_cobro != 'Completado' AND c.flete_total > 0
            ORDER BY c.id_carga ASC
        `;
        const [rows] = await db.query(query);
        return rows;
    }

    static async obtenerCargaPorId(id_carga) {
        const query = `
            SELECT 
                c.id_carga, c.id_viaje, c.flete_total, c.estado_cobro,
                cli.nombre_razon_social AS cliente, cli.telefono,
                COALESCE((SELECT SUM(monto) FROM cobros WHERE id_carga = c.id_carga AND estado = 1), 0) AS cobrado
            FROM carga c
            JOIN clientes cli ON c.id_destinatario = cli.id_cliente
            WHERE c.id_carga = ?
        `;
        const [rows] = await db.query(query, [id_carga]);
        return rows[0];
    }

    // Historial de abonos de una carga
    static async obtenerCobrosPorCarga(id_carga) {
        const query = `
            SELECT 
                co.id_cobro, co.monto, co.fecha_cobro, co.referencia, co.observacion,
                mp.nombre AS medio_pago, u.nombre AS usuario
            FROM cobros co
            JOIN medios_pago mp ON co.id_medio_pago = mp.id_medio_pago
            JOIN usuarios u ON co.id_usuario = u.id_usuario
            WHERE co.id_carga = ? AND co.estado = 1
            ORDER BY co.id_cobro DESC
        `;
        const [rows] = await db.query(query, [id_carga]);
        return rows;
    }

    static async obtenerMediosPago() {
        const query = `SELECT id_medio_pago, nombre FROM medios_pago WHERE estado = 1 ORDER BY id_medio_pago ASC`;
        const [rows] = await db.query(query);
        return rows;
    }

    // Registra un abono. El trigger trg_cobro_after_insert recalcula estado_cobro de la carga.
    // Además registramos el ingreso en el libro de caja (movimiento_caja).
    static async registrarCobro(datos) {
        const { id_carga, id_medio_pago, monto, fecha_cobro, referencia, observacion, id_usuario } = datos;
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [resCobro] = await connection.query(
                `INSERT INTO cobros (id_carga, id_medio_pago, monto, fecha_cobro, referencia, observacion, id_usuario)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [id_carga, id_medio_pago, monto, fecha_cobro, referencia || null, observacion || null, id_usuario]
            );
            const idCobro = resCobro.insertId;

            // Espejo en caja (Ingreso)
            await connection.query(
                `INSERT INTO movimiento_caja (id_cobro, id_medio_pago, tipo_movimiento, monto, descripcion, id_usuario)
                 VALUES (?, ?, 'Ingreso', ?, ?, ?)`,
                [idCobro, id_medio_pago, monto, `Cobro de flete - Carga #${id_carga}`, id_usuario]
            );

            await connection.commit();
            return idCobro;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Anula un cobro (borrado lógico) y recalcula manualmente el estado de la carga,
    // ya que el trigger solo dispara en INSERT.
    static async anularCobro(id_cobro, id_carga) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            await connection.query(`UPDATE cobros SET estado = 0 WHERE id_cobro = ?`, [id_cobro]);
            await connection.query(`UPDATE movimiento_caja SET estado = 0 WHERE id_cobro = ?`, [id_cobro]);

            const [[{ pagado }]] = await connection.query(
                `SELECT COALESCE(SUM(monto),0) AS pagado FROM cobros WHERE id_carga = ? AND estado = 1`,
                [id_carga]
            );
            const [[{ total }]] = await connection.query(
                `SELECT flete_total AS total FROM carga WHERE id_carga = ?`,
                [id_carga]
            );

            let nuevoEstado = 'Pendiente';
            if (pagado >= total && total > 0) nuevoEstado = 'Completado';
            else if (pagado > 0) nuevoEstado = 'Parcial';

            await connection.query(`UPDATE carga SET estado_cobro = ? WHERE id_carga = ?`, [nuevoEstado, id_carga]);

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = CobroModel;
