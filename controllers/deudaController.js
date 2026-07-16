const db = require('../config/db');
const { cloudinary } = require('../config/cloudinary');
const { verificarPinAnulacion, validarMotivoAnulacion } = require('../utils/verificarPinAnulacion');

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
        const queryCuentas = `
            SELECT c.id_cuenta, e.nombre as entidad_financiera, c.tipo_cuenta, c.nro_cuenta, c.titular
            FROM cuenta_bancaria c
            JOIN entidad_financiera e ON c.id_entidad = e.id_entidad
            WHERE c.estado = 1 AND c.es_sistema = 0
        `;
        const queryBilleteras = `
            SELECT b.id_billetera, p.nombre as entidad_financiera, b.numero_celular, b.titular, b.ruta_qr
            FROM billetera_digital b
            JOIN proveedor_billetera p ON b.id_proveedor = p.id_proveedor
            WHERE b.estado = 1
        `;
        const [cuentas] = await db.query(queryCuentas);
        const [billeteras] = await db.query(queryBilleteras);
        res.json({ success: true, data: { cuentas, billeteras } });
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
            observacion,
            pagos: pagosJSON
        } = req.body;

        const pagos = JSON.parse(pagosJSON);
        const id_usuario = req.headers['x-user-profile'] || 1; // ID de quien cobra

        // Obtener cuenta de sistema (Caja Física Principal)
        const [cajaFisicaRows] = await connection.query('SELECT id_cuenta FROM cuenta_bancaria WHERE es_sistema = 1 AND tipo_cuenta = "Efectivo" LIMIT 1');
        const idCajaFisica = cajaFisicaRows.length > 0 ? cajaFisicaRows[0].id_cuenta : null;

        const insertPagoQuery = `
            INSERT INTO pago_carga 
            (id_carga, id_cuenta, id_billetera, monto_pagado, tipo_pago, nro_operacion, ruta_comprobante, observacion, id_usuario, fecha_pago)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const insertMovimientoQuery = `
            INSERT INTO movimiento_caja 
            (tipo_movimiento, concepto, monto, metodo_pago, id_cuenta_origen, id_billetera_origen, id_cuenta_destino, id_billetera_destino, modulo_origen, id_registro_origen, numero_operacion, id_usuario)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        for (const pago of pagos) {
            let ruta_comprobante = null;

            // Vincular evidencia si existe para este pago
            if (pago.index_evidencia !== null && req.files) {
                const fieldName = `evidencia_${pago.index_evidencia}`;
                const fileInfo = req.files.find(f => f.fieldname === fieldName);
                if (fileInfo) {
                    ruta_comprobante = fileInfo.path;
                }
            }

            const montoNum = Number(pago.monto_pagado);

            // Determinar la cuenta de destino (si es efectivo, usamos la caja física)
            let id_cuenta_destino = pago.id_cuenta || null;
            if (pago.tipo_pago === 'Efectivo') {
                id_cuenta_destino = idCajaFisica;
            } else if (pago.tipo_pago === 'Billetera Digital' && pago.id_billetera) {
                // Consultar si la billetera tiene una cuenta vinculada
                const [billRows] = await connection.query('SELECT id_cuenta_vinculada FROM billetera_digital WHERE id_billetera = ?', [pago.id_billetera]);
                if (billRows.length > 0 && billRows[0].id_cuenta_vinculada) {
                    id_cuenta_destino = billRows[0].id_cuenta_vinculada;
                }
            }

            // 1. Insertar en pago_carga
            const [pagoResult] = await connection.query(insertPagoQuery, [
                id_carga,
                id_cuenta_destino, // Se asigna la cuenta (incluyendo Caja Física para efectivo)
                pago.id_billetera || null,
                montoNum,
                pago.tipo_pago,
                pago.nro_operacion || null,
                ruta_comprobante,
                observacion || null,
                id_usuario,
                pago.fecha_pago || new Date()
            ]);

            const idPagoInsertado = pagoResult.insertId;

            // 2. Insertar en movimiento_caja
            await connection.query(insertMovimientoQuery, [
                'INGRESO',
                `Cobro de Carga #${id_carga}`,
                montoNum,
                pago.tipo_pago,
                null, // id_cuenta_origen
                null, // id_billetera_origen
                id_cuenta_destino, // id_cuenta_destino
                pago.id_billetera || null, // id_billetera_destino
                'COBRO_FLETE', // Valor ENUM correcto en vez de COBRO_CARGA
                idPagoInsertado,
                pago.nro_operacion || null,
                id_usuario // Requerido por la tabla
            ]);
        }

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
            // Validamos con un margen pequeño para evitar problemas de precisión flotante
            if (saldo_pendiente <= 0.01) {
                nuevoEstado = 'Completado';
            }

            // Actualizar estado_cobro en carga
            await connection.query(`UPDATE Carga SET estado_cobro = ? WHERE id_carga = ?`, [nuevoEstado, id_carga]);
        }

        await connection.commit();
        res.json({ success: true, message: 'Cobros registrados exitosamente' });

    } catch (error) {
        await connection.rollback();
        console.error("Error en registrarCobro:", error);
        
        // --- PREVENCIÓN DE ARCHIVOS HUÉRFANOS ---
        // Si falló la BD pero las imágenes se subieron, las eliminamos.
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                if (file.filename) {
                    try {
                        await cloudinary.uploader.destroy(file.filename);
                        console.log(`[Reversión Exitosa] Archivo huérfano eliminado de Cloudinary: ${file.filename}`);
                    } catch (cloudErr) {
                        console.error("No se pudo eliminar el archivo huérfano de Cloudinary:", cloudErr);
                    }
                }
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
                COALESCE(e.nombre, pb.nombre) AS entidad_financiera,
                c.tipo_cuenta,
                COALESCE(c.nro_cuenta, b.numero_celular) AS nro_cuenta,
                COALESCE(c.titular, b.titular) AS titular
            FROM pago_carga p
            LEFT JOIN cuenta_bancaria c ON p.id_cuenta = c.id_cuenta
            LEFT JOIN entidad_financiera e ON c.id_entidad = e.id_entidad
            LEFT JOIN billetera_digital b ON p.id_billetera = b.id_billetera
            LEFT JOIN proveedor_billetera pb ON b.id_proveedor = pb.id_proveedor
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
        const { id_pago, pin, motivo } = req.body;
        const id_usuario = req.headers['x-user-id'];

        if (!id_pago || !pin) {
            return res.status(400).json({ success: false, message: 'Faltan datos obligatorios' });
        }
        if (!id_usuario) {
            return res.status(401).json({ success: false, message: 'No autorizado: falta información del usuario.' });
        }
        if (!validarMotivoAnulacion(motivo)) {
            return res.status(400).json({ success: false, message: 'El motivo de anulación debe tener entre 10 y 300 caracteres y no contener símbolos no permitidos.' });
        }

        const pinValido = await verificarPinAnulacion(pin);
        if (!pinValido) {
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

        // 4.1. Anular el movimiento de caja asociado
        await connection.query("UPDATE movimiento_caja SET estado = 0 WHERE modulo_origen = 'COBRO_FLETE' AND id_registro_origen = ?", [id_pago]);

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

        // 7. Registrar auditoría: quién anuló, cuándo y por qué
        await connection.query(`
            INSERT INTO auditoria_anulacion (modulo, id_registro, motivo, id_usuario)
            VALUES ('COBRO_FLETE', ?, ?, ?)
        `, [id_pago, motivo.trim(), id_usuario]);

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
                IFNULL(SUM(monto), 0) AS total_recaudado,
                IFNULL(SUM(CASE WHEN metodo_pago = 'Efectivo' THEN monto ELSE 0 END), 0) AS total_efectivo,
                IFNULL(SUM(CASE WHEN metodo_pago = 'Billetera Digital' THEN monto ELSE 0 END), 0) AS total_billetera,
                IFNULL(SUM(CASE WHEN metodo_pago IN ('Transferencia', 'Depósito', 'Deposito') THEN monto ELSE 0 END), 0) AS total_bancos
            FROM movimiento_caja
            WHERE DATE(fecha_movimiento) = CURDATE() 
              AND estado = 1 
              AND modulo_origen = 'COBRO_FLETE'
              AND tipo_movimiento = 'INGRESO'
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
