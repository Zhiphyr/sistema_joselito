const db = require('../config/db');

class LiquidacionModel {

    /**
     * Obtiene todos los viajes con estado_pagos = 'Pendiente'.
     * Calcula bruto, peso_total y penalidades acumuladas del conductor de ese viaje.
     */
    static async obtenerViajesPendientes() {
        const sql = `
            SELECT
                v.id_viaje,
                v.tarifa_transportista,
                v.monto_adelanto,
                v.fecha_salida,
                v.fecha_llegada,
                v.estado_operativo,
                c.conductor        AS chofer_nombre,
                c.numero_documento AS chofer_dni,
                c.placa            AS vehiculo_placa,
                c.nombre           AS vehiculo_nombre,
                r.ciudad_origen,
                r.ciudad_destino,

                -- Peso total acumulado de todos los Detalle_Carga de todas las Cargas del viaje
                COALESCE((
                    SELECT SUM(dc.peso_total)
                    FROM carga cg
                    JOIN detalle_carga dc ON cg.id_carga = dc.id_carga AND dc.estado != 2
                    WHERE cg.id_viaje = v.id_viaje AND cg.estado != 2
                ), 0) AS peso_total_kg,

                -- Monto Bruto = peso_total × tarifa_transportista
                COALESCE((
                    SELECT SUM(dc.peso_total)
                    FROM carga cg
                    JOIN detalle_carga dc ON cg.id_carga = dc.id_carga AND dc.estado != 2
                    WHERE cg.id_viaje = v.id_viaje AND cg.estado != 2
                ), 0) * v.tarifa_transportista AS monto_bruto,

                -- Penalidades = suma de monto_descuento_chofer - monto_cobrado de todas las incidencias pendientes/parciales del conductor
                COALESCE((
                    SELECT SUM(iv.monto_descuento_chofer - iv.monto_cobrado)
                    FROM incidencia_viaje iv
                    JOIN viaje v_inc ON iv.id_viaje = v_inc.id_viaje
                    JOIN camiones c_inc ON v_inc.id_camion = c_inc.id_camion
                    WHERE c_inc.numero_documento = c.numero_documento
                      AND iv.estado = 1
                      AND iv.monto_descuento_chofer > 0
                      AND iv.estado_cobro_penalidad IN ('Pendiente', 'Cobrado Parcial')
                ), 0) AS penalidades

            FROM viaje v
            JOIN camiones c ON v.id_camion = c.id_camion
            JOIN rutas r ON v.id_ruta = r.id_ruta
            WHERE v.estado_pagos = 'Pendiente'
              AND v.estado != 2
            ORDER BY v.fecha_salida DESC
        `;
        const [rows] = await db.query(sql);
        return rows;
    }

    /**
     * Obtiene los KPIs para las 3 tarjetas del módulo.
     */
    static async obtenerKPIs() {
        // Viajes pendientes y total por pagar (sin restar monto_adelanto)
        const sqlPendientes = `
            SELECT
                COUNT(v.id_viaje) AS total_pendientes,
                COALESCE(SUM(
                    COALESCE((
                        SELECT SUM(dc.peso_total)
                        FROM carga cg
                        JOIN detalle_carga dc ON cg.id_carga = dc.id_carga AND dc.estado != 2
                        WHERE cg.id_viaje = v.id_viaje AND cg.estado != 2
                    ), 0) * v.tarifa_transportista
                    - COALESCE((
                        SELECT SUM(iv.monto_descuento_chofer - iv.monto_cobrado)
                        FROM incidencia_viaje iv
                        JOIN viaje v_inc ON iv.id_viaje = v_inc.id_viaje
                        JOIN camiones c_inc ON v_inc.id_camion = c_inc.id_camion
                        WHERE c_inc.numero_documento = c.numero_documento
                          AND iv.estado = 1
                          AND iv.monto_descuento_chofer > 0
                          AND iv.estado_cobro_penalidad IN ('Pendiente', 'Cobrado Parcial')
                    ), 0)
                ), 0) AS total_por_pagar
            FROM viaje v
            JOIN camiones c ON v.id_camion = c.id_camion
            WHERE v.estado_pagos = 'Pendiente'
              AND v.estado != 2
        `;

        // Pagado el mes actual
        const sqlPagado = `
            SELECT COALESCE(SUM(lc.monto_neto_pagado), 0) AS pagado_mes
            FROM liquidaciones_chofer lc
            WHERE MONTH(lc.fecha_liquidacion) = MONTH(NOW())
              AND YEAR(lc.fecha_liquidacion)  = YEAR(NOW())
        `;

        const [[kpiPendientes]] = await db.query(sqlPendientes);
        const [[kpiPagado]]     = await db.query(sqlPagado);

        return {
            total_pendientes: Number(kpiPendientes.total_pendientes),
            total_por_pagar:  Number(kpiPendientes.total_por_pagar),
            pagado_mes:       Number(kpiPagado.pagado_mes)
        };
    }

