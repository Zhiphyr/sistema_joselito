const db = require('../config/db');
const { cloudinary } = require('../config/cloudinary');

// Resuelve la cuenta/billetera de origen de una línea de pago, siguiendo la misma
// convención usada en viajeController.liquidarViaje y deudaController.registrarCobro:
// Efectivo/Depósito siempre salen de la Caja Física (es_sistema=1); una Billetera
// Digital arrastra también la cuenta bancaria a la que esté vinculada (si tiene una).
const resolverOrigenPagoIndemnizacion = async (connection, metodoPago, idCuentaSeleccionada, idBilleteraSeleccionada) => {
    if (metodoPago === 'Efectivo' || metodoPago === 'Depósito') {
        const [cajaRows] = await connection.query('SELECT id_cuenta FROM cuenta_bancaria WHERE es_sistema = 1 LIMIT 1');
        return { id_cuenta_origen: cajaRows.length > 0 ? cajaRows[0].id_cuenta : null, id_billetera_origen: null };
    }
    if (metodoPago === 'Billetera Digital' && idBilleteraSeleccionada) {
        const [billRows] = await connection.query('SELECT id_cuenta_vinculada FROM billetera_digital WHERE id_billetera = ?', [idBilleteraSeleccionada]);
        const idCuentaVinculada = billRows.length > 0 ? billRows[0].id_cuenta_vinculada : null;
        return { id_cuenta_origen: idCuentaVinculada || null, id_billetera_origen: idBilleteraSeleccionada };
    }
    return { id_cuenta_origen: idCuentaSeleccionada || null, id_billetera_origen: null };
};

// Saldo disponible de la cuenta/billetera ya resuelta por resolverOrigenPagoIndemnizacion,
// calculado sumando movimiento_caja (ingresos - egresos) — cuenta_bancaria no tiene columna
// de saldo, misma regla anti-doble-conteo que viajeController.calcularSaldoDisponible.
const calcularSaldoDisponible = async (connection, idCuentaOrigen, idBilleteraOrigen) => {
    if (idCuentaOrigen) {
        const [billRows] = await connection.query('SELECT id_billetera FROM billetera_digital WHERE active_cuenta_vinculada = ?', [idCuentaOrigen]);
        const idBilleteraVinc = billRows.length > 0 ? billRows[0].id_billetera : null;

        let query = `
            SELECT
                IFNULL(SUM(CASE WHEN id_cuenta_destino = ? THEN monto ELSE 0 END), 0) AS ingresos_cuenta,
                IFNULL(SUM(CASE WHEN id_cuenta_origen = ? THEN monto ELSE 0 END), 0) AS egresos_cuenta
        `;
        const params = [idCuentaOrigen, idCuentaOrigen];

        if (idBilleteraVinc) {
            query += `,
                IFNULL(SUM(CASE WHEN id_billetera_destino = ? AND id_cuenta_destino IS NULL THEN monto ELSE 0 END), 0) AS ingresos_billetera,
                IFNULL(SUM(CASE WHEN id_billetera_origen = ? AND id_cuenta_origen IS NULL THEN monto ELSE 0 END), 0) AS egresos_billetera
            `;
            params.push(idBilleteraVinc, idBilleteraVinc);
        }

        query += ' FROM movimiento_caja WHERE estado = 1';

        const [rows] = await connection.query(query, params);
        const r = rows[0];
        let saldo = Number(r.ingresos_cuenta) - Number(r.egresos_cuenta);
        if (idBilleteraVinc) saldo += Number(r.ingresos_billetera) - Number(r.egresos_billetera);
        return Math.round(saldo * 100) / 100;
    }

    if (idBilleteraOrigen) {
        const [rows] = await connection.query(`
            SELECT
                IFNULL(SUM(CASE WHEN id_billetera_destino = ? THEN monto ELSE 0 END), 0) AS ingresos,
                IFNULL(SUM(CASE WHEN id_billetera_origen = ? THEN monto ELSE 0 END), 0) AS egresos
            FROM movimiento_caja WHERE estado = 1
        `, [idBilleteraOrigen, idBilleteraOrigen]);
        const saldo = Number(rows[0].ingresos) - Number(rows[0].egresos);
        return Math.round(saldo * 100) / 100;
    }

    return 0;
};

