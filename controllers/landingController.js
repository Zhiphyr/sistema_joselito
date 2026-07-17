const pool = require('../config/db');

exports.getRutas = async (req, res) => {
    try {
        const [rutas] = await pool.query(`SELECT id_ruta, ciudad_origen, ciudad_destino FROM rutas WHERE estado = 1 ORDER BY ciudad_origen ASC`);
        res.json({ success: true, rutas });
    } catch (error) {
        console.error("Error al obtener rutas para landing:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.calcularCotizacion = async (req, res) => {
    try {
        let { id_ruta, productos, nombres, telefono, correo } = req.body;
        
        nombres = nombres ? nombres.trim().toUpperCase() : '';
        correo = correo ? correo.trim() : '';

        if (!id_ruta || !productos || productos.length === 0 || !nombres || !telefono) {
            return res.status(400).json({ success: false, message: 'Faltan datos requeridos.' });
        }

        // 1. Obtener precio promedio de flete por KG en esta ruta en los últimos 2 meses
        const [historial] = await pool.query(`
            SELECT AVG(dc.precio_peso) as avg_unit_price 
            FROM detalle_carga dc 
            JOIN carga c ON dc.id_carga = c.id_carga 
            JOIN viaje v ON c.id_viaje = v.id_viaje 
            WHERE v.id_ruta = ? 
              AND dc.fecha_registro >= DATE_SUB(NOW(), INTERVAL 2 MONTH)
              AND dc.estado = 1
        `, [id_ruta]);

        let precioBaseUnitario = historial[0].avg_unit_price;
        if (!precioBaseUnitario || precioBaseUnitario <= 0) {
            precioBaseUnitario = 0.20; // Precio por defecto por Kg si no hay historial reciente para esa ruta
        }

        let totalCalculado = 0;
        const detalles = [];

        // 2. Calcular modificadores por cada producto
        for (const prod of productos) {
            let { nombre, peso_unitario, cantidad, fragil, perecible, mudanza } = prod;
            nombre = nombre ? nombre.trim().toUpperCase() : '';
            const peso_total = (peso_unitario || 1) * cantidad;
            let subtotalBase = peso_total * precioBaseUnitario;

            let modificador = 1.0;
            if (fragil) modificador += 0.15;
            if (perecible) modificador += 0.20;
            if (mudanza) modificador += 0.50;

            const subtotalCalculado = subtotalBase * modificador;
            totalCalculado += subtotalCalculado;

            detalles.push({
                nombre,
                peso_unitario,
                peso_total,
                cantidad,
                fragil: fragil ? 1 : 0,
                perecible: perecible ? 1 : 0,
                mudanza: mudanza ? 1 : 0,
                subtotalCalculado
            });
        }

        // 3. Establecer rangos (+- 5%)
        const fleteMin = totalCalculado * 0.95;
        const fleteMax = totalCalculado * 1.05;

        // 4. Guardar en Base de Datos
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [cotResult] = await connection.query(`
                INSERT INTO cotizaciones (nombres, telefono, correo, id_ruta, flete_estimado_min, flete_estimado_max)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [nombres, telefono, correo || null, id_ruta, fleteMin, fleteMax]);

            const idCotizacion = cotResult.insertId;

            for (const det of detalles) {
                await connection.query(`
                    INSERT INTO cotizacion_detalles (id_cotizacion, producto, cantidad, peso_unitario, peso_total, es_fragil, es_perecible, es_mudanza, subtotal_calculado)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [idCotizacion, det.nombre, det.cantidad, det.peso_unitario, det.peso_total, det.fragil, det.perecible, det.mudanza, det.subtotalCalculado]);
            }

            await connection.commit();
            connection.release();

            res.json({
                success: true,
                min: fleteMin,
                max: fleteMax,
                id_cotizacion: idCotizacion
            });

        } catch (dbErr) {
            await connection.rollback();
            connection.release();
            throw dbErr;
        }

    } catch (error) {
        console.error("Error al calcular cotización:", error);
        res.status(500).json({ success: false, message: 'Error al procesar la cotización' });
    }
};
