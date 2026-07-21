const db = require('../config/db');
const { cloudinary } = require('../config/cloudinary');

// Resuelve la cuenta/billetera de origen de un pago en efectivo/transferencia/billetera,
// siguiendo la misma convención usada en deudaController.registrarCobro y en
// liquidarViaje: Efectivo siempre sale de la Caja Física (es_sistema=1); una Billetera
// Digital arrastra también la cuenta bancaria a la que esté vinculada (si tiene una).
const resolverOrigenPagoAdelanto = async (connection, metodoPago, idCuentaSeleccionada, idBilleteraSeleccionada) => {
    if (metodoPago === 'Efectivo') {
        const [cajaRows] = await connection.query('SELECT id_cuenta FROM cuenta_bancaria WHERE es_sistema = 1 AND tipo_cuenta = "Efectivo" LIMIT 1');
        return { id_cuenta_origen: cajaRows.length > 0 ? cajaRows[0].id_cuenta : null, id_billetera_origen: null };
    }
    if (metodoPago === 'Billetera Digital' && idBilleteraSeleccionada) {
        const [billRows] = await connection.query('SELECT id_cuenta_vinculada FROM billetera_digital WHERE id_billetera = ?', [idBilleteraSeleccionada]);
        const idCuentaVinculada = billRows.length > 0 ? billRows[0].id_cuenta_vinculada : null;
        return { id_cuenta_origen: idCuentaVinculada || null, id_billetera_origen: idBilleteraSeleccionada };
    }
    return { id_cuenta_origen: idCuentaSeleccionada || null, id_billetera_origen: null };
};

// Saldo actual del método de pago ya resuelto por resolverOrigenPagoAdelanto (cuenta y/o
// billetera). Misma regla anti-doble-conteo que cuentaBancariaController.calcularSaldoCuenta
// y dashboardFinancieroController.obtenerResumenCuentas: si hay cuenta, esa es la entidad
// (arrastra su billetera vinculada si tiene); si solo hay billetera, es una independiente.
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

const registrarViaje = async (req, res) => {
    let connection;
    try {
        let { camion, ruta, flete_global, tarifa_transportista, fecha_salida, cargas, tiene_adelanto, monto_adelanto, metodo_adelanto, numero_operacion, id_cuenta_adelanto, id_billetera_adelanto } = req.body;
        const userId = req.headers['x-user-profile'] || 1; // Ajustar según tu autenticación

        // Parsear datos si vienen de FormData (multipart)
        if (typeof cargas === 'string') {
            try {
                cargas = JSON.parse(cargas);
            } catch (e) {
                return res.status(400).json({ success: false, message: 'Formato de cargas inválido' });
            }
        }
        
        if (typeof tiene_adelanto === 'string') {
            tiene_adelanto = (tiene_adelanto === 'true');
        }
        
        let evidencia_url = null;
        if (req.file) {
            evidencia_url = req.file.path;
        }

        // Validaciones básicas
        if (!camion || !ruta || !flete_global || !tarifa_transportista || !fecha_salida) {
            return res.status(400).json({ success: false, message: 'Faltan datos obligatorios del viaje' });
        }

        // Validación de Servidor: El Adelanto no puede ser mayor al pago transportista
        if (tiene_adelanto && Number(monto_adelanto) > 0) {
            let totalPesoGlobal = 0;
            if (cargas && cargas.length > 0) {
                cargas.forEach(c => {
                    if (c.productos && c.productos.length > 0) {
                        c.productos.forEach(p => {
                            totalPesoGlobal += Number(p.peso_total) || 0;
                        });
                    }
                });
            }
            
            const pagoTransportistaGlobal = totalPesoGlobal * Number(tarifa_transportista);
            
            if (Number(monto_adelanto) > pagoTransportistaGlobal) {
                return res.status(400).json({ success: false, message: 'El adelanto no puede superar el pago total del transportista' });
            }
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Insertar Viaje
        const sqlViaje = `
            INSERT INTO Viaje (id_camion, id_ruta, tarifa_transportista, fecha_salida, id_usuario)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [resultViaje] = await connection.query(sqlViaje, [camion, ruta, tarifa_transportista, fecha_salida, userId]);
        const idViajeInsertado = resultViaje.insertId;

        // 2. Insertar Cargas
        if (cargas && cargas.length > 0) {
            for (const carga of cargas) {
                // Carga ya existente en almacén (nacida de una cotización aprobada): solo se
                // reasigna al viaje, no se vuelve a insertar ni se duplica su Detalle_Carga.
                // El guard "id_viaje IS NULL" es la garantía real anti-doble-asignación:
                // si otra pestaña/ventana ya se la llevó primero, affectedRows viene en 0.
                if (carga.es_carga_existente && carga.id_carga_real) {
                    const [resultReasignar] = await connection.query(
                        `UPDATE Carga SET id_viaje = ?, estado_entrega = 'En ruta' WHERE id_carga = ? AND id_viaje IS NULL`,
                        [idViajeInsertado, carga.id_carga_real]
                    );

                    if (resultReasignar.affectedRows === 0) {
                        await connection.rollback();
                        connection.release();
                        return res.status(409).json({
                            success: false,
                            message: `La carga #${carga.id_carga_real} ya fue asignada a otro viaje. Actualiza la lista de cargas pendientes e inténtalo de nuevo.`
                        });
                    }

                    continue;
                }

                const sqlCarga = `
                    INSERT INTO Carga (id_viaje, id_remitente, id_destinatario, flete_total, estado_entrega, id_usuario)
                    VALUES (?, ?, ?, ?, 'En ruta', ?)
                `;
                const [resultCarga] = await connection.query(sqlCarga, [
                    idViajeInsertado,
                    carga.id_remitente,
                    carga.id_destinatario,
                    carga.resumen.total_flete,
                    userId
                ]);
                const idCargaInsertada = resultCarga.insertId;

                // 3. Insertar Detalle de Cargas (Productos)
                if (carga.productos && carga.productos.length > 0) {
                    for (const prod of carga.productos) {
                        const sqlDetalle = `
                            INSERT INTO Detalle_Carga 
                            (id_carga, id_producto, marca_visual, cantidad_sacos, peso_unitario, peso_total, precio_peso, flete_subtotal)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `;
                        await connection.query(sqlDetalle, [
                            idCargaInsertada,
                            prod.id_producto,
                            prod.marca_visual || '',
                            prod.cantidad,
                            prod.peso_unidad,
                            prod.peso_total,
                            prod.tarifa_flete,
                            prod.flete_total
                        ]);
                    }
                }
            }
        }

        // 4. Insertar Adelanto Inicial si aplica
        if (tiene_adelanto && Number(monto_adelanto) > 0) {
            const metodoAdelantoFinal = metodo_adelanto || 'Efectivo';
            const { id_cuenta_origen, id_billetera_origen } = await resolverOrigenPagoAdelanto(
                connection, metodoAdelantoFinal, id_cuenta_adelanto || null, id_billetera_adelanto || null
            );

            const saldoDisponibleAdelanto = await calcularSaldoDisponible(connection, id_cuenta_origen, id_billetera_origen);
            if (saldoDisponibleAdelanto < Number(monto_adelanto)) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    success: false,
                    message: `Fondos Insuficientes: el método de pago seleccionado para el adelanto solo tiene S/ ${saldoDisponibleAdelanto.toFixed(2)} disponible.`
                });
            }

            const sqlAdelanto = `
                INSERT INTO adelantos_viaje (id_viaje, id_usuario, monto, id_cuenta, id_billetera, metodo_entrega, numero_operacion, evidencia_url, motivo_referencial)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Viáticos iniciales')
            `;
            const [resultAdelanto] = await connection.query(sqlAdelanto, [
                idViajeInsertado,
                userId,
                Number(monto_adelanto),
                id_cuenta_origen,
                id_billetera_origen,
                metodoAdelantoFinal,
                numero_operacion || null,
                evidencia_url || null
            ]);

            // 4.1. Inyectar en Libro Mayor (movimiento_caja) - el adelanto ya sale de caja/banco
            // en este momento; luego, al liquidar, el neto a pagar ya viene descontado.
            await connection.query(`
                INSERT INTO movimiento_caja
                (tipo_movimiento, concepto, monto, metodo_pago, id_cuenta_origen, id_billetera_origen, id_cuenta_destino, id_billetera_destino, modulo_origen, id_registro_origen, numero_operacion, id_usuario)
                VALUES ('EGRESO', ?, ?, ?, ?, ?, NULL, NULL, 'ADELANTOS', ?, ?, ?)
            `, [
                `Adelanto a transportista - Viaje #${idViajeInsertado}`,
                Number(monto_adelanto),
                metodoAdelantoFinal,
                id_cuenta_origen,
                id_billetera_origen,
                resultAdelanto.insertId,
                numero_operacion || null,
                userId
            ]);
        }

        // Si todo sale bien, aplicamos los cambios
        await connection.commit();
        connection.release();

        return res.status(201).json({ success: true, message: 'Viaje registrado exitosamente', id_viaje: idViajeInsertado });

    } catch (error) {
        // En caso de cualquier error, deshacemos todo
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Error en registrarViaje:', error);
        return res.status(500).json({ success: false, message: 'Error interno al registrar el viaje' });
    }
};

