const db = require('../config/db');
const { cloudinary } = require('../config/cloudinary');

const registrarViaje = async (req, res) => {
    let connection;
    try {
        let { camion, ruta, flete_global, tarifa_transportista, fecha_salida, cargas, tiene_adelanto, monto_adelanto, metodo_adelanto, numero_operacion } = req.body;
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
            const sqlAdelanto = `
                INSERT INTO adelantos_viaje (id_viaje, id_usuario, monto, metodo_entrega, numero_operacion, evidencia_url, motivo_referencial)
                VALUES (?, ?, ?, ?, ?, ?, 'Viáticos iniciales')
            `;
            await connection.query(sqlAdelanto, [
                idViajeInsertado,
                userId,
                Number(monto_adelanto),
                metodo_adelanto || 'Efectivo',
                numero_operacion || null,
                evidencia_url || null
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
                (SELECT COUNT(*) FROM Detalle_Carga dc JOIN Carga c ON dc.id_carga = c.id_carga WHERE c.id_viaje = v.id_viaje AND dc.estado_operativo = 'Rechazado' AND dc.estado != 2) as productos_rechazados,
                (SELECT COUNT(*) FROM Incidencia_Viaje iv WHERE iv.id_viaje = v.id_viaje AND iv.estado = 1) > 0 as tiene_incidencia_reportada
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
                dc.precio_peso, dc.flete_subtotal, dc.estado_operativo
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
        
        let viajeFinalizado = false;
        
        if (checkRows[0].pendientes === 0) {
            // 4. Si todas están entregadas/rechazadas, el viaje finaliza
            const sqlUpdateViaje = `
                UPDATE Viaje 
                SET estado_operativo = 'Finalizado' 
                WHERE id_viaje = ?
            `;
            await connection.query(sqlUpdateViaje, [idViaje]);
            viajeFinalizado = true;
        }
        
        await connection.commit();
        connection.release();
        
        return res.status(200).json({ 
            success: true, 
            message: 'Carga marcada como entregada.',
            viajeFinalizado: viajeFinalizado
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
                    INSERT INTO Detalle_Carga (id_carga, id_producto, marca_visual, cantidad_sacos, peso_unitario, peso_total, precio_peso, flete_subtotal, estado_operativo)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Rechazado')
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
                    SET cantidad_sacos = ?, peso_total = ?, flete_subtotal = ?, estado_operativo = 'Rechazado'
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
        
        let viajeFinalizado = false;
        
        if (checkRows[0].pendientes === 0) {
            const sqlUpdateViaje = `
                UPDATE Viaje 
                SET estado_operativo = 'Finalizado' 
                WHERE id_viaje = ?
            `;
            await connection.query(sqlUpdateViaje, [cargaOriginal.id_viaje]);
            viajeFinalizado = true;
        }

        await connection.commit();
        connection.release();

        res.status(200).json({ 
            success: true, 
            message: 'Entrega parcial procesada correctamente.',
            viajeFinalizado: viajeFinalizado
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
            SET estado_operativo = 'Rechazado'
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
        
        let viajeFinalizado = false;
        
        if (checkRows[0].pendientes === 0) {
            // 4. Si todas están entregadas, el viaje finaliza
            const sqlUpdateViaje = `
                UPDATE Viaje 
                SET estado_operativo = 'Finalizado' 
                WHERE id_viaje = ?
            `;
            await connection.query(sqlUpdateViaje, [idViaje]);
            viajeFinalizado = true;
        }
        
        await connection.commit();
        connection.release();
        
        return res.status(200).json({ 
            success: true, 
            message: 'Carga marcada como entregada.',
            viajeFinalizado: viajeFinalizado
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
                        SET estado_operativo = 'Siniestrado' 
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
                        SET cantidad_sacos = ?, peso_total = ?, flete_subtotal = ?, estado_operativo = 'Siniestrado' 
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
                u.usuario as usuario_registro
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
    try {
        const idViaje = req.params.id;
        const { monto, metodo_entrega, motivo_referencial, numero_operacion } = req.body;
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

        await db.query(`
            INSERT INTO adelantos_viaje (id_viaje, id_usuario, monto, metodo_entrega, numero_operacion, evidencia_url, motivo_referencial, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `, [
            idViaje, 
            userId, 
            montoNumber, 
            metodo_entrega, 
            numero_operacion || null, 
            evidencia_url, 
            motivo_referencial || null
        ]);

        return res.json({ success: true, message: 'Adelanto registrado correctamente.' });
    } catch (error) {
        console.error('Error al registrar adelanto:', error);
        return res.status(500).json({ success: false, message: 'Error de servidor al registrar el adelanto.' });
    }
};

const registrarIncidenciaViaje = async (req, res) => {
    try {
        const idViaje = req.params.id;
        const {
            tipo_incidencia,
            descripcion_detallada,
            valor_total_perdida,
            gastos_adicionales,
            adelanto_recuperar,
            monto_descuento_chofer,
            monto_asumido_empresa
        } = req.body;
        
        const userId = req.headers['x-user-profile'] || 1; // Ajustar según tu autenticación

        // Basic validation
        if (!tipo_incidencia || !descripcion_detallada) {
            return res.status(400).json({ success: false, message: 'Faltan datos obligatorios para la incidencia' });
        }

        const perdida = Number(valor_total_perdida) || 0;
        const gastos = Number(gastos_adicionales) || 0;
        const adelanto = Number(adelanto_recuperar) || 0;
        const descuento = monto_descuento_chofer !== '' && monto_descuento_chofer !== null ? Number(monto_descuento_chofer) : 0;
        const empresa = monto_asumido_empresa !== '' && monto_asumido_empresa !== null ? Number(monto_asumido_empresa) : 0;

        // Validar el Remanente
        const sqlRemanente = `
            SELECT 
                (SELECT COALESCE(SUM(flete_total), 0) FROM Carga WHERE id_viaje = ? AND estado_entrega IN ('Rechazado', 'Siniestrado') AND estado = 1) AS perdida_total_cargas,
                (SELECT COALESCE(SUM(valor_total_perdida), 0) FROM Incidencia_Viaje WHERE id_viaje = ? AND estado = 1) AS perdida_ya_registrada
        `;
        const [rows] = await db.query(sqlRemanente, [idViaje, idViaje]);
        const maxPerdidaPosible = Number(rows[0].perdida_total_cargas) || 0;
        const perdidaYaRegistrada = Number(rows[0].perdida_ya_registrada) || 0;
        const remanente = maxPerdidaPosible - perdidaYaRegistrada;

        if (perdida > remanente + 0.01) {
            return res.status(400).json({ success: false, message: 'El monto de pérdida supera el saldo disponible para este viaje.' });
        }

        const totalRepartir = perdida + gastos + adelanto;
        // Evitar problemas de precisión con decimales
        if (Math.abs(totalRepartir - (descuento + empresa)) > 0.01) {
            return res.status(400).json({ success: false, message: 'Los montos de descuento y asunción deben cubrir el 100% del costo del incidente y adelantos.' });
        }

        const sql = `
            INSERT INTO Incidencia_Viaje 
            (id_viaje, tipo_incidencia, descripcion_detallada, valor_total_perdida, gastos_adicionales, adelanto_recuperar, monto_asumido_empresa, monto_descuento_chofer, id_usuario, estado_cobro_penalidad, monto_cobrado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', 0.00)
        `;

        await db.query(sql, [
            idViaje,
            tipo_incidencia,
            descripcion_detallada,
            perdida,
            gastos,
            adelanto,
            empresa, 
            descuento, 
            userId
        ]);

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
                ) AS penalidades
                
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
                id: row.id_viaje, // Usamos el id_viaje como id de liquidación
                id_camion: row.id_camion,
                chofer_nombre: row.chofer_nombre,
                chofer_dni: row.chofer_dni,
                camion_placa: row.camion_placa,
                camion_modelo: row.camion_modelo,
                viaje_num: row.id_viaje,
                ruta: row.ruta,
                salida: row.salida || 'Sin fecha',
                llegada: row.llegada || 'Sin fecha',
                monto_bruto: monto_bruto,
                tarifa_transportista: Number(row.tarifa_transportista),
                total_peso: Number(row.total_peso),
                adelanto: Number(row.adelanto),
                penalidades: Number(row.penalidades),
                neto_pagar: neto_pagar
            };
        });

        // Calcular pagado este mes
        const sqlPagadoMes = `
            SELECT COALESCE(SUM(monto_neto_pagado), 0) AS total_pagado_mes 
            FROM liquidacion_viaje 
            WHERE MONTH(fecha_liquidacion) = MONTH(CURRENT_DATE()) 
              AND YEAR(fecha_liquidacion) = YEAR(CURRENT_DATE())
              AND estado = 1
        `;
        const [rowsPagado] = await db.query(sqlPagadoMes);
        const pagadoMes = rowsPagado[0].total_pagado_mes;

        return res.status(200).json({ success: true, data: liquidaciones, pagadoMes: Number(pagadoMes) });
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
            metodo_pago, 
            numero_operacion,
            observaciones, 
            penalidades_descontadas 
        } = req.body;

        const evidencia_url = req.file ? req.file.path : null;

        if (!id_usuario) {
            return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
        }
        
        if (monto_neto_pagado < 0) {
            return res.status(400).json({ success: false, message: 'El monto neto no puede ser negativo' });
        }

        // Parsear penalidades si viene de FormData
        if (typeof penalidades_descontadas === 'string') {
            try {
                penalidades_descontadas = JSON.parse(penalidades_descontadas);
            } catch (e) {
                penalidades_descontadas = [];
            }
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Insertar en liquidacion_viaje
        const sqlInsertLiquidacion = `
            INSERT INTO liquidacion_viaje 
            (id_viaje, id_usuario, monto_bruto, total_adelantos, total_penalidades, monto_neto_pagado, metodo_pago, numero_operacion, evidencia_url, observaciones)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [resultLiq] = await connection.query(sqlInsertLiquidacion, [
            id, id_usuario, monto_bruto, total_adelantos, total_penalidades, monto_neto_pagado, metodo_pago, numero_operacion || null, evidencia_url, observaciones || null
        ]);
        
        const id_liquidacion = resultLiq.insertId;

        // 2 & 3. Procesar Penalidades Descontadas
        if (penalidades_descontadas && penalidades_descontadas.length > 0) {
            for (let pen of penalidades_descontadas) {
                // Insertar detalle_liquidacion_penalidad
                await connection.query(`
                    INSERT INTO detalle_liquidacion_penalidad (id_liquidacion, id_incidencia, monto_descontado)
                    VALUES (?, ?, ?)
                `, [id_liquidacion, pen.id_incidencia, pen.monto_descontado]);

                // Actualizar incidencia_viaje
                // Necesitamos el monto_cobrado actual y monto_descuento_chofer para actualizar estado
                const [rowsInc] = await connection.query(
                    `SELECT monto_descuento_chofer, monto_cobrado FROM incidencia_viaje WHERE id_incidencia = ? FOR UPDATE`,
                    [pen.id_incidencia]
                );
                
                if (rowsInc.length > 0) {
                    const inc = rowsInc[0];
                    const nuevo_cobrado = Number(inc.monto_cobrado) + Number(pen.monto_descontado);
                    const deuda_total = Number(inc.monto_descuento_chofer);
                    
                    let nuevo_estado = 'Cobrado Parcial';
                    // Deuda saldada (usamos una tolerancia mínima por decimales si es necesario, o >= )
                    if (nuevo_cobrado >= deuda_total - 0.01) {
                        nuevo_estado = 'Cobrado';
                    }

                    await connection.query(`
                        UPDATE incidencia_viaje 
                        SET monto_cobrado = ?, estado_cobro_penalidad = ? 
                        WHERE id_incidencia = ?
                    `, [nuevo_cobrado, nuevo_estado, pen.id_incidencia]);
                }
            }
        }

        // 4. Marcar viaje como Liquidado
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

        // Revertir imagen de Cloudinary si hubo error
        if (req.file && req.file.filename) {
            try {
                await cloudinary.uploader.destroy(req.file.filename);
                console.log(`[Reversión] Imagen huérfana eliminada: ${req.file.filename}`);
            } catch (cloudErr) {
                console.error("Error al eliminar imagen de Cloudinary:", cloudErr);
            }
        }

        console.error('Error al liquidar viaje:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Este viaje ya ha sido liquidado anteriormente.' });
        }
        
        return res.status(500).json({ success: false, message: 'Error interno al procesar la liquidación.' });
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
                l.metodo_pago,
                l.numero_operacion,
                l.evidencia_url,
                l.observaciones,
                c.nombre AS camion_modelo,
                c.placa AS camion_placa,
                c.conductor AS chofer_nombre,
                c.numero_documento AS chofer_dni,
                v.id_viaje,
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

                -- Extraer adelantos como un JSON array
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'monto', a.monto,
                            'fecha', DATE_FORMAT(a.fecha_registro, '%Y-%m-%d'),
                            'metodo', a.metodo_entrega
                        )
                    )
                    FROM adelantos_viaje a
                    WHERE a.id_viaje = l.id_viaje AND a.estado = 1
                ) AS detalle_adelantos

                
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

            let adelantosParsed = [];
            if (row.detalle_adelantos) {
                try {
                    adelantosParsed = typeof row.detalle_adelantos === 'string' 
                        ? JSON.parse(row.detalle_adelantos) 
                        : row.detalle_adelantos;
                } catch(e) {}
            }
            
            return {
                ...row,
                detalle_penalidades: penalidadesParsed,
                detalle_adelantos: adelantosParsed
            };
        });

        return res.status(200).json({ success: true, data: historial });
    } catch (error) {
        console.error('Error al obtener historial de liquidaciones:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

module.exports = {
    registrarViaje,
    obtenerHistorialViajes,
    obtenerCargasPorViaje,
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
    obtenerAdelantosViaje
};
