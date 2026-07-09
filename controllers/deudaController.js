const db = require('../config/db');
const { cloudinary } = require('../config/cloudinary');
const bcrypt = require('bcryptjs');

const obtenerDeudas = async (req, res) => {
    try {
        const { search, filtroEstado } = req.query;

        let query = `
            SELECT 
                c.id_carga,
                c.id_viaje,
                v.fecha_llegada,
                IFNULL((SELECT SUM(flete_subtotal) FROM Detalle_Carga dc WHERE dc.id_carga = c.id_carga AND dc.estado_operativo IN ('Normal', 'Entregado') AND dc.estado = 1), 0) AS flete_total,
                c.estado_cobro,
                c.estado_entrega,
                cli.nombre_razon_social AS cliente_nombre,
                rem.nombre_razon_social AS remitente_nombre,
                cli.telefono AS destinatario_telefono,
                (IFNULL((SELECT SUM(flete_subtotal) FROM Detalle_Carga dc WHERE dc.id_carga = c.id_carga AND dc.estado_operativo IN ('Normal', 'Entregado') AND dc.estado = 1), 0) - IFNULL((
                    SELECT SUM(monto_pagado) 
                    FROM pago_carga pc 
                    WHERE pc.id_carga = c.id_carga AND pc.estado = 1
                ), 0)) AS saldo_pendiente
            FROM Carga c
            JOIN Viaje v ON c.id_viaje = v.id_viaje
            JOIN Clientes cli ON c.id_destinatario = cli.id_cliente
            JOIN Clientes rem ON c.id_remitente = rem.id_cliente
            WHERE c.estado = 1
            AND v.estado_operativo IN ('Llegó a Destino', 'Finalizado')
            AND c.estado_entrega IN ('Entregado', 'Entregado Parcialmente')
        `;
        
        let queryParams = [];

        if (filtroEstado === 'activas') {
            query += ` AND c.estado_cobro IN ('Pendiente', 'Parcial')`;
        } else if (filtroEstado === 'completadas') {
            query += ` AND c.estado_cobro = 'Completado'`;
        } else if (filtroEstado === 'todos') {
            query += ` AND c.estado_cobro IN ('Pendiente', 'Parcial', 'Completado')`;
        } else {
            // Default to activas
            query += ` AND c.estado_cobro IN ('Pendiente', 'Parcial')`;
        }

        if (search) {
            query += ` AND (c.id_carga LIKE ? OR cli.nombre_razon_social LIKE ? OR rem.nombre_razon_social LIKE ?)`;
            const searchParam = `%${search}%`;
            queryParams.push(searchParam, searchParam, searchParam);
        }

        query += ` ORDER BY c.id_carga DESC`;

        const [rows] = await db.query(query, queryParams);

        return res.status(200).json({ success: true, data: rows });

    } catch (error) {
        console.error('Error en obtenerDeudas:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener deudas por cobrar' });
    }
};

