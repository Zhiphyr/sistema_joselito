const db = require('../config/db');
const { calcularCotizacionCompleta } = require('../services/cotizacionPricingService');

const REGEX_TELEFONO = /^9\d{8}$/;
const REGEX_CORREO = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const MAX_LEN_NOMBRES = 100;

const listarCotizacionesDataTable = async (req, res) => {
    try {
        const { draw, start = 0, length = 15, idBusqueda, fechaDesde, fechaHasta } = req.query;

        let whereClause = '1=1';
        const queryParams = [];
        const countParams = [];

        if (idBusqueda) {
            whereClause += ' AND c.id_cotizacion LIKE ?';
            const searchParam = `%${idBusqueda}%`;
            queryParams.push(searchParam);
            countParams.push(searchParam);
        }

        if (fechaDesde) {
            whereClause += ' AND DATE(c.fecha_registro) >= ?';
            queryParams.push(fechaDesde);
            countParams.push(fechaDesde);
        }

        if (fechaHasta) {
            whereClause += ' AND DATE(c.fecha_registro) <= ?';
            queryParams.push(fechaHasta);
            countParams.push(fechaHasta);
        }

        const numLength = parseInt(length) || 15;
        const numStart = parseInt(start) || 0;

        const [totalResult] = await db.query('SELECT COUNT(*) as total FROM cotizaciones');
        const recordsTotal = totalResult[0].total;

        const countSql = `SELECT COUNT(*) as total FROM cotizaciones c WHERE ${whereClause}`;
        const [countResult] = await db.query(countSql, countParams);
        const recordsFiltered = countResult[0].total;

        const sql = `
            SELECT
                c.id_cotizacion,
                c.nombres,
                c.telefono,
                c.correo,
                c.estado,
                c.fecha_registro,
                r.ciudad_origen,
                r.ciudad_destino
            FROM cotizaciones c
            JOIN rutas r ON r.id_ruta = c.id_ruta
            WHERE ${whereClause}
            ORDER BY c.fecha_registro DESC
            LIMIT ? OFFSET ?
        `;
        queryParams.push(numLength, numStart);
        const [cotizaciones] = await db.query(sql, queryParams);

        return res.status(200).json({
            draw: Number(draw) || 0,
            recordsTotal,
            recordsFiltered,
            data: cotizaciones
        });
    } catch (error) {
        console.error('Error en listarCotizacionesDataTable:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener el listado de cotizaciones' });
    }
};

const obtenerCotizacionDetalle = async (req, res) => {
    try {
        const { id } = req.params;

        const sqlCotizacion = `
            SELECT
                c.id_cotizacion,
                c.nombres,
                c.telefono,
                c.correo,
                c.id_ruta,
                c.flete_estimado_min,
                c.flete_estimado_max,
                c.estado,
                c.origen,
                c.fecha_registro,
                r.ciudad_origen,
                r.ciudad_destino
            FROM cotizaciones c
            JOIN rutas r ON r.id_ruta = c.id_ruta
            WHERE c.id_cotizacion = ?
        `;
        const [cotizacionRows] = await db.query(sqlCotizacion, [id]);

        if (cotizacionRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cotización no encontrada' });
        }

        const sqlDetalles = `
            SELECT
                id_cotizacion_detalle,
                producto,
                id_producto,
                cantidad,
                peso_unitario,
                peso_total,
                es_fragil,
                es_perecible,
                es_mudanza,
                subtotal_calculado
            FROM cotizacion_detalles
            WHERE id_cotizacion = ?
        `;
        const [detalles] = await db.query(sqlDetalles, [id]);

        let carga = null;
        let detalleCarga = [];

        if (cotizacionRows[0].estado === 'Convertido a Carga') {
            const [cargaRows] = await db.query(`
                SELECT
                    ca.id_carga,
                    ca.flete_total,
                    ca.estado_cobro,
                    ca.estado_entrega,
                    ca.id_remitente,
                    ca.id_destinatario,
                    crc.nombre_razon_social AS remitente_nombre,
                    cdc.nombre_razon_social AS destinatario_nombre
                FROM Carga ca
                LEFT JOIN clientes crc ON crc.id_cliente = ca.id_remitente
                LEFT JOIN clientes cdc ON cdc.id_cliente = ca.id_destinatario
                WHERE ca.id_cotizacion_origen = ? AND ca.estado = 1
            `, [id]);

            if (cargaRows.length > 0) {
                carga = cargaRows[0];
                const [detalleCargaRows] = await db.query(`
                    SELECT
                        dc.id_detalle,
                        dc.id_producto,
                        p.nombre AS producto_nombre,
                        dc.marca_visual,
                        dc.cantidad_sacos,
                        dc.peso_unitario,
                        dc.peso_total,
                        dc.precio_peso,
                        dc.flete_subtotal
                    FROM Detalle_Carga dc
                    JOIN productos p ON p.id_producto = dc.id_producto
                    WHERE dc.id_carga = ? AND dc.estado = 1
                `, [carga.id_carga]);
                detalleCarga = detalleCargaRows;
            }
        }

        return res.status(200).json({
            success: true,
            cotizacion: cotizacionRows[0],
            detalles,
            carga,
            detalleCarga
        });
    } catch (error) {
        console.error('Error en obtenerCotizacionDetalle:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener el detalle de la cotización' });
    }
};