const getDeudasPendientes = async (req, res) => {
    try {
        const [deudas] = await db.query(`
            SELECT 
                v.id_viaje, CONCAT('#', v.id_viaje) as viaje_correlativo, v.fecha_creacion as viaje_fecha,
                cg.id_carga, CONCAT('#', cg.id_carga) as carga_correlativo,
                rem.id_cliente as remitente_id, rem.nombre_razon_social as remitente_nombre,
                dest.id_cliente as destinatario_id, dest.nombre_razon_social as destinatario_nombre,
                dc.id_detalle, p.nombre as producto_nombre,
                dc.cantidad_sacos, dc.peso_total,
                idc.id_incidencia, idc.precio_unitario_acordado, idc.subtotal_indemnizar,
                iv.tipo_incidencia, iv.descripcion_detallada
            FROM incidencia_detalle_carga idc
            JOIN incidencia_viaje iv ON idc.id_incidencia = iv.id_incidencia
            JOIN detalle_carga dc ON idc.id_detalle = dc.id_detalle
            JOIN productos p ON dc.id_producto = p.id_producto
            JOIN carga cg ON dc.id_carga = cg.id_carga
            JOIN viaje v ON cg.id_viaje = v.id_viaje
            JOIN clientes rem ON cg.id_remitente = rem.id_cliente
            JOIN clientes dest ON cg.id_destinatario = dest.id_cliente
            WHERE idc.estado_pago_cliente = 'Pendiente' AND idc.subtotal_indemnizar > 0
            ORDER BY v.id_viaje DESC, cg.id_carga ASC
        `);

        // Group by Viaje -> Carga
        const viajesAgrupados = {};
        
        deudas.forEach(row => {
            // Inicializar Viaje
            if (!viajesAgrupados[row.id_viaje]) {
                viajesAgrupados[row.id_viaje] = {
                    id_viaje: row.id_viaje,
                    viaje_correlativo: row.viaje_correlativo,
                    viaje_fecha: row.viaje_fecha,
                    cargas: {}
                };
            }
            
            // Inicializar Carga dentro del Viaje
            const viaje = viajesAgrupados[row.id_viaje];
            if (!viaje.cargas[row.id_carga]) {
                viaje.cargas[row.id_carga] = {
                    id_carga: row.id_carga,
                    carga_correlativo: row.carga_correlativo,
                    remitente_id: row.remitente_id,
                    remitente_nombre: row.remitente_nombre,
                    destinatario_id: row.destinatario_id,
                    destinatario_nombre: row.destinatario_nombre,
                    total_deuda_carga: 0,
                    detalles: []
                };
            }
            
            // Agregar Detalle a la Carga
            const carga = viaje.cargas[row.id_carga];
            carga.total_deuda_carga += parseFloat(row.subtotal_indemnizar);
            carga.detalles.push({
                id_incidencia: row.id_incidencia,
                id_detalle: row.id_detalle,
                producto_nombre: row.producto_nombre,
                cantidad_sacos: row.cantidad_sacos,
                peso_total: row.peso_total,
                precio_unitario_acordado: parseFloat(row.precio_unitario_acordado),
                subtotal_indemnizar: parseFloat(row.subtotal_indemnizar),
                tipo_incidencia: row.tipo_incidencia,
                descripcion_detallada: row.descripcion_detallada
            });
        });

        // Convertir objetos a arrays para el frontend
        const dataFinal = Object.values(viajesAgrupados).map(v => {
            return {
                ...v,
                cargas: Object.values(v.cargas)
            };
        });

        res.json({
            success: true,
            data: dataFinal
        });

    } catch (error) {
        console.error('Error al obtener deudas pendientes:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al obtener deudas.' });
    }
};