const obtenerHistorialViajes = async (req, res) => {
    try {
        const { search, fechaSalida, fechaLlegada, estado, page = 1, limit = 10 } = req.query;
        
        let whereClause = 'v.estado != 2';
        const queryParams = [];
        const countParams = [];

        if (search) {
            whereClause += ' AND (v.id_viaje LIKE ? OR c.placa LIKE ? OR c.conductor LIKE ?)';
            const searchParam = `%${search}%`;
            queryParams.push(searchParam, searchParam, searchParam);
            countParams.push(searchParam, searchParam, searchParam);
        }

        if (fechaSalida) {
            whereClause += ' AND DATE(v.fecha_salida) = ?';
            queryParams.push(fechaSalida);
            countParams.push(fechaSalida);
        }

        if (fechaLlegada) {
            whereClause += ' AND DATE(v.fecha_llegada) = ?';
            queryParams.push(fechaLlegada);
            countParams.push(fechaLlegada);
        }

        if (estado && estado !== 'todos') {
            if (estado === 'activos') {
                whereClause += " AND v.estado_operativo IN ('En Ruta', 'Llegó a Destino', 'Descargado', 'Incidencia')";
            } else {
                let estadoDB = '';
                if (estado === 'en_ruta') estadoDB = 'En Ruta';
                else if (estado === 'llego_destino') estadoDB = 'Llegó a Destino';
                else if (estado === 'finalizado') estadoDB = 'Finalizado';
                else if (estado === 'incidencia') estadoDB = 'Incidencia';
                
                if (estadoDB) {
                    whereClause += ' AND v.estado_operativo = ?';
                    queryParams.push(estadoDB);
                    countParams.push(estadoDB);
                }
            }
        }

        const numLimit = parseInt(limit) || 10;
        const numPage = parseInt(page) || 1;
        const offset = (numPage - 1) * numLimit;

        // Conteo total para paginación
        const countSql = `
            SELECT COUNT(DISTINCT v.id_viaje) as total
            FROM Viaje v
            JOIN Camiones c ON v.id_camion = c.id_camion
            WHERE ${whereClause}
        `;
        const [countResult] = await db.query(countSql, countParams);
        const totalRecords = countResult[0].total;

        // Consulta principal con límites
        const sql = `
            SELECT 
                v.id_viaje,
                v.id_viaje_origen,
                v.fecha_salida,
                v.fecha_llegada,
                v.tarifa_transportista,
                v.estado_operativo,
                v.estado_pagos,
                c.placa as vehiculo,
                c.nombre as vehiculo_nombre,
                c.conductor as chofer,
                c.numero_documento as chofer_dni,
                c.telefono as chofer_telefono,
                r.ciudad_origen,
                r.ciudad_destino,
                u.nombre as usuario_creador,
                COUNT(DISTINCT cg.id_carga) as total_cargas,
                COALESCE(SUM(dc.peso_total), 0) as peso_total_kg,
                (SELECT COALESCE(SUM(flete_total), 0) FROM Carga WHERE id_viaje = v.id_viaje AND estado != 2) as flete_total,
                (SELECT COUNT(*) FROM Detalle_Carga dc JOIN Carga c ON dc.id_carga = c.id_carga WHERE c.id_viaje = v.id_viaje AND dc.estado_operativo = 'Rechazado' AND dc.estado != 2) as cargas_rechazadas,
                (SELECT COUNT(*) FROM Detalle_Carga dc JOIN Carga c ON dc.id_carga = c.id_carga WHERE c.id_viaje = v.id_viaje AND dc.estado_operativo = 'Rechazado' AND dc.incidencia_justificada = 1 AND dc.estado != 2) as productos_rechazados_sin_justificar,
                (SELECT COUNT(*) FROM Detalle_Carga dc JOIN Carga c ON dc.id_carga = c.id_carga WHERE c.id_viaje = v.id_viaje AND dc.estado_operativo = 'Siniestrado' AND dc.incidencia_justificada = 1 AND dc.estado != 2) as productos_siniestrados_sin_justificar,
                (SELECT COUNT(*) FROM Incidencia_Viaje iv WHERE iv.id_viaje = v.id_viaje AND iv.estado = 1) > 0 as tiene_incidencia_reportada,
                (SELECT COUNT(*) FROM Incidencia_Viaje iv LEFT JOIN Incidencia_Detalle_Carga idc ON iv.id_incidencia = idc.id_incidencia WHERE iv.id_viaje = v.id_viaje AND iv.estado = 1 AND idc.id_incidencia IS NULL) > 0 as tiene_incidencia_general
            FROM Viaje v
            JOIN Camiones c ON v.id_camion = c.id_camion
            JOIN rutas r ON v.id_ruta = r.id_ruta
            LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
            LEFT JOIN Carga cg ON v.id_viaje = cg.id_viaje AND cg.estado != 2
            LEFT JOIN Detalle_Carga dc ON cg.id_carga = dc.id_carga AND dc.estado != 2
            WHERE ${whereClause}
            GROUP BY v.id_viaje
            ORDER BY v.fecha_salida DESC
            LIMIT ? OFFSET ?
        `;
        
        queryParams.push(numLimit, offset);
        const [viajes] = await db.query(sql, queryParams);
        
        return res.status(200).json({ success: true, data: viajes, totalRecords });
    } catch (error) {
        console.error('Error en obtenerHistorialViajes:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener el historial de viajes' });
    }
};

const obtenerCargasPorViaje = async (req, res) => {
    try {
        const idViaje = req.params.id;
        
        // Consultar las cargas con remitente y destinatario
        const sqlCargas = `
            SELECT 
                c.id_carga, c.flete_total,
                c.estado_cobro, c.estado_entrega,
                rem.nombre_razon_social AS remitente_nombre, rem.numero_documento AS remitente_doc,
                dest.nombre_razon_social AS destinatario_nombre, dest.numero_documento AS destinatario_doc
            FROM Carga c
            JOIN clientes rem ON c.id_remitente = rem.id_cliente
            JOIN clientes dest ON c.id_destinatario = dest.id_cliente
            WHERE c.id_viaje = ? AND c.estado != 2
            ORDER BY c.id_carga ASC
        `;
        const [cargas] = await db.query(sqlCargas, [idViaje]);

        if (cargas.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        const idsCargas = cargas.map(c => c.id_carga);

        // Consultar los detalles de todas esas cargas
        const sqlDetalles = `
            SELECT 
                dc.id_detalle, dc.id_producto, dc.id_carga, p.nombre AS producto, dc.marca_visual, 
                dc.cantidad_sacos, dc.peso_unitario, dc.peso_total, 
                dc.precio_peso, dc.flete_subtotal, dc.estado_operativo, dc.incidencia_justificada
            FROM Detalle_Carga dc
            JOIN productos p ON dc.id_producto = p.id_producto
            WHERE dc.id_carga IN (?) AND dc.estado != 2
        `;
        const [detalles] = await db.query(sqlDetalles, [idsCargas]);

        // Mapear los detalles a cada carga correspondiente
        const dataFinal = cargas.map(carga => {
            return {
                ...carga,
                detalles: detalles.filter(d => d.id_carga === carga.id_carga)
            };
        });

        return res.status(200).json({ success: true, data: dataFinal });
    } catch (error) {
        console.error('Error en obtenerCargasPorViaje:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener las cargas del viaje' });
    }
};

const obtenerCargasPendientesAlmacen = async (req, res) => {
    try {
        // Cargas que ya existen en BD (nacidas de una cotización aprobada) pero que aún
        // no tienen camión/viaje asignado - siguen físicamente en el almacén de origen.
        const sqlCargas = `
            SELECT
                c.id_carga, c.id_cotizacion_origen, c.flete_total, c.fecha_registro,
                rem.id_cliente AS id_remitente, rem.nombre_razon_social AS nombre_remitente,
                dest.id_cliente AS id_destinatario, dest.nombre_razon_social AS nombre_destinatario
            FROM Carga c
            JOIN clientes rem ON c.id_remitente = rem.id_cliente
            JOIN clientes dest ON c.id_destinatario = dest.id_cliente
            WHERE c.id_viaje IS NULL AND c.estado_entrega = 'En Almacen de Origen' AND c.estado != 2
            ORDER BY c.fecha_registro ASC
        `;
        const [cargas] = await db.query(sqlCargas);

        if (cargas.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        const idsCargas = cargas.map(c => c.id_carga);

        const sqlDetalles = `
            SELECT
                dc.id_carga, dc.id_producto, p.nombre AS nombre_producto, dc.marca_visual,
                dc.cantidad_sacos, dc.peso_unitario, dc.peso_total, dc.precio_peso, dc.flete_subtotal
            FROM Detalle_Carga dc
            JOIN productos p ON dc.id_producto = p.id_producto
            WHERE dc.id_carga IN (?) AND dc.estado != 2
        `;
        const [detalles] = await db.query(sqlDetalles, [idsCargas]);

        const dataFinal = cargas.map(carga => ({
            ...carga,
            productos: detalles.filter(d => d.id_carga === carga.id_carga)
        }));

        return res.status(200).json({ success: true, data: dataFinal });
    } catch (error) {
        console.error('Error en obtenerCargasPendientesAlmacen:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener las cargas pendientes en almacén' });
    }
};

