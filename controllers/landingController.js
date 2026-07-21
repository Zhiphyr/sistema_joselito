const pool = require('../config/db');
const { calcularCotizacionCompleta } = require('../services/cotizacionPricingService');

const REGEX_TELEFONO = /^9\d{8}$/;
const REGEX_CORREO = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const MAX_LEN_NOMBRES = 100;
const MAX_LEN_PRODUCTO = 150;

exports.getRutas = async (req, res) => {
    try {
        const [rutas] = await pool.query(`SELECT id_ruta, ciudad_origen, ciudad_destino FROM rutas WHERE estado = 1 ORDER BY ciudad_origen ASC`);
        res.json({ success: true, rutas });
    } catch (error) {
        console.error("Error al obtener rutas para landing:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.getProductosCatalogo = async (req, res) => {
    try {
        const [productos] = await pool.query(
            `SELECT id_producto, nombre FROM productos WHERE estado = 1 ORDER BY nombre ASC`
        );
        res.json({ success: true, productos });
    } catch (error) {
        console.error("Error al obtener catálogo de productos para landing:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.calcularCotizacion = async (req, res) => {
    try {
        let { id_ruta, productos, nombres, telefono, correo, sitio_web } = req.body;

        // Honeypot: campo oculto que solo un bot rellenaría. Se responde éxito simulado
        // sin tocar la base de datos, para no delatar el mecanismo al bot.
        if (sitio_web) {
            return res.json({ success: true, min: 0, max: 0, id_cotizacion: null });
        }

        nombres = nombres ? nombres.trim().toUpperCase() : '';
        telefono = telefono ? telefono.trim() : '';
        correo = correo ? correo.trim() : '';

        if (!id_ruta || !productos || productos.length === 0 || !nombres || !telefono) {
            return res.status(400).json({ success: false, message: 'Faltan datos requeridos.' });
        }

        if (nombres.length > MAX_LEN_NOMBRES) {
            return res.status(400).json({ success: false, message: 'El nombre ingresado es demasiado largo.' });
        }

        if (!REGEX_TELEFONO.test(telefono)) {
            return res.status(400).json({ success: false, message: 'El número de teléfono no es válido.' });
        }

        if (correo && !REGEX_CORREO.test(correo)) {
            return res.status(400).json({ success: false, message: 'El correo electrónico no es válido.' });
        }

        for (const prod of productos) {
            const nombreProd = prod && prod.nombre ? String(prod.nombre).trim() : '';
            if (!nombreProd || nombreProd.length > MAX_LEN_PRODUCTO) {
                return res.status(400).json({ success: false, message: 'Uno de los productos tiene un nombre inválido.' });
            }
            if (!(Number(prod.cantidad) > 0) || !(Number(prod.peso_unitario) > 0)) {
                return res.status(400).json({ success: false, message: 'Cantidad y peso unitario deben ser mayores a 0.' });
            }
        }

        // Validar los id_producto opcionales que haya resuelto el autocompletado contra el catálogo real
        const idsProductoEnviados = [...new Set(
            productos.map(p => Number(p.id_producto)).filter(id => Number.isInteger(id) && id > 0)
        )];
        let idsProductoValidos = new Set();
        if (idsProductoEnviados.length > 0) {
            const [catalogoRows] = await pool.query(
                `SELECT id_producto FROM productos WHERE estado = 1 AND id_producto IN (?)`,
                [idsProductoEnviados]
            );
            idsProductoValidos = new Set(catalogoRows.map(r => r.id_producto));
        }

        // 1-3. Calcular precio estimado (promedio histórico + modificadores + rango ±5%),
        // usando el servicio compartido con el flujo de creación interna de cotizaciones.
        const productosParaCalculo = productos.map(prod => {
            const idProductoNum = Number(prod.id_producto);
            return {
                nombre: prod.nombre ? prod.nombre.trim().toUpperCase() : '',
                id_producto: idsProductoValidos.has(idProductoNum) ? idProductoNum : null,
                peso_unitario: prod.peso_unitario,
                cantidad: prod.cantidad,
                fragil: prod.fragil,
                perecible: prod.perecible,
                mudanza: prod.mudanza
            };
        });

        const { detalles, fleteMin, fleteMax } = await calcularCotizacionCompleta(id_ruta, productosParaCalculo);

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
                    INSERT INTO cotizacion_detalles (id_cotizacion, producto, id_producto, cantidad, peso_unitario, peso_total, es_fragil, es_perecible, es_mudanza, subtotal_calculado)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [idCotizacion, det.nombre, det.id_producto, det.cantidad, det.peso_unitario, det.peso_total, det.fragil, det.perecible, det.mudanza, det.subtotalCalculado]);
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