const registrarPago = async (req, res) => {
    let { id_cliente, monto_total, observaciones, detalles, pagos } = req.body;
    const id_usuario = req.headers['x-user-id'];

    // Parsear JSONs que vienen serializados dentro del FormData
    if (typeof detalles === 'string') {
        try { detalles = JSON.parse(detalles); } catch (e) { detalles = []; }
    }
    if (typeof pagos === 'string') {
        try { pagos = JSON.parse(pagos); } catch (e) { pagos = []; }
    }

    if (!id_cliente || !monto_total || !detalles || !detalles.length) {
        return res.status(400).json({ success: false, message: 'Faltan datos obligatorios para el pago.' });
    }

    if (!id_usuario) {
        return res.status(401).json({ success: false, message: 'No autorizado: falta información del usuario.' });
    }

    if (!pagos || !pagos.length) {
        return res.status(400).json({ success: false, message: 'Debe agregar al menos un método de pago.' });
    }

    for (let i = 0; i < pagos.length; i++) {
        if (pagos[i].metodo_pago !== 'Efectivo' && !pagos[i].numero_operacion) {
            return res.status(400).json({ success: false, message: `El número de operación es obligatorio para el pago #${i + 1} (${pagos[i].metodo_pago}).` });
        }
    }

    const sumaPagos = pagos.reduce((acc, p) => acc + (Number(p.monto_pagado) || 0), 0);
    if (Math.abs(sumaPagos - Number(monto_total)) >= 0.01) {
        return res.status(400).json({ success: false, message: 'La suma de los métodos de pago no coincide con el monto total a pagar.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Insertar cabecera de pago (el id_cliente es el beneficiario elegido)
        const [resultPago] = await connection.query(`
            INSERT INTO pago_indemnizacion (id_cliente, monto_total, observaciones, id_usuario)
            VALUES (?, ?, ?, ?)
        `, [id_cliente, monto_total, observaciones || null, id_usuario]);

        const idPago = resultPago.insertId;

        // 2. Procesar carrito de métodos de pago (pago mixto)
        const saldosReservados = new Map();

        for (let i = 0; i < pagos.length; i++) {
            const pago = pagos[i];
            const fileField = 'evidencia_' + i;
            const fileObj = (req.files || []).find(f => f.fieldname === fileField);
            const evidencia_url = fileObj ? fileObj.path : null;

            const { id_cuenta_origen, id_billetera_origen } = await resolverOrigenPagoIndemnizacion(
                connection, pago.metodo_pago, pago.id_cuenta, pago.id_billetera
            );

            const montoPagoLinea = Number(pago.monto_pagado);
            const claveSaldo = id_cuenta_origen ? `cuenta:${id_cuenta_origen}` : (id_billetera_origen ? `billetera:${id_billetera_origen}` : null);

            if (claveSaldo) {
                const saldoBase = await calcularSaldoDisponible(connection, id_cuenta_origen, id_billetera_origen);
                const yaReservado = saldosReservados.get(claveSaldo) || 0;
                const saldoRestante = Math.round((saldoBase - yaReservado) * 100) / 100;

                if (saldoRestante < montoPagoLinea) {
                    await connection.rollback();
                    if (req.files) {
                        for (const file of req.files) {
                            if (file.filename) await cloudinary.uploader.destroy(file.filename);
                        }
                    }
                    return res.status(400).json({
                        success: false,
                        message: `Fondos Insuficientes: el método de pago "${pago.metodo_pago}" del pago #${i + 1} solo tiene S/ ${saldoRestante.toFixed(2)} disponible.`
                    });
                }

                saldosReservados.set(claveSaldo, yaReservado + montoPagoLinea);
            }

            await connection.query(`
                INSERT INTO detalle_pago_indemnizacion
                (id_pago, metodo_pago, id_cuenta, id_billetera, monto_pagado, numero_operacion, evidencia_url)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [idPago, pago.metodo_pago, pago.id_cuenta || null, pago.id_billetera || null, pago.monto_pagado, pago.numero_operacion || null, evidencia_url]);

            await connection.query(`
                INSERT INTO movimiento_caja
                (tipo_movimiento, concepto, monto, metodo_pago, id_cuenta_origen, id_billetera_origen, id_cuenta_destino, id_billetera_destino, modulo_origen, id_registro_origen, numero_operacion, id_usuario)
                VALUES ('EGRESO', ?, ?, ?, ?, ?, NULL, NULL, 'SINIESTROS', ?, ?, ?)
            `, [
                `Indemnización a cliente #${id_cliente} - Pago #${idPago} (${pago.metodo_pago})`,
                pago.monto_pagado, pago.metodo_pago, id_cuenta_origen, id_billetera_origen,
                idPago, pago.numero_operacion || null, id_usuario
            ]);
        }

        // 3. Insertar detalles de productos pagados y actualizar su estado
        for (const det of detalles) {
            await connection.query(`
                INSERT INTO pago_indemnizacion_detalle (id_pago, id_incidencia, id_detalle, monto_pagado)
                VALUES (?, ?, ?, ?)
            `, [idPago, det.id_incidencia, det.id_detalle, det.monto_pagado]);

            await connection.query(`
                UPDATE incidencia_detalle_carga
                SET estado_pago_cliente = 'Pagado'
                WHERE id_incidencia = ? AND id_detalle = ?
            `, [det.id_incidencia, det.id_detalle]);
        }

        await connection.commit();
        res.json({ success: true, message: 'Pago registrado exitosamente.' });

    } catch (error) {
        await connection.rollback();
        console.error('Error al registrar pago:', error);
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                if (file.filename) await cloudinary.uploader.destroy(file.filename);
            }
        }
        res.status(500).json({ success: false, message: 'Error interno del servidor al registrar pago.' });
    } finally {
        connection.release();
    }
};