const obtenerViajesRecepcion = async (req, res) => {
    try {
        const sql = `
            SELECT 
                v.id_viaje,
                v.id_viaje_origen,
                v.fecha_salida,
                v.fecha_llegada,
                v.estado_operativo,
                c.placa as vehiculo,
                c.nombre as vehiculo_nombre,
                c.conductor as chofer,
                r.ciudad_origen,
                r.ciudad_destino,
                COUNT(DISTINCT cg.id_carga) as total_cargas,
                COALESCE(SUM(dc.peso_total), 0) as peso_total_kg
            FROM Viaje v
            JOIN Camiones c ON v.id_camion = c.id_camion
            JOIN rutas r ON v.id_ruta = r.id_ruta
            LEFT JOIN Carga cg ON v.id_viaje = cg.id_viaje AND cg.estado != 2
            LEFT JOIN Detalle_Carga dc ON cg.id_carga = dc.id_carga AND dc.estado != 2
            WHERE v.estado != 2 AND v.estado_operativo IN ('En Ruta', 'Llegó a Destino')
            GROUP BY v.id_viaje
            ORDER BY v.fecha_salida DESC
        `;
        
        const [viajes] = await db.query(sql);
        
        return res.status(200).json({ success: true, data: viajes });
    } catch (error) {
        console.error('Error en obtenerViajesRecepcion:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener viajes de recepción' });
    }
};

const obtenerViajePorId = async (req, res) => {
    try {
        const idViaje = req.params.id;
        const sql = `
            SELECT 
                v.id_viaje,
                v.fecha_salida,
                v.fecha_llegada,
                v.estado_operativo,
                v.id_camion,
                v.id_ruta,
                v.tarifa_transportista,
                v.id_viaje_origen,
                c.placa as vehiculo,
                c.nombre as vehiculo_nombre,
                c.conductor as chofer,
                r.ciudad_origen,
                r.ciudad_destino
            FROM Viaje v
            JOIN Camiones c ON v.id_camion = c.id_camion
            JOIN rutas r ON v.id_ruta = r.id_ruta
            WHERE v.id_viaje = ?
        `;
        
        const [viajes] = await db.query(sql, [idViaje]);
        
        if (viajes.length === 0) {
            return res.status(404).json({ success: false, message: 'Viaje no encontrado' });
        }
        
        return res.status(200).json({ success: true, data: viajes[0] });
    } catch (error) {
        console.error('Error en obtenerViajePorId:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener el viaje' });
    }
};

const marcarLlegadaViaje = async (req, res) => {
    let connection;
    try {
        const idViaje = req.params.id;
        
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        // Actualizamos estado_operativo y fecha_llegada
        const sqlViaje = `
            UPDATE Viaje 
            SET estado_operativo = 'Llegó a Destino', 
                fecha_llegada = NOW() 
            WHERE id_viaje = ? AND estado_operativo = 'En Ruta'
        `;
        
        const [resultViaje] = await connection.query(sqlViaje, [idViaje]);
        
        if (resultViaje.affectedRows === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ success: false, message: 'El viaje no se encontró o ya no está en ruta.' });
        }
        
        // Actualizamos el estado_entrega de las cargas asociadas a este viaje
        const sqlCargas = `
            UPDATE Carga
            SET estado_entrega = 'En Almacen de Destino'
            WHERE id_viaje = ? AND estado_entrega = 'En ruta'
        `;
        
        await connection.query(sqlCargas, [idViaje]);
        
        await connection.commit();
        connection.release();
        
        return res.status(200).json({ success: true, message: 'Llegada marcada y cargas actualizadas a Almacén de Destino.' });
    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Error en marcarLlegadaViaje:', error);
        return res.status(500).json({ success: false, message: 'Error interno al marcar la llegada del viaje.' });
    }
};

const entregarCarga = async (req, res) => {
    let connection;
    try {
        const idCarga = req.params.id;
        
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Obtener id_viaje de esta carga
        const sqlGetViaje = `SELECT id_viaje FROM Carga WHERE id_carga = ?`;
        const [cargaRows] = await connection.query(sqlGetViaje, [idCarga]);
        
        if (cargaRows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ success: false, message: 'La carga no existe.' });
        }
        
        const idViaje = cargaRows[0].id_viaje;
        
        // 2. Actualizar estado de los detalles
        const sqlUpdateDetalles = `
            UPDATE Detalle_Carga
            SET estado_operativo = 'Entregado'
            WHERE id_carga = ? AND estado_operativo = 'Normal' AND estado != 2
        `;
        await connection.query(sqlUpdateDetalles, [idCarga]);

        // 3. Recalcular flete de los Entregados
        const sqlSumFlete = `
            SELECT SUM(flete_subtotal) AS totalFlete
            FROM Detalle_Carga
            WHERE id_carga = ? AND estado_operativo = 'Entregado' AND estado != 2
        `;
        const [sumRows] = await connection.query(sqlSumFlete, [idCarga]);
        const nuevoFlete = sumRows[0].totalFlete || 0;

        // 4. Actualizar estado de la carga
        const sqlUpdateCarga = `
            UPDATE Carga
            SET estado_entrega = 'Entregado', flete_total = ?
            WHERE id_carga = ?
        `;
        await connection.query(sqlUpdateCarga, [nuevoFlete, idCarga]);
        
        // 5. Verificar si quedan cargas pendientes de entrega
        const sqlCheckAll = `
            SELECT COUNT(*) AS pendientes 
            FROM Carga 
            WHERE id_viaje = ? AND estado_entrega NOT IN ('Entregado', 'Rechazado', 'Entregado Parcialmente', 'Rechazado Total') AND estado != 2
        `;
        const [checkRows] = await connection.query(sqlCheckAll, [idViaje]);
        
        let viajeDescargado = false;
        
        if (checkRows[0].pendientes === 0) {
            // 4. Si todas están entregadas/rechazadas, el viaje termina de descargar
            const sqlUpdateViaje = `
                UPDATE Viaje 
                SET estado_operativo = 'Descargado' 
                WHERE id_viaje = ?
            `;
            await connection.query(sqlUpdateViaje, [idViaje]);
            viajeDescargado = true;
        }
        
        await connection.commit();
        connection.release();
        
        return res.status(200).json({ 
            success: true, 
            message: 'Carga marcada como entregada.',
            viajeDescargado: viajeDescargado
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Error en entregarCarga:', error);
        return res.status(500).json({ success: false, message: 'Error interno al registrar la entrega.' });
    }
};