const obtenerCuentasBancarias = async (req, res) => {
    try {
        const query = `
            SELECT c.id_cuenta, e.nombre as entidad_financiera, c.tipo_cuenta, c.nro_cuenta, c.titular
            FROM cuenta_bancaria c
            JOIN entidad_financiera e ON c.id_entidad = e.id_entidad
            WHERE c.estado = 1 AND c.es_sistema = 0
        `;
        const [cuentas] = await db.query(query);
        res.json({ success: true, data: cuentas });
    } catch (error) {
        console.error("Error en obtenerCuentasBancarias:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al obtener las cuentas bancarias' });
    }
};

const registrarCobro = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const {
            id_carga,
            monto_pagado,
            canal_pago, // Efectivo, Transferencia, Deposito, Billetera Digital
            id_cuenta,
            nro_operacion,
            fecha_pago,
            observacion
        } = req.body;

        const id_usuario = req.headers['x-user-profile'] || 1; // ID de quien cobra
        const ruta_comprobante = req.file ? req.file.path : null;

        const idCuentaParseado = canal_pago === 'Efectivo' ? null : (id_cuenta || null);
        const montoNum = Number(monto_pagado);

        // Insertar en pago_carga
        const insertQuery = `
            INSERT INTO pago_carga 
            (id_carga, id_cuenta, monto_pagado, tipo_pago, nro_operacion, ruta_comprobante, observacion, id_usuario, fecha_pago)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        await connection.query(insertQuery, [
            id_carga,
            idCuentaParseado,
            montoNum,
            canal_pago,
            nro_operacion || null,
            ruta_comprobante,
            observacion || null,
            id_usuario,
            fecha_pago || new Date()
        ]);

        // Recalcular saldo pendiente
        const saldoQuery = `
            SELECT 
                IFNULL((SELECT SUM(flete_subtotal) FROM Detalle_Carga dc WHERE dc.id_carga = c.id_carga AND dc.estado_operativo IN ('Normal', 'Entregado') AND dc.estado = 1), 0) as flete_total,
                IFNULL((SELECT SUM(monto_pagado) FROM pago_carga WHERE id_carga = c.id_carga AND estado = 1), 0) as total_pagado
            FROM Carga c
            WHERE c.id_carga = ?
        `;
        
        const [rows] = await connection.query(saldoQuery, [id_carga]);
        if (rows.length > 0) {
            const { flete_total, total_pagado } = rows[0];
            const saldo_pendiente = flete_total - total_pagado;
            
            let nuevoEstado = 'Parcial';
            if (saldo_pendiente <= 0) {
                nuevoEstado = 'Completado';
            }

            // Actualizar estado_cobro en carga
            await connection.query(`UPDATE Carga SET estado_cobro = ? WHERE id_carga = ?`, [nuevoEstado, id_carga]);
        }

        await connection.commit();
        res.json({ success: true, message: 'Cobro registrado exitosamente' });

    } catch (error) {
        await connection.rollback();
        console.error("Error en registrarCobro:", error);
        
        // --- PREVENCIÓN DE ARCHIVOS HUÉRFANOS ---
        // Si falló la BD pero la imagen sí se subió a Cloudinary, la eliminamos.
        if (req.file && req.file.filename) {
            try {
                // req.file.filename contiene el public_id completo asignado por multer-storage-cloudinary
                await cloudinary.uploader.destroy(req.file.filename);
                console.log(`[Reversión Exitosa] Archivo huérfano eliminado de Cloudinary: ${req.file.filename}`);
            } catch (cloudErr) {
                console.error("No se pudo eliminar el archivo huérfano de Cloudinary:", cloudErr);
            }
        }
        
        res.status(500).json({ success: false, message: 'Error interno al registrar el cobro' });
    } finally {
        connection.release();
    }
};

const obtenerHistorialPagos = async (req, res) => {
    try {
        const { id_carga } = req.params;
        
        const query = `
            SELECT 
                p.id_pago,
                p.monto_pagado,
                p.fecha_pago,
                p.tipo_pago,
                p.nro_operacion,
                p.ruta_comprobante,
                p.observacion,
                p.estado,
                e.nombre AS entidad_financiera,
                c.tipo_cuenta,
                c.nro_cuenta,
                c.titular
            FROM pago_carga p
            LEFT JOIN cuenta_bancaria c ON p.id_cuenta = c.id_cuenta
            LEFT JOIN entidad_financiera e ON c.id_entidad = e.id_entidad
            WHERE p.id_carga = ? AND p.estado IN (0, 1)
            ORDER BY p.fecha_pago DESC
        `;
        
        const [rows] = await db.query(query, [id_carga]);
        
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Error en obtenerHistorialPagos:", error);
        res.status(500).json({ success: false, message: 'Error interno al obtener el historial' });
    }
};

const anularPago = async (req, res) => {
    let connection;
    try {
        const { id_pago, pin } = req.body;

        if (!id_pago || !pin) {
            return res.status(400).json({ success: false, message: 'Faltan datos obligatorios' });
        }

        // 1. Obtener PIN de la base de datos
        const [configRows] = await db.query('SELECT valor FROM configuracion_sistema WHERE parametro = ?', ['PIN_ANULACION_PAGOS']);
        if (configRows.length === 0) {
            return res.status(500).json({ success: false, message: 'No se ha configurado el PIN de seguridad' });
        }

        const hashedPin = configRows[0].valor;

        // 2. Comparar PIN
        const isValid = await bcrypt.compare(pin.toString(), hashedPin);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'PIN incorrecto' });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // 3. Obtener el pago
        const [pagoRows] = await connection.query('SELECT monto_pagado, id_carga, estado FROM pago_carga WHERE id_pago = ? FOR UPDATE', [id_pago]);
        if (pagoRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Pago no encontrado' });
        }

        const pago = pagoRows[0];
        if (pago.estado === 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'El pago ya se encuentra anulado' });
        }

        // 4. Marcar pago como anulado
        await connection.query('UPDATE pago_carga SET estado = 0 WHERE id_pago = ?', [id_pago]);

        // 5. Recalcular saldo pendiente
        const saldoQuery = `
            SELECT 
                IFNULL((SELECT SUM(flete_subtotal) FROM Detalle_Carga dc WHERE dc.id_carga = c.id_carga AND dc.estado_operativo IN ('Normal', 'Entregado') AND dc.estado = 1), 0) as flete_total,
                IFNULL((SELECT SUM(monto_pagado) FROM pago_carga WHERE id_carga = c.id_carga AND estado = 1), 0) as total_pagado
            FROM Carga c
            WHERE c.id_carga = ? FOR UPDATE
        `;

        const [cargaRows] = await connection.query(saldoQuery, [pago.id_carga]);
        if (cargaRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Carga no encontrada' });
        }

        const { flete_total, total_pagado } = cargaRows[0];
        const nuevoSaldo = Number(flete_total) - Number(total_pagado);
        
        let nuevoEstado = 'Pendiente';
        if (nuevoSaldo === Number(flete_total)) {
            nuevoEstado = 'Pendiente';
        } else if (nuevoSaldo > 0 && nuevoSaldo < Number(flete_total)) {
            nuevoEstado = 'Parcial';
        } else if (nuevoSaldo <= 0) {
            nuevoEstado = 'Completado';
        }

        // 6. Actualizar Carga (solo estado_cobro, saldo_pendiente se calcula en vuelo siempre)
        await connection.query('UPDATE Carga SET estado_cobro = ? WHERE id_carga = ?', [nuevoEstado, pago.id_carga]);

        await connection.commit();
        res.json({ success: true, message: 'Pago anulado correctamente', nuevo_saldo: nuevoSaldo, nuevo_estado: nuevoEstado });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error en anularPago:", error);
        res.status(500).json({ success: false, message: 'Error interno al anular el pago' });
    } finally {
        if (connection) connection.release();
    }
};

const obtenerResumenDiario = async (req, res) => {
    try {
        const query = `
            SELECT 
                IFNULL(SUM(monto_pagado), 0) AS total_recaudado,
                IFNULL(SUM(CASE WHEN tipo_pago = 'Efectivo' THEN monto_pagado ELSE 0 END), 0) AS total_efectivo,
                IFNULL(SUM(CASE WHEN tipo_pago = 'Billetera Digital' THEN monto_pagado ELSE 0 END), 0) AS total_billetera,
                IFNULL(SUM(CASE WHEN tipo_pago IN ('Transferencia', 'Deposito') THEN monto_pagado ELSE 0 END), 0) AS total_bancos
            FROM pago_carga
            WHERE DATE(fecha_pago) = CURDATE() AND estado = 1
        `;
        const [rows] = await db.query(query);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error("Error en obtenerResumenDiario:", error);
        res.status(500).json({ success: false, message: 'Error al obtener resumen diario' });
    }
};

const obtenerDetallesCarga = async (req, res) => {
    try {
        const { id_carga } = req.params;
        const query = `
            SELECT 
                d.id_detalle,
                d.id_carga,
                d.marca_visual,
                d.cantidad_sacos AS cantidad,
                d.peso_unitario,
                d.peso_total,
                d.precio_peso AS tarifa,
                d.flete_subtotal,
                d.estado_operativo,
                p.nombre AS producto_nombre
            FROM Detalle_Carga d
            JOIN Productos p ON d.id_producto = p.id_producto
            WHERE d.id_carga = ? AND d.estado = 1
        `;
        const [rows] = await db.query(query, [id_carga]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Error en obtenerDetallesCarga:", error);
        res.status(500).json({ success: false, message: 'Error al obtener los detalles de la carga' });
    }
};

module.exports = {
    obtenerDeudas,
    obtenerCuentasBancarias,
    registrarCobro,
    obtenerHistorialPagos,
    anularPago,
    obtenerResumenDiario,
    obtenerDetallesCarga
};