const getHistorialPagos = async (req, res) => {
    try {
        const [pagos] = await db.query(`
            SELECT
                p.id_pago, p.id_cliente, c.nombre_razon_social as cliente_nombre,
                p.monto_total, p.fecha_pago, p.observaciones,
                u.nombre as usuario_nombre,
                p.estado
            FROM pago_indemnizacion p
            JOIN clientes c ON p.id_cliente = c.id_cliente
            JOIN usuarios u ON p.id_usuario = u.id_usuario
            ORDER BY p.fecha_pago DESC
        `);

        for(let pago of pagos) {
            const [detalles] = await db.query(`
                SELECT
                    pid.id_incidencia, pid.id_detalle, pid.monto_pagado,
                    p_prod.nombre as producto_nombre,
                    CONCAT('#', v.id_viaje) as viaje_correlativo,
                    iv.tipo_incidencia
                FROM pago_indemnizacion_detalle pid
                JOIN incidencia_detalle_carga idc ON pid.id_incidencia = idc.id_incidencia AND pid.id_detalle = idc.id_detalle
                JOIN incidencia_viaje iv ON idc.id_incidencia = iv.id_incidencia
                JOIN detalle_carga dc ON idc.id_detalle = dc.id_detalle
                JOIN productos p_prod ON dc.id_producto = p_prod.id_producto
                JOIN carga cg ON dc.id_carga = cg.id_carga
                JOIN viaje v ON cg.id_viaje = v.id_viaje
                WHERE pid.id_pago = ?
            `, [pago.id_pago]);

            pago.detalles = detalles;

            const [metodosPago] = await db.query(`
                SELECT
                    dpi.metodo_pago, dpi.monto_pagado, dpi.numero_operacion, dpi.evidencia_url,
                    cb.titular as cuenta_titular, ef.nombre as cuenta_entidad,
                    bd.titular as billetera_titular, pb.nombre as billetera_proveedor
                FROM detalle_pago_indemnizacion dpi
                LEFT JOIN cuenta_bancaria cb ON dpi.id_cuenta = cb.id_cuenta
                LEFT JOIN entidad_financiera ef ON cb.id_entidad = ef.id_entidad
                LEFT JOIN billetera_digital bd ON dpi.id_billetera = bd.id_billetera
                LEFT JOIN proveedor_billetera pb ON bd.id_proveedor = pb.id_proveedor
                WHERE dpi.id_pago = ?
            `, [pago.id_pago]);

            pago.metodos_pago = metodosPago;
        }

        res.json({ success: true, data: pagos });
    } catch (error) {
        console.error('Error al obtener historial de pagos:', error);
        res.status(500).json({ success: false, message: 'Error interno al obtener el historial.' });
    }
};

const anularPago = async (req, res) => {
    const { id_pago } = req.params;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Obtener detalles del pago
        const [detalles] = await connection.query(`
            SELECT id_incidencia, id_detalle FROM pago_indemnizacion_detalle WHERE id_pago = ?
        `, [id_pago]);

        // Revertir el estado a 'Pendiente'
        for (const det of detalles) {
            await connection.query(`
                UPDATE incidencia_detalle_carga 
                SET estado_pago_cliente = 'Pendiente'
                WHERE id_incidencia = ? AND id_detalle = ?
            `, [det.id_incidencia, det.id_detalle]);
        }

        // Anular el pago (estado = 0)
        await connection.query(`UPDATE pago_indemnizacion SET estado = 0 WHERE id_pago = ?`, [id_pago]);

        // Anular los movimientos de caja asociados (el saldo de la cuenta/billetera vuelve a subir)
        await connection.query(`
            UPDATE movimiento_caja SET estado = 0
            WHERE modulo_origen = 'SINIESTROS' AND id_registro_origen = ?
        `, [id_pago]);

        await connection.commit();
        res.json({ success: true, message: 'Pago anulado correctamente.' });

    } catch (error) {
        await connection.rollback();
        console.error('Error al anular pago:', error);
        res.status(500).json({ success: false, message: 'Error interno al anular el pago.' });
    } finally {
        connection.release();
    }
};

module.exports = {
    getDeudasPendientes,
    registrarPago,
    getHistorialPagos,
    anularPago
};