const rechazarCotizacion = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            `UPDATE cotizaciones
             SET estado = 'Rechazado/Vencido'
             WHERE id_cotizacion = ? AND estado NOT IN ('Convertido a Carga', 'Rechazado/Vencido')`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(409).json({ success: false, message: 'La cotización ya no está en un estado que permita rechazarla' });
        }

        return res.status(200).json({ success: true, message: 'Cotización rechazada' });
    } catch (error) {
        console.error('Error en rechazarCotizacion:', error);
        return res.status(500).json({ success: false, message: 'Error al rechazar la cotización' });
    }
};

const contactarCotizacion = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            `UPDATE cotizaciones
             SET estado = 'Contactado'
             WHERE id_cotizacion = ? AND estado = 'Pendiente'`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(409).json({ success: false, message: 'La cotización ya no está en estado Pendiente' });
        }

        return res.status(200).json({ success: true, message: 'Cotización marcada como contactada' });
    } catch (error) {
        console.error('Error en contactarCotizacion:', error);
        return res.status(500).json({ success: false, message: 'Error al actualizar la cotización' });
    }
};

const aprobarCotizacion = async (req, res) => {
    const { id } = req.params;
    const { id_remitente, id_destinatario, productos } = req.body;

    if (!id_remitente || !id_destinatario) {
        return res.status(400).json({ success: false, message: 'Debe indicar remitente y destinatario' });
    }

    if (id_remitente === id_destinatario) {
        return res.status(400).json({ success: false, message: 'El remitente y el destinatario no pueden ser el mismo cliente' });
    }

    if (!Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({ success: false, message: 'Debe incluir al menos un producto' });
    }

    const userId = req.headers['x-user-profile'] || 1;
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [cotizacionRows] = await connection.query(
            'SELECT estado FROM cotizaciones WHERE id_cotizacion = ? FOR UPDATE',
            [id]
        );

        if (cotizacionRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Cotización no encontrada' });
        }

        if (cotizacionRows[0].estado === 'Convertido a Carga' || cotizacionRows[0].estado === 'Rechazado/Vencido') {
            await connection.rollback();
            return res.status(409).json({ success: false, message: 'La cotización ya no está en un estado que permita aprobarla' });
        }

        const [detalleRows] = await connection.query(
            'SELECT * FROM cotizacion_detalles WHERE id_cotizacion = ?',
            [id]
        );
        const detalleMap = new Map(detalleRows.map(d => [d.id_cotizacion_detalle, d]));

        let fleteTotal = 0;
        const lineasAInsertar = [];

        for (const prod of productos) {
            const detalleOriginal = detalleMap.get(prod.id_cotizacion_detalle);

            if (!detalleOriginal) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'Uno de los productos no pertenece a esta cotización' });
            }

            if (!prod.id_producto || !prod.precio_peso || Number(prod.precio_peso) <= 0) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'Cada producto debe tener un producto de catálogo y una tarifa mayor a 0' });
            }

            const pesoTotal = Number(detalleOriginal.cantidad) * Number(detalleOriginal.peso_unitario);
            const fleteSubtotal = pesoTotal * Number(prod.precio_peso);
            fleteTotal += fleteSubtotal;

            lineasAInsertar.push({
                id_producto: prod.id_producto,
                marca_visual: prod.marca_visual || '',
                cantidad_sacos: detalleOriginal.cantidad,
                peso_unitario: detalleOriginal.peso_unitario,
                peso_total: pesoTotal,
                precio_peso: prod.precio_peso,
                flete_subtotal: fleteSubtotal
            });
        }

        const sqlCarga = `
            INSERT INTO Carga (id_viaje, id_cotizacion_origen, id_remitente, id_destinatario, flete_total, id_usuario)
            VALUES (NULL, ?, ?, ?, ?, ?)
        `;
        const [resultCarga] = await connection.query(sqlCarga, [id, id_remitente, id_destinatario, fleteTotal, userId]);
        const idCargaInsertada = resultCarga.insertId;

        const sqlDetalle = `
            INSERT INTO Detalle_Carga
            (id_carga, id_producto, marca_visual, cantidad_sacos, peso_unitario, peso_total, precio_peso, flete_subtotal)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        for (const linea of lineasAInsertar) {
            await connection.query(sqlDetalle, [
                idCargaInsertada,
                linea.id_producto,
                linea.marca_visual,
                linea.cantidad_sacos,
                linea.peso_unitario,
                linea.peso_total,
                linea.precio_peso,
                linea.flete_subtotal
            ]);
        }

        await connection.query(
            "UPDATE cotizaciones SET estado = 'Convertido a Carga' WHERE id_cotizacion = ?",
            [id]
        );

        await connection.commit();

        return res.status(201).json({ success: true, message: 'Cotización convertida a carga', id_carga: idCargaInsertada });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error en aprobarCotizacion:', error);
        return res.status(500).json({ success: false, message: 'Error al convertir la cotización en carga' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

const crearCotizacionInterna = async (req, res) => {
    let { nombres, telefono, correo, id_ruta, productos } = req.body;

    nombres = nombres ? nombres.trim().toUpperCase() : '';
    telefono = telefono ? telefono.trim() : '';
    correo = correo ? correo.trim() : '';

    if (!id_ruta || !nombres || !telefono) {
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

    if (!Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({ success: false, message: 'Debe incluir al menos un producto.' });
    }

    for (const p of productos) {
        if (!p.id_producto) {
            return res.status(400).json({ success: false, message: 'Cada producto debe seleccionarse del catálogo.' });
        }
        if (!(Number(p.cantidad) > 0) || !(Number(p.peso_unitario) > 0)) {
            return res.status(400).json({ success: false, message: 'Cantidad y peso unitario deben ser mayores a 0.' });
        }
    }

    try {
        const [rutaRows] = await db.query('SELECT id_ruta FROM rutas WHERE id_ruta = ? AND estado = 1', [id_ruta]);
        if (rutaRows.length === 0) {
            return res.status(400).json({ success: false, message: 'La ruta seleccionada no es válida.' });
        }

        const idsProducto = [...new Set(productos.map(p => Number(p.id_producto)))];
        const [catalogoRows] = await db.query(
            'SELECT id_producto, nombre FROM productos WHERE estado = 1 AND id_producto IN (?)',
            [idsProducto]
        );
        const catalogoMap = new Map(catalogoRows.map(r => [r.id_producto, r.nombre]));
        for (const p of productos) {
            if (!catalogoMap.has(Number(p.id_producto))) {
                return res.status(400).json({ success: false, message: 'Uno de los productos seleccionados no existe o está inactivo.' });
            }
        }

        const productosParaCalculo = productos.map(p => ({
            nombre: catalogoMap.get(Number(p.id_producto)),
            id_producto: Number(p.id_producto),
            peso_unitario: Number(p.peso_unitario),
            cantidad: Number(p.cantidad),
            fragil: !!p.fragil,
            perecible: !!p.perecible,
            mudanza: !!p.mudanza
        }));

        const { detalles, fleteMin, fleteMax } = await calcularCotizacionCompleta(id_ruta, productosParaCalculo);
        const idUsuario = req.headers['x-user-profile'] || 1;

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [cotResult] = await connection.query(`
                INSERT INTO cotizaciones
                  (nombres, telefono, correo, id_ruta, flete_estimado_min, flete_estimado_max,
                   origen, id_usuario, estado)
                VALUES (?, ?, ?, ?, ?, ?, 'Interna', ?, 'Pendiente')
            `, [nombres, telefono, correo || null, id_ruta, fleteMin, fleteMax, idUsuario]);

            const idCotizacion = cotResult.insertId;

            for (const det of detalles) {
                await connection.query(`
                    INSERT INTO cotizacion_detalles
                      (id_cotizacion, producto, id_producto, cantidad, peso_unitario, peso_total, es_fragil, es_perecible, es_mudanza, subtotal_calculado)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [idCotizacion, det.nombre, det.id_producto, det.cantidad, det.peso_unitario, det.peso_total, det.fragil, det.perecible, det.mudanza, det.subtotalCalculado]);
            }

            await connection.commit();
            return res.status(201).json({ success: true, message: 'Cotización registrada exitosamente', id_cotizacion: idCotizacion });
        } catch (dbErr) {
            await connection.rollback();
            throw dbErr;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error en crearCotizacionInterna:', error);
        return res.status(500).json({ success: false, message: 'Error al registrar la cotización' });
    }
};

module.exports = {
    listarCotizacionesDataTable,
    obtenerCotizacionDetalle,
    rechazarCotizacion,
    contactarCotizacion,
    aprobarCotizacion,
    crearCotizacionInterna
};