    /**
     * Obtiene el historial (viajes ya liquidados) con datos de liquidaciones_chofer.
     */
    static async obtenerHistorial() {
        const sql = `
            SELECT
                lc.id_liqui_chofer,
                lc.id_viaje,
                lc.peso_total_viaje,
                lc.monto_bruto,
                lc.descuento_adelanto,
                lc.descuento_incidencias,
                lc.monto_neto_pagado,
                lc.fecha_liquidacion,
                COALESCE((
                    SELECT SUM(di.monto_descontado)
                    FROM descuento_incidencia di
                    WHERE di.id_viaje = lc.id_viaje
                ), 0) AS reduccion_penalidad,
                c.conductor        AS chofer_nombre,
                c.numero_documento AS chofer_dni,
                c.placa            AS vehiculo_placa,
                r.ciudad_origen,
                r.ciudad_destino
            FROM liquidaciones_chofer lc
            JOIN viaje v  ON lc.id_viaje = v.id_viaje
            JOIN camiones c ON v.id_camion = c.id_camion
            JOIN rutas r    ON v.id_ruta   = r.id_ruta
            ORDER BY lc.fecha_liquidacion DESC
        `;
        const [rows] = await db.query(sql);
        return rows;
    }

    /**
     * Obtiene las incidencias pendientes con saldo por cobrar para un conductor por su DNI.
     */
    static async obtenerIncidenciasPendientesPorChofer(choferDni) {
        const sql = `
            SELECT
                iv.id_incidencia,
                iv.id_viaje,
                iv.tipo_incidencia,
                iv.descripcion_detallada,
                iv.monto_descuento_chofer,
                iv.monto_cobrado,
                (iv.monto_descuento_chofer - iv.monto_cobrado) AS saldo_pendiente,
                iv.fecha_creacion
            FROM incidencia_viaje iv
            JOIN viaje v ON iv.id_viaje = v.id_viaje
            JOIN camiones c ON v.id_camion = c.id_camion
            WHERE c.numero_documento = ?
              AND iv.estado = 1
              AND iv.monto_descuento_chofer > 0
              AND iv.estado_cobro_penalidad IN ('Pendiente', 'Cobrado Parcial')
            ORDER BY iv.fecha_creacion ASC
        `;
        const [rows] = await db.query(sql, [choferDni]);
        return rows;
    }

    /**
     * Registra la liquidación de un viaje y procesa los descuentos de incidencias asociados.
     */
    static async registrarLiquidacion({
        id_viaje,
        peso_total_viaje,
        monto_bruto,
        descuento_adelanto,
        descuento_incidencias,
        monto_neto_pagado,
        incidencias_descuentos, // array de: { id_incidencia, monto_a_descontar }
        observaciones,
        id_usuario
    }) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Insertar en liquidaciones_chofer
            await connection.query(
                `INSERT INTO liquidaciones_chofer
                    (id_viaje, peso_total_viaje, monto_bruto, descuento_adelanto, descuento_incidencias, monto_neto_pagado)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [id_viaje, peso_total_viaje, monto_bruto, descuento_adelanto, descuento_incidencias, monto_neto_pagado]
            );

            // 2. Marcar viaje como Pagado y registrar el adelanto cobrado
            await connection.query(
                `UPDATE viaje SET estado_pagos = 'Pagado', monto_adelanto = ? WHERE id_viaje = ?`,
                [descuento_adelanto, id_viaje]
            );

            // 3. Registrar descuentos en descuento_incidencia y actualizar montos de cobro de incidencias
            if (incidencias_descuentos && incidencias_descuentos.length > 0) {
                for (const item of incidencias_descuentos) {
                    if (Number(item.monto_a_descontar) > 0) {
                        // A. Insertar en descuento_incidencia
                        await connection.query(
                            `INSERT INTO descuento_incidencia
                                (id_incidencia, id_viaje, monto_descontado, observacion, estado, id_usuario)
                             VALUES (?, ?, ?, ?, 1, ?)`,
                            [
                                item.id_incidencia,
                                id_viaje,
                                Number(item.monto_a_descontar),
                                observaciones || 'Descuento manual aplicado en liquidación',
                                id_usuario
                            ]
                        );

                        // B. Consultar estado actual del cobro en la incidencia para actualizarlo
                        const [[inc]] = await connection.query(
                            `SELECT monto_descuento_chofer, monto_cobrado FROM incidencia_viaje WHERE id_incidencia = ?`,
                            [item.id_incidencia]
                        );

                        if (inc) {
                            const nuevoMontoCobrado = Number(inc.monto_cobrado) + Number(item.monto_a_descontar);
                            // Determinar nuevo estado del cobro
                            let nuevoEstadoCobro = 'Cobrado Parcial';
                            if (nuevoMontoCobrado >= Number(inc.monto_descuento_chofer)) {
                                nuevoEstadoCobro = 'Cobrado';
                            }

                            // Determinar nuevo estado de resolución
                            let nuevoEstadoResolucion = 'Pendiente';
                            if (nuevoMontoCobrado >= Number(inc.monto_descuento_chofer)) {
                                nuevoEstadoResolucion = 'Resuelto';
                            }

                            await connection.query(
                                `UPDATE incidencia_viaje
                                 SET monto_cobrado = ?,
                                     estado_cobro_penalidad = ?,
                                     estado_resolucion = ?
                                 WHERE id_incidencia = ?`,
                                [nuevoMontoCobrado, nuevoEstadoCobro, nuevoEstadoResolucion, item.id_incidencia]
                            );
                        }
                    }
                }
            }

            await connection.commit();
            return true;
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }
}

module.exports = LiquidacionModel;
