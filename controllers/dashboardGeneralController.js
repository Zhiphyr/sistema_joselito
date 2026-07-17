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
            pool.query(`SELECT COUNT(*) AS count FROM Viaje WHERE estado_operativo = 'Finalizado' AND estado_pagos = 'Pendiente' AND estado != 2`),
            pool.query(`SELECT COUNT(*) AS count FROM Carga WHERE estado_entrega IN ('En ruta', 'En Almacen de Origen', 'En Almacen de Destino') AND estado != 2`),
            pool.query(`SELECT COUNT(*) AS count FROM Incidencia_Viaje WHERE MONTH(fecha_creacion) = MONTH(CURRENT_DATE()) AND YEAR(fecha_creacion) = YEAR(CURRENT_DATE()) AND estado != 2`),
            pool.query(`SELECT (SELECT COUNT(*) FROM camiones c WHERE c.estado = 1 AND NOT EXISTS (SELECT 1 FROM Viaje v WHERE v.id_camion = c.id_camion AND v.estado_operativo IN ('En Ruta', 'Llegó a Destino', 'Descargado', 'Incidencia') AND v.estado != 2)) AS activos, (SELECT COUNT(*) FROM camiones WHERE estado = 1) AS total`),
            pool.query(`SELECT SUM(${saldoPendienteExpr}) AS total ${deudaFilterJoin}`),
            pool.query(`SELECT estado_entrega AS estado, COUNT(*) AS total FROM Carga WHERE estado != 2 AND MONTH(fecha_registro) = MONTH(CURRENT_DATE()) AND YEAR(fecha_registro) = YEAR(CURRENT_DATE()) GROUP BY estado_entrega`),
            pool.query(`SELECT tipo_incidencia, COUNT(*) AS total FROM Incidencia_Viaje WHERE estado != 2 AND MONTH(fecha_creacion) = MONTH(CURRENT_DATE()) AND YEAR(fecha_creacion) = YEAR(CURRENT_DATE()) GROUP BY tipo_incidencia ORDER BY total DESC LIMIT 5`),
            pool.query(`SELECT DATE(fecha_salida) AS fecha, COUNT(*) AS total FROM Viaje WHERE MONTH(fecha_salida) = MONTH(CURRENT_DATE()) AND YEAR(fecha_salida) = YEAR(CURRENT_DATE()) AND estado != 2 GROUP BY DATE(fecha_salida) ORDER BY fecha ASC`),
            pool.query(`SELECT r.ciudad_origen AS origen, r.ciudad_destino AS destino, COUNT(v.id_viaje) AS cantidad FROM Viaje v JOIN rutas r ON v.id_ruta = r.id_ruta WHERE v.estado != 2 AND MONTH(v.fecha_salida) = MONTH(CURRENT_DATE()) AND YEAR(v.fecha_salida) = YEAR(CURRENT_DATE()) GROUP BY v.id_ruta ORDER BY cantidad DESC LIMIT 5`),
            pool.query(`SELECT v.id_viaje AS correlativo, v.estado_operativo, v.fecha_salida, c.placa, r.ciudad_origen AS origen, r.ciudad_destino AS destino FROM Viaje v LEFT JOIN camiones c ON v.id_camion = c.id_camion LEFT JOIN rutas r ON v.id_ruta = r.id_ruta WHERE v.estado_operativo NOT IN ('Finalizado', 'Incidencia') AND v.estado != 2 ORDER BY v.fecha_salida DESC LIMIT 5`),
            pool.query(`
                SELECT 
                    dc.id_detalle,
                    dc.estado_operativo,
                    p.nombre AS nombre_producto,
                    c.id_carga AS numero_guia, 
                    v.id_viaje AS correlativo,
                    cl.nombre_razon_social AS razon_social
                FROM detalle_carga dc
                JOIN Carga c ON dc.id_carga = c.id_carga
                JOIN Viaje v ON c.id_viaje = v.id_viaje
                JOIN productos p ON dc.id_producto = p.id_producto
                LEFT JOIN clientes cl ON c.id_destinatario = cl.id_cliente
                WHERE dc.estado_operativo IN ('Rechazado', 'Siniestrado') 
                  AND dc.incidencia_justificada = 1 
                  AND dc.estado = 1
                ORDER BY dc.id_detalle DESC 
                LIMIT 5
            `),
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
                    transportistasDisponibles: flotaRow[0].activos,
                    transportistasTotal: flotaRow[0].total,
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

exports.getDistribucionCargas = async (req, res) => {
    try {
        const mes = req.query.mes || new Date().getMonth() + 1;
        const anio = req.query.anio || new Date().getFullYear();
        
        const [distribucionCargasRows] = await pool.query(
            `SELECT estado_entrega AS estado, COUNT(*) AS total FROM Carga WHERE estado != 2 AND MONTH(fecha_registro) = ? AND YEAR(fecha_registro) = ? GROUP BY estado_entrega`,
            [mes, anio]
        );
        
        res.json({ success: true, data: distribucionCargasRows });
    } catch (error) {
        console.error("Error al obtener distribución de cargas:", error);
        res.status(500).json({ success: false, message: 'Error interno en el servidor.' });
    }
};

exports.getVolumenViajes = async (req, res) => {
    try {
        const mes = req.query.mes || new Date().getMonth() + 1;
        const anio = req.query.anio || new Date().getFullYear();
        
        const [volumenViajesRows] = await pool.query(
            `SELECT DATE(fecha_salida) AS fecha, COUNT(*) AS total FROM Viaje WHERE estado != 2 AND MONTH(fecha_salida) = ? AND YEAR(fecha_salida) = ? GROUP BY DATE(fecha_salida) ORDER BY fecha ASC`,
            [mes, anio]
        );
        
        res.json({ success: true, data: volumenViajesRows });
    } catch (error) {
        console.error("Error al obtener volumen de viajes:", error);
        res.status(500).json({ success: false, message: 'Error interno en el servidor.' });
    }
};

exports.getTopIncidencias = async (req, res) => {
    try {
        const mes = req.query.mes || new Date().getMonth() + 1;
        const anio = req.query.anio || new Date().getFullYear();
        const [rows] = await pool.query(
            `SELECT tipo_incidencia, COUNT(*) AS total FROM Incidencia_Viaje WHERE estado != 2 AND MONTH(fecha_creacion) = ? AND YEAR(fecha_creacion) = ? GROUP BY tipo_incidencia ORDER BY total DESC LIMIT 5`,
            [mes, anio]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error interno en el servidor.' });
    }
};

exports.getTopRutas = async (req, res) => {
    try {
        const mes = req.query.mes || new Date().getMonth() + 1;
        const anio = req.query.anio || new Date().getFullYear();
        const [rows] = await pool.query(
            `SELECT r.ciudad_origen AS origen, r.ciudad_destino AS destino, COUNT(v.id_viaje) AS cantidad FROM Viaje v JOIN rutas r ON v.id_ruta = r.id_ruta WHERE v.estado != 2 AND MONTH(v.fecha_salida) = ? AND YEAR(v.fecha_salida) = ? GROUP BY v.id_ruta ORDER BY cantidad DESC LIMIT 5`,
            [mes, anio]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error interno en el servidor.' });
    }
};