const entregaParcialCarga = async (req, res) => {
    let connection;
    try {
        const idCargaOriginal = req.params.id;
        const { productosAceptados, productosRechazados } = req.body;

        if (!productosAceptados || !productosRechazados) {
            return res.status(400).json({ success: false, message: 'Datos incompletos para entrega parcial' });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [cargaRows] = await connection.query(`SELECT * FROM Carga WHERE id_carga = ? AND estado != 2`, [idCargaOriginal]);
        if (cargaRows.length === 0) throw new Error('Carga original no encontrada');
        const cargaOriginal = cargaRows[0];

        let nuevoFleteTotal = 0;
        let tieneAceptados = false;
        let tieneRechazados = false;

        const [detallesOriginales] = await connection.query(`SELECT * FROM Detalle_Carga WHERE id_carga = ? AND estado != 2`, [idCargaOriginal]);

        for (const det of detallesOriginales) {
            const prodAceptado = productosAceptados.find(p => p.id_detalle == det.id_detalle);
            const prodRechazado = productosRechazados.find(p => p.id_detalle == det.id_detalle);
            
            const cantAceptada = prodAceptado ? Number(prodAceptado.cantidad) : 0;
            const cantRechazada = prodRechazado ? Number(prodRechazado.cantidad) : 0;

            if (cantAceptada > 0) tieneAceptados = true;
            if (cantRechazada > 0) tieneRechazados = true;

            if (cantAceptada > 0 && cantRechazada > 0) {
                // Hay aceptados y rechazados de este producto
                // 1. Modificar original para los Aceptados
                const pesoTotalAcept = cantAceptada * Number(det.peso_unitario);
                const fleteSubtotalAcept = pesoTotalAcept * Number(det.precio_peso);
                nuevoFleteTotal += fleteSubtotalAcept;

                await connection.query(`
                    UPDATE Detalle_Carga 
                    SET cantidad_sacos = ?, peso_total = ?, flete_subtotal = ?, estado_operativo = 'Entregado'
                    WHERE id_detalle = ?
                `, [cantAceptada, pesoTotalAcept, fleteSubtotalAcept, det.id_detalle]);

                // 2. Insertar nuevo detalle para los Rechazados
                const pesoTotalRech = cantRechazada * Number(det.peso_unitario);
                const fleteSubtotalRech = pesoTotalRech * Number(det.precio_peso);

                await connection.query(`
                    INSERT INTO Detalle_Carga (id_carga, id_producto, marca_visual, cantidad_sacos, peso_unitario, peso_total, precio_peso, flete_subtotal, estado_operativo, incidencia_justificada)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Rechazado', 1)
                `, [idCargaOriginal, det.id_producto, det.marca_visual, cantRechazada, det.peso_unitario, pesoTotalRech, det.precio_peso, fleteSubtotalRech]);
                
            } else if (cantAceptada > 0 && cantRechazada === 0) {
                // Todo aceptado de este producto
                const pesoTotalAcept = cantAceptada * Number(det.peso_unitario);
                const fleteSubtotalAcept = pesoTotalAcept * Number(det.precio_peso);
                nuevoFleteTotal += fleteSubtotalAcept;

                await connection.query(`
                    UPDATE Detalle_Carga 
                    SET cantidad_sacos = ?, peso_total = ?, flete_subtotal = ?, estado_operativo = 'Entregado'
                    WHERE id_detalle = ?
                `, [cantAceptada, pesoTotalAcept, fleteSubtotalAcept, det.id_detalle]);
                
            } else if (cantAceptada === 0 && cantRechazada > 0) {
                // Todo rechazado de este producto. Usamos el original para ahorrar inserts.
                const pesoTotalRech = cantRechazada * Number(det.peso_unitario);
                const fleteSubtotalRech = pesoTotalRech * Number(det.precio_peso);

                await connection.query(`
                    UPDATE Detalle_Carga 
                    SET cantidad_sacos = ?, peso_total = ?, flete_subtotal = ?, estado_operativo = 'Rechazado', incidencia_justificada = 1
                    WHERE id_detalle = ?
                `, [cantRechazada, pesoTotalRech, fleteSubtotalRech, det.id_detalle]);
                
            } else {
                // cantAceptada = 0 y cantRechazada = 0
                await connection.query(`UPDATE Detalle_Carga SET estado = 2 WHERE id_detalle = ?`, [det.id_detalle]);
            }
        }

        let nuevoEstadoEntrega = 'Entregado Parcialmente';
        let nuevoEstadoCobro = cargaOriginal.estado_cobro; // Se mantiene Pendiente por defecto

        if (!tieneAceptados && tieneRechazados) {
            nuevoEstadoEntrega = 'Rechazado Total';
            nuevoEstadoCobro = 'Anulado';
            nuevoFleteTotal = 0; // Asegurarse
        } else if (tieneAceptados && !tieneRechazados) {
            nuevoEstadoEntrega = 'Entregado';
        }

        await connection.query(`
            UPDATE Carga 
            SET flete_total = ?, estado_entrega = ?, estado_cobro = ? 
            WHERE id_carga = ?
        `, [nuevoFleteTotal, nuevoEstadoEntrega, nuevoEstadoCobro, idCargaOriginal]);

        // Verificar si quedan cargas pendientes para finalizar el viaje
        const sqlCheckAll = `
            SELECT COUNT(*) AS pendientes 
            FROM Carga 
            WHERE id_viaje = ? AND estado_entrega NOT IN ('Entregado', 'Rechazado', 'Entregado Parcialmente', 'Rechazado Total') AND estado != 2
        `;
        const [checkRows] = await connection.query(sqlCheckAll, [cargaOriginal.id_viaje]);
        
        let viajeDescargado = false;
        
        if (checkRows[0].pendientes === 0) {
            const sqlUpdateViaje = `
                UPDATE Viaje 
                SET estado_operativo = 'Descargado' 
                WHERE id_viaje = ?
            `;
            await connection.query(sqlUpdateViaje, [cargaOriginal.id_viaje]);
            viajeDescargado = true;
        }

        await connection.commit();
        connection.release();

        res.status(200).json({ 
            success: true, 
            message: 'Entrega parcial procesada correctamente.',
            viajeDescargado: viajeDescargado
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Error en entregaParcialCarga:', error);
        res.status(500).json({ success: false, message: 'Error interno al registrar entrega parcial' });
    }
};

const rechazarCarga = async (req, res) => {
    let connection;
    try {
        const idCarga = req.params.id;
        
        connection = await db.getConnection();
        await connection.beginTransaction();

        const sqlGetViaje = `SELECT id_viaje FROM Carga WHERE id_carga = ? AND estado != 2`;
        const [cargaRows] = await connection.query(sqlGetViaje, [idCarga]);
        
        if (cargaRows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ success: false, message: 'La carga no existe.' });
        }
        
        const idViaje = cargaRows[0].id_viaje;
        
        const sqlUpdateDetalles = `
            UPDATE Detalle_Carga
            SET estado_operativo = 'Rechazado', incidencia_justificada = 1
            WHERE id_carga = ? AND estado_operativo = 'Normal' AND estado != 2
        `;
        await connection.query(sqlUpdateDetalles, [idCarga]);

        const sqlUpdateCarga = `
            UPDATE Carga
            SET estado_entrega = 'Rechazado Total', estado_cobro = 'Anulado'
            WHERE id_carga = ?
        `;
        await connection.query(sqlUpdateCarga, [idCarga]);
        
        const sqlCheckAll = `
            SELECT COUNT(*) AS pendientes 
            FROM Carga 
            WHERE id_viaje = ? AND estado_entrega NOT IN ('Entregado', 'Rechazado', 'Entregado Parcialmente', 'Rechazado Total') AND estado != 2
        `;
        const [checkRows] = await connection.query(sqlCheckAll, [idViaje]);
        
        let viajeDescargado = false;
        
        if (checkRows[0].pendientes === 0) {
            // 4. Si todas están entregadas, el viaje se descarga completamente
            const sqlUpdateViaje = `
                UPDATE Viaje 
                SET estado_operativo = 'Descargado' 
                WHERE id_viaje = ?
            `;
            await connection.query(sqlUpdateViaje, [idViaje]);
            viajeDescargado = true;
        }
        
        await connection.commit();
        connection.release();
        
        return res.status(200).json({ 
            success: true, 
            message: 'Carga marcada como entregada.',
            viajeDescargado: viajeDescargado
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Error en entregarCarga:', error);
        return res.status(500).json({ success: false, message: 'Error interno al registrar la entrega.' });
    }
};



const confirmarTransbordo = async (req, res) => {
    let connection;
    try {
        const { id_viaje_accidentado, datos_nuevo_viaje, cargas_transbordo } = req.body;
        
        if (!id_viaje_accidentado || !datos_nuevo_viaje || !cargas_transbordo) {
            return res.status(400).json({ success: false, message: 'Datos incompletos para transbordo' });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Crear Viaje de Rescate
        const sqlNuevoViaje = `
            INSERT INTO Viaje (id_camion, id_ruta, tarifa_transportista, fecha_salida, id_usuario, estado_operativo, id_viaje_origen)
            VALUES (?, ?, ?, ?, ?, 'En Ruta', ?)
        `;
        const [resultNuevoViaje] = await connection.query(sqlNuevoViaje, [
            datos_nuevo_viaje.id_camion, 
            datos_nuevo_viaje.id_ruta, 
            datos_nuevo_viaje.tarifa_transportista, 
            datos_nuevo_viaje.fecha_salida, 
            datos_nuevo_viaje.id_usuario,
            id_viaje_accidentado
        ]);
        const idNuevoViaje = resultNuevoViaje.insertId;

        // 2. Siniestrar Viaje Original y anular su pago
        const sqlViajeOriginal = `UPDATE Viaje SET estado_operativo = 'Incidencia', estado_pagos = 'Anulado' WHERE id_viaje = ?`;
        await connection.query(sqlViajeOriginal, [id_viaje_accidentado]);

        // 3. Iteración de Cargas
        for (const cargaTrans of cargas_transbordo) {
            const { id_carga_original, detalles } = cargaTrans;

            // Obtener carga original
            const [cargaRows] = await connection.query(`SELECT * FROM Carga WHERE id_carga = ?`, [id_carga_original]);
            if (cargaRows.length === 0) throw new Error(`Carga ${id_carga_original} no encontrada`);
            const cargaOriginal = cargaRows[0];

            const hasTransferidos = detalles.some(d => Number(d.cantidad_a_pasar) > 0);
            let idNuevaCarga = null;
            let nuevoFleteTotal = 0;
            let viejoFleteTotal = 0;

            // Crear Carga de Rescate (solo si hay al menos un detalle transferido)
            if (hasTransferidos) {
                const [resultNuevaCarga] = await connection.query(`
                    INSERT INTO Carga (id_viaje, id_remitente, id_destinatario, flete_total, estado_cobro, estado_entrega, id_usuario)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    idNuevoViaje,
                    cargaOriginal.id_remitente,
                    cargaOriginal.id_destinatario,
                    0.00,
                    'Pendiente',
                    'En ruta', 
                    datos_nuevo_viaje.id_usuario
                ]);
                idNuevaCarga = resultNuevaCarga.insertId;
            }

            let totalSiniestradoEnCarga = 0;
            let totalTransbordadoEnCarga = 0;

            // Procesar Detalles
            for (const det of detalles) {
                const [detRows] = await connection.query(`SELECT * FROM Detalle_Carga WHERE id_detalle = ?`, [det.id_detalle_original]);
                if (detRows.length === 0) continue;
                const detOrig = detRows[0];
                
                const cantPasar = Number(det.cantidad_a_pasar);
                const cantOriginal = Number(detOrig.cantidad_sacos);
                const cantPerdida = cantOriginal - cantPasar;

                totalTransbordadoEnCarga += cantPasar;
                totalSiniestradoEnCarga += cantPerdida;

                // Para lo salvado (INSERT) EN VIAJE B (Rescate)
                if (cantPasar > 0) {
                    const pesoTotalSalvado = cantPasar * Number(detOrig.peso_unitario);
                    const fleteSubtotalSalvado = pesoTotalSalvado * Number(detOrig.precio_peso);
                    nuevoFleteTotal += fleteSubtotalSalvado;

                    await connection.query(`
                        INSERT INTO Detalle_Carga (id_carga, id_producto, marca_visual, cantidad_sacos, peso_unitario, peso_total, precio_peso, flete_subtotal)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        idNuevaCarga,
                        detOrig.id_producto,
                        detOrig.marca_visual,
                        cantPasar,
                        detOrig.peso_unitario,
                        pesoTotalSalvado,
                        detOrig.precio_peso,
                        fleteSubtotalSalvado
                    ]);
                }

                // LÓGICA PARA MANTENER HISTORIA EN VIAJE A (Accidentado)
                const pesoTotalPerdido = cantPerdida * Number(detOrig.peso_unitario);
                const fleteSubtotalPerdido = pesoTotalPerdido * Number(detOrig.precio_peso);
                
                const pesoTotalSalvadoOrig = cantPasar * Number(detOrig.peso_unitario);
                const fleteSubtotalSalvadoOrig = pesoTotalSalvadoOrig * Number(detOrig.precio_peso);

                viejoFleteTotal += fleteSubtotalPerdido + fleteSubtotalSalvadoOrig;

                if (cantPerdida > 0 && cantPasar === 0) {
                    // Todo se perdió
                    await connection.query(`
                        UPDATE Detalle_Carga 
                        SET estado_operativo = 'Siniestrado', incidencia_justificada = 1
                        WHERE id_detalle = ?
                    `, [det.id_detalle_original]);
                } else if (cantPerdida === 0 && cantPasar > 0) {
                    // Todo se transbordó
                    await connection.query(`
                        UPDATE Detalle_Carga 
                        SET estado_operativo = 'Transbordado' 
                        WHERE id_detalle = ?
                    `, [det.id_detalle_original]);
                } else if (cantPerdida > 0 && cantPasar > 0) {
                    // Transbordo parcial (Partición)
                    // 1. Actualizamos el detalle original para reflejar la pérdida
                    await connection.query(`
                        UPDATE Detalle_Carga 
                        SET cantidad_sacos = ?, peso_total = ?, flete_subtotal = ?, estado_operativo = 'Siniestrado', incidencia_justificada = 1
                        WHERE id_detalle = ?
                    `, [cantPerdida, pesoTotalPerdido, fleteSubtotalPerdido, det.id_detalle_original]);

                    // 2. Insertamos un NUEVO detalle en el Viaje A para reflejar lo transbordado
                    await connection.query(`
                        INSERT INTO Detalle_Carga (id_carga, id_producto, marca_visual, cantidad_sacos, peso_unitario, peso_total, precio_peso, flete_subtotal, estado_operativo)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Transbordado')
                    `, [
                        id_carga_original,
                        detOrig.id_producto,
                        detOrig.marca_visual,
                        cantPasar,
                        detOrig.peso_unitario,
                        pesoTotalSalvadoOrig,
                        detOrig.precio_peso,
                        fleteSubtotalSalvadoOrig
                    ]);
                }
            }

            // Actualizar flete_total nueva carga
            if (hasTransferidos && idNuevaCarga) {
                await connection.query(`UPDATE Carga SET flete_total = ? WHERE id_carga = ?`, [nuevoFleteTotal, idNuevaCarga]);
            }

            // Determinar estado de la Carga Original en el Viaje A
            let estadoCargaOriginal = 'Siniestrado'; 
            if (totalTransbordadoEnCarga > 0 && totalSiniestradoEnCarga === 0) {
                estadoCargaOriginal = 'Transbordado';
            } else if (totalSiniestradoEnCarga > 0 && totalTransbordadoEnCarga === 0) {
                estadoCargaOriginal = 'Siniestrado';
            } else if (totalTransbordadoEnCarga > 0 && totalSiniestradoEnCarga > 0) {
                estadoCargaOriginal = 'Siniestrado Parcialmente';
            }

            // Actualizar carga original
            await connection.query(`
                UPDATE Carga 
                SET flete_total = ?, estado_entrega = ?, estado_cobro = 'Anulado' 
                WHERE id_carga = ?
            `, [viejoFleteTotal, estadoCargaOriginal, id_carga_original]);
        }

        await connection.commit();
        connection.release();

        return res.status(200).json({ success: true, message: 'Transbordo procesado correctamente', id_viaje: idNuevoViaje });

    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Error en confirmarTransbordo:', error);
        return res.status(500).json({ success: false, message: 'Error interno al confirmar transbordo: ' + error.message });
    }
};

const obtenerIncidenciasViaje = async (req, res) => {
    try {
        const idViaje = req.params.id;
        const [incidencias] = await db.query(`
            SELECT 
                i.id_incidencia, i.tipo_incidencia, i.descripcion_detallada,
                i.valor_total_perdida, i.gastos_adicionales, i.adelanto_recuperar, i.monto_asumido_empresa, i.monto_descuento_chofer,
                i.fecha_creacion,
                u.nombre as usuario_registro
            FROM Incidencia_Viaje i
            JOIN Usuarios u ON i.id_usuario = u.id_usuario
            WHERE i.id_viaje = ? AND i.estado = 1
            ORDER BY i.fecha_creacion DESC
        `, [idViaje]);

        return res.json({
            success: true,
            data: incidencias
        });
    } catch (error) {
        console.error('Error al obtener incidencias del viaje:', error);
        return res.status(500).json({
            success: false,
            message: 'Error de servidor al obtener las incidencias.'
        });
    }
};

const obtenerAdelantosViaje = async (req, res) => {
    try {
        const idViaje = req.params.id;
        
        // Obtener el total
        const [suma] = await db.query(`
            SELECT COALESCE(SUM(monto), 0) as total_adelantos
            FROM adelantos_viaje
            WHERE id_viaje = ? AND estado = 1
        `, [idViaje]);

        // Obtener la lista
        const [adelantos] = await db.query(`
            SELECT a.id_adelanto, a.monto, a.metodo_entrega, a.numero_operacion, a.evidencia_url, a.motivo_referencial, a.fecha_registro as fecha_adelanto,
                   u.nombre as usuario_nombre
            FROM adelantos_viaje a
            LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
            WHERE a.id_viaje = ? AND a.estado = 1
            ORDER BY a.fecha_registro ASC
        `, [idViaje]);

        // Formatear el usuario
        const adelantosFormateados = adelantos.map(ad => ({
            ...ad,
            usuario_creador: ad.usuario_nombre || 'Desconocido'
        }));

        return res.json({
            success: true,
            total_adelantos: Number(suma[0].total_adelantos) || 0,
            data: adelantosFormateados
        });
    } catch (error) {
        console.error('Error al obtener adelantos del viaje:', error);
        return res.status(500).json({
            success: false,
            message: 'Error de servidor al obtener los adelantos.'
        });
    }
};

const registrarAdelantoViaje = async (req, res) => {
    let connection;
    try {
        const idViaje = req.params.id;
        const { monto, metodo_entrega, motivo_referencial, numero_operacion, id_cuenta, id_billetera } = req.body;
        const userId = req.headers['x-user-id'];
        const evidencia_url = req.file ? req.file.path : null;

        if (!monto || !metodo_entrega || !userId) {
            return res.status(400).json({ success: false, message: 'Faltan datos obligatorios para registrar el adelanto.' });
        }

        // Validación de número de operación si no es Efectivo
        if (metodo_entrega !== 'Efectivo') {
            if (!numero_operacion || numero_operacion.trim() === '') {
                return res.status(400).json({ success: false, message: 'El número de operación es obligatorio para este método de entrega.' });
            }

            // Validar que el número de operación sea único
            const [existente] = await db.query('SELECT id_adelanto FROM adelantos_viaje WHERE numero_operacion = ? AND estado = 1', [numero_operacion]);
            if (existente.length > 0) {
                return res.status(400).json({ success: false, message: 'Este número de operación ya ha sido registrado en otro adelanto.' });
            }
        }

        // Validar que el viaje no esté anulado ni liquidado
        const [viajeRes] = await db.query('SELECT estado_operativo, estado_pagos FROM viaje WHERE id_viaje = ?', [idViaje]);
        if (!viajeRes.length) {
            return res.status(404).json({ success: false, message: 'Viaje no encontrado.' });
        }
        
        const viaje = viajeRes[0];
        if (viaje.estado_operativo === 'Incidencia' && viaje.estado_pagos === 'Anulado') {
            return res.status(400).json({ success: false, message: 'El viaje ha sido anulado, no se pueden registrar adelantos.' });
        }
        if (viaje.estado_pagos === 'Liquidado') {
            return res.status(400).json({ success: false, message: 'El viaje ya está liquidado, no se pueden registrar adelantos.' });
        }

        const montoNumber = Number(monto);
        if (isNaN(montoNumber) || montoNumber <= 0) {
            return res.status(400).json({ success: false, message: 'El monto debe ser un número mayor a 0.' });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const { id_cuenta_origen, id_billetera_origen } = await resolverOrigenPagoAdelanto(
            connection, metodo_entrega, id_cuenta || null, id_billetera || null
        );

        const saldoDisponibleAdelanto = await calcularSaldoDisponible(connection, id_cuenta_origen, id_billetera_origen);
        if (saldoDisponibleAdelanto < montoNumber) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: `Fondos Insuficientes: el método de pago seleccionado solo tiene S/ ${saldoDisponibleAdelanto.toFixed(2)} disponible.`
            });
        }

        const [resultAdelanto] = await connection.query(`
            INSERT INTO adelantos_viaje (id_viaje, id_usuario, monto, id_cuenta, id_billetera, metodo_entrega, numero_operacion, evidencia_url, motivo_referencial, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [
            idViaje,
            userId,
            montoNumber,
            id_cuenta_origen,
            id_billetera_origen,
            metodo_entrega,
            numero_operacion || null,
            evidencia_url,
            motivo_referencial || null
        ]);

        // Inyectar en Libro Mayor (movimiento_caja) - mismo patrón que el adelanto inicial en registrarViaje.
        await connection.query(`
            INSERT INTO movimiento_caja
            (tipo_movimiento, concepto, monto, metodo_pago, id_cuenta_origen, id_billetera_origen, id_cuenta_destino, id_billetera_destino, modulo_origen, id_registro_origen, numero_operacion, id_usuario)
            VALUES ('EGRESO', ?, ?, ?, ?, ?, NULL, NULL, 'ADELANTOS', ?, ?, ?)
        `, [
            `Adelanto a transportista - Viaje #${idViaje}`,
            montoNumber,
            metodo_entrega,
            id_cuenta_origen,
            id_billetera_origen,
            resultAdelanto.insertId,
            numero_operacion || null,
            userId
        ]);

        await connection.commit();

        return res.json({ success: true, message: 'Adelanto registrado correctamente.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error al registrar adelanto:', error);
        return res.status(500).json({ success: false, message: 'Error de servidor al registrar el adelanto.' });
    } finally {
        if (connection) connection.release();
    }
};

