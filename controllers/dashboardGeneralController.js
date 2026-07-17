const pool = require('../config/db');

exports.getResumenGeneral = async (req, res) => {
    try {
        const deudaFilterJoin = `
            FROM Carga c
            JOIN Viaje v ON c.id_viaje = v.id_viaje
            WHERE c.estado = 1
            AND v.estado_operativo IN ('Llegó a Destino', 'Finalizado')
            AND c.estado_entrega IN ('Entregado', 'Entregado Parcialmente')
            AND c.estado_cobro IN ('Pendiente', 'Parcial')
        `;
        const saldoPendienteExpr = `(
            IFNULL((SELECT SUM(flete_subtotal) FROM Detalle_Carga dc WHERE dc.id_carga = c.id_carga AND dc.estado_operativo IN ('Normal', 'Entregado') AND dc.estado = 1), 0)
            - IFNULL((SELECT SUM(monto_pagado) FROM pago_carga pc WHERE pc.id_carga = c.id_carga AND pc.estado = 1), 0)
        )`;

        const [
            [viajesEnCursoRow],
            [viajesFinalizadosRow],
            [cargasTransitoRow],
            [incidenciasMesRow],
            [flotaRow],
            [deudaRow],
            [distribucionCargasRows],
            [topIncidenciasRows],
            [volumenViajesRows],
            [topRutasRows],
            [ultimosViajesRows],
            [cargasCriticasRows],
            [pendientesCobroRows]
        ] = await Promise.all([
            pool.query(`SELECT COUNT(*) AS count FROM Viaje WHERE estado_operativo NOT IN ('Finalizado', 'Incidencia') AND estado != 2`),
            pool.query(`SELECT COUNT(*) AS count FROM Viaje WHERE estado_operativo = 'Finalizado' AND estado_pagos = 'Liquidado' AND estado != 2`),
            pool.query(`SELECT COUNT(*) AS count FROM Carga WHERE estado_entrega IN ('En ruta', 'En Almacen de Origen', 'En Almacen de Destino') AND estado != 2`),
            pool.query(`SELECT COUNT(*) AS count FROM Incidencia_Viaje WHERE MONTH(fecha_creacion) = MONTH(CURRENT_DATE()) AND YEAR(fecha_creacion) = YEAR(CURRENT_DATE()) AND estado != 2`),
            pool.query(`SELECT (SELECT COUNT(*) FROM camiones WHERE estado = 1) AS activos, (SELECT COUNT(*) FROM camiones) AS total`),
            pool.query(`SELECT SUM(${saldoPendienteExpr}) AS total ${deudaFilterJoin}`),
            pool.query(`SELECT estado_entrega AS estado, COUNT(*) AS total FROM Carga WHERE estado != 2 GROUP BY estado_entrega`),
            pool.query(`SELECT tipo_incidencia, COUNT(*) AS total FROM Incidencia_Viaje WHERE estado != 2 GROUP BY tipo_incidencia ORDER BY total DESC LIMIT 5`),
            pool.query(`SELECT DATE(fecha_salida) AS fecha, COUNT(*) AS total FROM Viaje WHERE fecha_salida >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) AND estado != 2 GROUP BY DATE(fecha_salida) ORDER BY fecha ASC`),
            pool.query(`SELECT r.ciudad_origen AS origen, r.ciudad_destino AS destino, COUNT(v.id_viaje) AS cantidad FROM Viaje v JOIN rutas r ON v.id_ruta = r.id_ruta WHERE v.estado != 2 GROUP BY v.id_ruta ORDER BY cantidad DESC LIMIT 5`),
            pool.query(`SELECT v.id_viaje AS correlativo, v.estado_operativo, v.fecha_salida, c.placa, r.ciudad_origen AS origen, r.ciudad_destino AS destino FROM Viaje v LEFT JOIN camiones c ON v.id_camion = c.id_camion LEFT JOIN rutas r ON v.id_ruta = r.id_ruta WHERE v.estado_operativo NOT IN ('Finalizado', 'Incidencia') AND v.estado != 2 ORDER BY v.fecha_salida DESC LIMIT 5`),
            pool.query(`SELECT c.id_carga AS numero_guia, c.estado_entrega, v.id_viaje AS correlativo, cl.nombre_razon_social AS razon_social FROM Carga c JOIN Viaje v ON c.id_viaje = v.id_viaje LEFT JOIN clientes cl ON c.id_destinatario = cl.id_cliente WHERE c.estado_entrega IN ('Siniestrado', 'Rechazado', 'Transbordado', 'Siniestrado Parcialmente', 'Rechazado Total') AND c.estado != 2 ORDER BY c.id_carga DESC LIMIT 5`),
            pool.query(`SELECT cli.nombre_razon_social AS razon_social, ${saldoPendienteExpr} AS monto_restante, v.fecha_llegada AS fecha_vencimiento ${deudaFilterJoin.replace('FROM Carga c', 'FROM Carga c JOIN clientes cli ON c.id_destinatario = cli.id_cliente')} ORDER BY v.fecha_llegada ASC LIMIT 5`)
        ]);

        res.json({
            success: true,
            data: {
                kpis: {
                    viajesEnCurso: viajesEnCursoRow[0].count,
                    viajesFinalizados: viajesFinalizadosRow[0].count,
                    cargasTransito: cargasTransitoRow[0].count,
                    incidenciasMes: incidenciasMesRow[0].count,
                    flotaActiva: flotaRow[0].activos,
                    flotaTotal: flotaRow[0].total,
                    deudaTotal: deudaRow[0].total || 0
                },
                graficos: {
                    distribucionCargas: distribucionCargasRows,
                    topIncidencias: topIncidenciasRows,
                    volumenViajes: volumenViajesRows,
                    topRutas: topRutasRows
                },
                listas: {
                    ultimosViajes: ultimosViajesRows,
                    cargasCriticas: cargasCriticasRows,
                    pendientesCobro: pendientesCobroRows
                }
            }
        });

    } catch (error) {
        console.error("Error al obtener resumen del dashboard:", error);
        res.status(500).json({ success: false, message: 'Error interno en el servidor.' });
    }
};