const registrarIncidenciaViaje = async (req, res) => {
    try {
        const idViaje = req.params.id;
        const {
            tipo_incidencia,
            descripcion_detallada,
            valor_total_perdida,
            valor_indemnizar,
            id_carga,
            gastos_adicionales,
            adelanto_recuperar,
            monto_descuento_chofer,
            monto_asumido_empresa,
            detalles_rechazados
        } = req.body;
        
        const userId = req.headers['x-user-profile'] || 1; // Ajustar según tu autenticación

        // Basic validation
        if (!tipo_incidencia || !descripcion_detallada) {
            return res.status(400).json({ success: false, message: 'Faltan datos obligatorios para la incidencia' });
        }

        // Sanitización básica Backend (Eliminar etiquetas HTML)
        const descSanitizada = descripcion_detallada.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // Helper para limitar a DECIMAL(10,2) max 99999999.99
        const capDecimal = (val) => {
            let num = Number(val) || 0;
            if (num > 99999999.99) num = 99999999.99;
            return num;
        };

        const perdida = capDecimal(valor_total_perdida);
        const indemnizar = capDecimal(valor_indemnizar);
        const gastos = capDecimal(gastos_adicionales);
        const adelanto = capDecimal(adelanto_recuperar);
        const descuento = monto_descuento_chofer !== '' && monto_descuento_chofer !== null ? capDecimal(monto_descuento_chofer) : 0;
        const empresa = monto_asumido_empresa !== '' && monto_asumido_empresa !== null ? capDecimal(monto_asumido_empresa) : 0;
        const idCargaObj = id_carga ? Number(id_carga) : null;

        // Validar el Remanente
        const sqlRemanente = `
            SELECT 
                (SELECT COALESCE(SUM(dc.flete_subtotal), 0) FROM Detalle_Carga dc JOIN Carga c ON dc.id_carga = c.id_carga WHERE c.id_viaje = ? AND dc.estado_operativo IN ('Rechazado', 'Siniestrado') AND dc.estado != 2 AND c.estado = 1) AS perdida_total_cargas,
                (SELECT COALESCE(SUM(valor_total_perdida), 0) FROM Incidencia_Viaje WHERE id_viaje = ? AND estado = 1) AS perdida_ya_registrada
        `;
        const [rows] = await db.query(sqlRemanente, [idViaje, idViaje]);
        const maxPerdidaPosible = Number(rows[0].perdida_total_cargas) || 0;
        const perdidaYaRegistrada = Number(rows[0].perdida_ya_registrada) || 0;
        const remanente = maxPerdidaPosible - perdidaYaRegistrada;

        if (perdida > remanente + 0.01) {
            return res.status(400).json({ success: false, message: 'El monto de pérdida supera el saldo disponible para este viaje.' });
        }

        const totalRepartir = perdida + indemnizar + gastos + adelanto;
        // Evitar problemas de precisión con decimales
        if (Math.abs(totalRepartir - (descuento + empresa)) > 0.01) {
            return res.status(400).json({ success: false, message: 'Los montos de descuento y asunción deben cubrir el 100% del costo del incidente (flete perdido + indemnización + cargos) y adelantos.' });
        }

        const sql = `
            INSERT INTO Incidencia_Viaje 
            (id_viaje, id_carga, tipo_incidencia, descripcion_detallada, valor_total_perdida, valor_indemnizar, gastos_adicionales, adelanto_recuperar, monto_asumido_empresa, monto_descuento_chofer, id_usuario, estado_cobro_penalidad, monto_cobrado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', 0.00)
        `;

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            const [resultInsert] = await connection.query(sql, [
                idViaje,
                idCargaObj,
                tipo_incidencia,
                descSanitizada,
                perdida,
                indemnizar,
                gastos,
                adelanto,
                empresa, 
                descuento, 
                userId
            ]);

            const idIncidenciaInsertada = resultInsert.insertId;

            if (detalles_rechazados && Array.isArray(detalles_rechazados) && detalles_rechazados.length > 0) {
                // If it is an array of objects, map the ids. Otherwise fallback to the old way.
                const idsDetalle = detalles_rechazados.map(d => typeof d === 'object' ? d.id_detalle : d);
                
                const sqlUpdateDetalles = `UPDATE Detalle_Carga SET incidencia_justificada = 0 WHERE id_detalle IN (?)`;
                await connection.query(sqlUpdateDetalles, [idsDetalle]);

                // Insertar en la tabla intermedia
                const insertDetallesValues = detalles_rechazados.map(d => {
                    if (typeof d === 'object') {
                        return [idIncidenciaInsertada, d.id_detalle, d.precio_unitario || 0, d.subtotal || 0];
                    }
                    return [idIncidenciaInsertada, d, 0, 0];
                });
                
                await connection.query(
                    `INSERT INTO Incidencia_Detalle_Carga (id_incidencia, id_detalle, precio_unitario_acordado, subtotal_indemnizar) VALUES ?`, 
                    [insertDetallesValues]
                );
            }

            await connection.commit();
        } catch (trxError) {
            await connection.rollback();
            throw trxError;
        } finally {
            connection.release();
        }

        return res.status(201).json({ success: true, message: 'Incidencia registrada correctamente.' });
    } catch (error) {
        console.error('Error al registrar incidencia:', error);
        return res.status(500).json({ success: false, message: 'Error interno al registrar la incidencia.' });
    }
};

const obtenerLiquidacionesPendientes = async (req, res) => {
    try {
        const sql = `
            SELECT 
                v.id_viaje,
                c.id_camion,
                c.placa AS camion_placa,
                c.nombre AS camion_modelo,
                c.conductor AS chofer_nombre,
                c.numero_documento AS chofer_dni,
                v.tarifa_transportista,
                DATE_FORMAT(v.fecha_salida, '%Y-%m-%d · %H:%i') AS salida,
                DATE_FORMAT(v.fecha_llegada, '%Y-%m-%d · %H:%i') AS llegada,
                CONCAT(ro.ciudad_origen, ' - ', ro.ciudad_destino) AS ruta,
                
                -- Cálculo de peso total de las cargas de este viaje
                (
                    SELECT COALESCE(SUM(dc.peso_total), 0)
                    FROM carga cg
                    JOIN detalle_carga dc ON cg.id_carga = dc.id_carga
                    WHERE cg.id_viaje = v.id_viaje AND cg.estado = 1 AND dc.estado = 1
                ) AS total_peso,
                
                -- Suma de adelantos de este viaje
                (
                    SELECT COALESCE(SUM(monto), 0)
                    FROM adelantos_viaje
                    WHERE id_viaje = v.id_viaje AND estado = 1
                ) AS adelanto,
                
                -- Suma de penalidades pendientes globales de este CAMIÓN
                (
                    SELECT COALESCE(SUM(iv.monto_descuento_chofer - iv.monto_cobrado), 0)
                    FROM incidencia_viaje iv
                    JOIN viaje v2 ON iv.id_viaje = v2.id_viaje
                    WHERE v2.id_camion = v.id_camion 
                      AND iv.estado = 1 
                      AND iv.monto_descuento_chofer IS NOT NULL
                      AND iv.estado_cobro_penalidad IN ('Pendiente', 'Cobrado Parcial')
                ) AS penalidades,

                -- Bandera para bloquear liquidación si existen detalles rechazados o siniestrados sin justificar
                (
                    SELECT COUNT(*) > 0 
                    FROM detalle_carga dc 
                    JOIN carga cg ON dc.id_carga = cg.id_carga 
                    WHERE cg.id_viaje = v.id_viaje AND dc.estado_operativo IN ('Rechazado', 'Siniestrado') AND dc.incidencia_justificada = 1 AND dc.estado != 2
                ) AS bloquear_liquidacion
                
            FROM viaje v
            JOIN camiones c ON v.id_camion = c.id_camion
            JOIN rutas ro ON v.id_ruta = ro.id_ruta
            WHERE v.estado_operativo = 'Finalizado' 
              AND v.estado_pagos = 'Pendiente' 
              AND v.estado = 1
            ORDER BY v.fecha_llegada ASC
        `;

        const [rows] = await db.query(sql);

        // Formatear los datos para el frontend (calcular bruto y neto)
        const liquidaciones = rows.map(row => {
            const monto_bruto = Number(row.total_peso) * Number(row.tarifa_transportista);
            const neto_pagar = monto_bruto - Number(row.adelanto);

            return {
                id: row.id_viaje,
                id_camion: row.id_camion,
                chofer_nombre: row.chofer_nombre,
                chofer_dni: row.chofer_dni,
                camion_placa: row.camion_placa,
                camion_modelo: row.camion_modelo,
                viaje_num: row.id_viaje,
                ruta: row.ruta,
                salida: row.salida || 'Sin fecha',
                llegada: row.llegada || 'Sin fecha',
                peso_total: Number(row.total_peso),
                tarifa: Number(row.tarifa_transportista),
                monto_bruto: monto_bruto,
                adelanto: Number(row.adelanto),
                penalidades_pendientes: Number(row.penalidades),
                neto_pagar: neto_pagar,
                bloquear_liquidacion: !!row.bloquear_liquidacion
            };
        });

        // Calcular pagado este mes
        const sqlPagadoMes = `
            SELECT COALESCE(SUM(monto), 0) AS total_pagado_mes
            FROM movimiento_caja
            WHERE tipo_movimiento = 'EGRESO'
              AND modulo_origen = 'LIQUIDACION'
              AND MONTH(fecha_movimiento) = MONTH(CURRENT_DATE())
              AND YEAR(fecha_movimiento) = YEAR(CURRENT_DATE())
              AND estado = 1
        `;
        const [rowsPagado] = await db.query(sqlPagadoMes);
        const pagadoMes = rowsPagado[0].total_pagado_mes;

        // Calcular deuda global de choferes (Penalidades)
        const sqlDeudaChoferes = `
            SELECT COALESCE(SUM(monto_descuento_chofer - monto_cobrado), 0) AS total_deuda 
            FROM incidencia_viaje 
            WHERE estado = 1 
              AND monto_descuento_chofer IS NOT NULL 
              AND estado_cobro_penalidad IN ('Pendiente', 'Cobrado Parcial')
        `;
        const [rowsDeuda] = await db.query(sqlDeudaChoferes);
        const deudaChoferes = rowsDeuda[0].total_deuda;

        return res.status(200).json({ success: true, data: liquidaciones, pagadoMes: Number(pagadoMes), deudaChoferes: Number(deudaChoferes) });
    } catch (error) {
        console.error('Error al obtener liquidaciones pendientes:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

const liquidarViaje = async (req, res) => {
    let connection;
    try {
        const { id } = req.params; // id_viaje
        const id_usuario = req.headers['x-user-profile'];
        
        let { 
            monto_bruto, 
            total_adelantos, 
            total_penalidades, 
            monto_neto_pagado, 
            observaciones, 
            penalidades_descontadas,
            carrito_pagos // nuevo array
        } = req.body;

        if (!id_usuario) {
            return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
        }
        
        if (monto_neto_pagado < 0) {
            return res.status(400).json({ success: false, message: 'El monto neto no puede ser negativo' });
        }

        // Parsear JSONs si vienen de FormData
        if (typeof penalidades_descontadas === 'string') {
            try { penalidades_descontadas = JSON.parse(penalidades_descontadas); } catch (e) { penalidades_descontadas = []; }
        }
        if (typeof carrito_pagos === 'string') {
            try { carrito_pagos = JSON.parse(carrito_pagos); } catch (e) { carrito_pagos = []; }
        }

        // Validar formato y no-duplicidad del N° de operación (Efectivo no lo usa y
        // llega vacío/null; el resto de métodos sí lo requieren para conciliar).
        const regexOperacionLiq = /^[a-zA-Z0-9-]{1,15}$/;
        const operacionesEnEsteRequestLiq = new Set();
        if (carrito_pagos && carrito_pagos.length > 0) {
            for (const pago of carrito_pagos) {
                const nroOperacion = pago.numero_operacion ? String(pago.numero_operacion).trim() : '';
                if (!nroOperacion) continue;

                if (!regexOperacionLiq.test(nroOperacion)) {
                    return res.status(400).json({ success: false, message: `El N° de operación "${nroOperacion}" es inválido (solo letras, números y guiones, máximo 15 caracteres).` });
                }
                if (operacionesEnEsteRequestLiq.has(nroOperacion)) {
                    return res.status(400).json({ success: false, message: `El N° de operación "${nroOperacion}" está repetido entre los métodos de pago de esta liquidación.` });
                }
                operacionesEnEsteRequestLiq.add(nroOperacion);
            }
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        if (operacionesEnEsteRequestLiq.size > 0) {
            const [existentesLiq] = await connection.query(
                'SELECT id_detalle_pago FROM detalle_liquidacion_pago WHERE numero_operacion IN (?) LIMIT 1',
                [Array.from(operacionesEnEsteRequestLiq)]
            );
            if (existentesLiq.length > 0) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({ success: false, message: 'Uno de los N° de operación ingresados ya fue registrado en otra liquidación.' });
            }
        }

        // 1. Insertar en liquidacion_viaje (ahora sin detalles de pago)
        const sqlInsertLiquidacion = `
            INSERT INTO liquidacion_viaje 
            (id_viaje, id_usuario, monto_bruto, total_adelantos, total_penalidades, monto_neto_pagado, observaciones)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [resultLiq] = await connection.query(sqlInsertLiquidacion, [
            id, id_usuario, monto_bruto, total_adelantos, total_penalidades, monto_neto_pagado, observaciones || null
        ]);
        const id_liquidacion = resultLiq.insertId;

        // 2. Procesar Penalidades Descontadas
        if (penalidades_descontadas && penalidades_descontadas.length > 0) {
            for (let pen of penalidades_descontadas) {
                await connection.query(`
                    INSERT INTO detalle_liquidacion_penalidad (id_liquidacion, id_incidencia, monto_descontado)
                    VALUES (?, ?, ?)
                `, [id_liquidacion, pen.id_incidencia, pen.monto_descontado]);

                const [rowsInc] = await connection.query(
                    `SELECT monto_descuento_chofer, monto_cobrado FROM incidencia_viaje WHERE id_incidencia = ? FOR UPDATE`,
                    [pen.id_incidencia]
                );
                
                if (rowsInc.length > 0) {
                    const inc = rowsInc[0];
                    const nuevo_cobrado = Number(inc.monto_cobrado) + Number(pen.monto_descontado);
                    const deuda_total = Number(inc.monto_descuento_chofer);
                    let nuevo_estado = 'Cobrado Parcial';
                    if (nuevo_cobrado >= deuda_total - 0.01) nuevo_estado = 'Cobrado';

                    await connection.query(`
                        UPDATE incidencia_viaje 
                        SET monto_cobrado = ?, estado_cobro_penalidad = ? 
                        WHERE id_incidencia = ?
                    `, [nuevo_cobrado, nuevo_estado, pen.id_incidencia]);
                }
            }
        }

        // 3. Procesar Carrito de Pagos (Liquidaciones Mixtas)
        if (carrito_pagos && carrito_pagos.length > 0) {
            // Buscar la cuenta física por defecto
            const [cajaFisica] = await connection.query('SELECT id_cuenta FROM cuenta_bancaria WHERE es_sistema = 1 LIMIT 1');
            const id_caja_fisica = cajaFisica.length > 0 ? cajaFisica[0].id_cuenta : null;

            // Acumula lo ya comprometido por método/cuenta dentro de este mismo carrito, para
            // detectar el caso de dos líneas de pago que drenan la misma cuenta/billetera y en
            // conjunto superan su saldo (cada línea sola podría parecer válida).
            const saldosReservadosLiq = new Map();

            for (let i = 0; i < carrito_pagos.length; i++) {
                const pago = carrito_pagos[i];
                // Buscar si hay archivo para este indice
                const fileField = 'evidencia_' + i;
                const fileObj = (req.files || []).find(f => f.fieldname === fileField);
                const evidencia_url = fileObj ? fileObj.path : null;

                // 4. Resolver método de pago y validar fondos suficientes ANTES de mover el dinero.
                let id_cuenta_origen = null;
                let id_billetera_origen = null;

                if (pago.metodo_pago === 'Efectivo' || pago.metodo_pago === 'Depósito') {
                    id_cuenta_origen = id_caja_fisica;
                } else if (pago.metodo_pago === 'Transferencia') {
                    id_cuenta_origen = pago.id_cuenta;
                } else if (pago.metodo_pago === 'Billetera Digital') {
                    id_billetera_origen = pago.id_billetera;
                    // Buscar si tiene cuenta vinculada
                    const [billRows] = await connection.query('SELECT id_cuenta_vinculada FROM billetera_digital WHERE id_billetera = ?', [pago.id_billetera]);
                    if (billRows.length > 0 && billRows[0].id_cuenta_vinculada) {
                        id_cuenta_origen = billRows[0].id_cuenta_vinculada;
                    }
                }

                const montoPagoLinea = Number(pago.monto_pagado);
                const claveSaldo = id_cuenta_origen ? `cuenta:${id_cuenta_origen}` : (id_billetera_origen ? `billetera:${id_billetera_origen}` : null);

                if (claveSaldo) {
                    const saldoBase = await calcularSaldoDisponible(connection, id_cuenta_origen, id_billetera_origen);
                    const yaReservado = saldosReservadosLiq.get(claveSaldo) || 0;
                    const saldoRestante = Math.round((saldoBase - yaReservado) * 100) / 100;

                    if (saldoRestante < montoPagoLinea) {
                        await connection.rollback();
                        connection.release();
                        return res.status(400).json({
                            success: false,
                            message: `Fondos Insuficientes: el método de pago "${pago.metodo_pago}" del pago #${i + 1} solo tiene S/ ${saldoRestante.toFixed(2)} disponible.`
                        });
                    }

                    saldosReservadosLiq.set(claveSaldo, yaReservado + montoPagoLinea);
                }

                // Insertar en detalle_pago
                await connection.query(`
                    INSERT INTO detalle_liquidacion_pago
                    (id_liquidacion, metodo_pago, id_cuenta, id_billetera, monto_pagado, numero_operacion, evidencia_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    id_liquidacion,
                    pago.metodo_pago,
                    pago.id_cuenta || null,
                    pago.id_billetera || null,
                    pago.monto_pagado,
                    pago.numero_operacion || null,
                    evidencia_url
                ]);

                const conceptoLibro = `Liquidación de viaje #${id} (${pago.metodo_pago})`;
                await connection.query(`
                    INSERT INTO movimiento_caja 
                    (tipo_movimiento, concepto, monto, metodo_pago, id_cuenta_origen, id_billetera_origen, id_cuenta_destino, id_billetera_destino, modulo_origen, id_registro_origen, numero_operacion, id_usuario)
                    VALUES ('EGRESO', ?, ?, ?, ?, ?, NULL, NULL, 'LIQUIDACION', ?, ?, ?)
                `, [
                    conceptoLibro,
                    pago.monto_pagado,
                    pago.metodo_pago,
                    id_cuenta_origen,
                    id_billetera_origen,
                    id_liquidacion,
                    pago.numero_operacion || null,
                    id_usuario
                ]);
            }
        }

        // 5. Marcar viaje como Liquidado
        await connection.query(`
            UPDATE viaje 
            SET estado_pagos = 'Liquidado' 
            WHERE id_viaje = ?
        `, [id]);

        await connection.commit();
        
        return res.status(200).json({ success: true, message: 'Liquidación registrada con éxito', id_liquidacion });
        
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error al liquidar viaje:', error);
        
        if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage && error.sqlMessage.includes('numero_operacion')) {
            return res.status(400).json({ success: false, message: 'Ese N° de operación ya fue registrado en otra liquidación (detectado al guardar).' });
        }

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Este viaje ya ha sido liquidado anteriormente.' });
        }

        return res.status(500).json({ success: false, message: 'Error interno del servidor al procesar la liquidación' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

const obtenerHistorialLiquidaciones = async (req, res) => {
    try {
        const sql = `
            SELECT 
                l.id_liquidacion,
                DATE_FORMAT(l.fecha_liquidacion, '%Y-%m-%d · %H:%i:%s') AS fecha,
                l.monto_bruto,
                l.total_adelantos,
                l.total_penalidades,
                l.monto_neto_pagado,
                c.nombre AS camion_modelo,
                c.placa AS camion_placa,
                c.conductor AS chofer_nombre,
                c.numero_documento AS chofer_dni,
                c.id_camion,
                v.id_viaje,
                v.tarifa_transportista,
                CONCAT(ro.ciudad_origen, ' - ', ro.ciudad_destino) AS ruta,
                
                -- Calcular el peso total en kg
                (
                    SELECT COALESCE(SUM(dc.peso_total), 0)
                    FROM carga cg
                    JOIN detalle_carga dc ON cg.id_carga = dc.id_carga
                    WHERE cg.id_viaje = v.id_viaje AND cg.estado = 1 AND dc.estado = 1
                ) AS total_peso,

                -- Extraer las penalidades como un JSON array
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'incidencia', i.tipo_incidencia, 
                            'monto', dlp.monto_descontado
                        )
                    )
                    FROM detalle_liquidacion_penalidad dlp
                    JOIN incidencia_viaje i ON dlp.id_incidencia = i.id_incidencia
                    WHERE dlp.id_liquidacion = l.id_liquidacion
                ) AS detalle_penalidades,
                
                -- Extraer los pagos mixtos como un JSON array
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'metodo_pago', dlpago.metodo_pago,
                            'monto_pagado', dlpago.monto_pagado,
                            'numero_operacion', dlpago.numero_operacion,
                            'evidencia_url', dlpago.evidencia_url
                        )
                    )
                    FROM detalle_liquidacion_pago dlpago
                    WHERE dlpago.id_liquidacion = l.id_liquidacion
                ) AS pagos
                
            FROM liquidacion_viaje l
            JOIN viaje v ON l.id_viaje = v.id_viaje
            JOIN camiones c ON v.id_camion = c.id_camion
            JOIN rutas ro ON v.id_ruta = ro.id_ruta
            WHERE l.estado = 1
            ORDER BY l.fecha_liquidacion DESC
        `;

        const [rows] = await db.query(sql);

        // Mapear el JSON array si la BD devuelve un string
        const historial = rows.map(row => {
            let penalidadesParsed = [];
            if (row.detalle_penalidades) {
                try {
                    penalidadesParsed = typeof row.detalle_penalidades === 'string' 
                        ? JSON.parse(row.detalle_penalidades) 
                        : row.detalle_penalidades;
                } catch(e) {}
            }
            
            let pagosParsed = [];
            if (row.pagos) {
                try {
                    pagosParsed = typeof row.pagos === 'string' 
                        ? JSON.parse(row.pagos) 
                        : row.pagos;
                } catch(e) {}
            }
            
            return {
                ...row,
                detalle_penalidades: penalidadesParsed,
                pagos: pagosParsed
            };
        });

        return res.status(200).json({ success: true, data: historial });
    } catch (error) {
        console.error('Error al obtener historial de liquidaciones:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

const cerrarViaje = async (req, res) => {
    try {
        const idViaje = req.params.id;
        
        // Verificar si existe y si está en estado Descargado (o Incidencia)
        const sqlCheck = `SELECT estado_operativo FROM Viaje WHERE id_viaje = ?`;
        const [rows] = await db.query(sqlCheck, [idViaje]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Viaje no encontrado.' });
        }
        
        const estado = rows[0].estado_operativo;
        if (estado === 'Finalizado') {
            return res.status(400).json({ success: false, message: 'El viaje ya se encuentra finalizado.' });
        }
        
        if (estado !== 'Descargado' && estado !== 'Incidencia') {
            return res.status(400).json({ success: false, message: 'Solo se pueden finalizar viajes cuyo estado sea Descargado o Incidencia.' });
        }

        const sqlUpdate = `
            UPDATE Viaje 
            SET estado_operativo = 'Finalizado' 
            WHERE id_viaje = ?
        `;
        await db.query(sqlUpdate, [idViaje]);
        
        return res.status(200).json({ success: true, message: 'Viaje finalizado correctamente. Ya no se pueden registrar incidencias.' });
    } catch (error) {
        console.error('Error al cerrar viaje:', error);
        return res.status(500).json({ success: false, message: 'Error interno al finalizar el viaje.' });
    }
};

module.exports = {
    registrarViaje,
    obtenerHistorialViajes,
    obtenerCargasPorViaje,
    obtenerCargasPendientesAlmacen,
    obtenerViajesRecepcion,
    marcarLlegadaViaje,
    entregarCarga,
    entregaParcialCarga,
    obtenerViajePorId,
    rechazarCarga,
    confirmarTransbordo,
    obtenerIncidenciasViaje,
    registrarIncidenciaViaje,
    registrarAdelantoViaje,
    obtenerLiquidacionesPendientes,
    liquidarViaje,
    obtenerHistorialLiquidaciones,
    obtenerAdelantosViaje,
    cerrarViaje
};
