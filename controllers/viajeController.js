const db = require('../config/db');

const registrarViaje = async (req, res) => {
    let connection;
    try {
        const { camion, ruta, flete_global, tarifa_transportista, fecha_salida, cargas } = req.body;
        const userId = req.headers['x-user-profile'] || 1; // Ajustar según tu autenticación

        // Validaciones básicas
        if (!camion || !ruta || !flete_global || !tarifa_transportista || !fecha_salida) {
            return res.status(400).json({ success: false, message: 'Faltan datos obligatorios del viaje' });
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
        const sql = `
            SELECT 
                v.id_viaje,
                v.fecha_salida,
                v.fecha_llegada,
                v.tarifa_transportista,
                v.estado_operativo,
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
                (SELECT COALESCE(SUM(flete_total), 0) FROM Carga WHERE id_viaje = v.id_viaje AND estado != 2) as flete_total
            FROM Viaje v
            JOIN Camiones c ON v.id_camion = c.id_camion
            JOIN rutas r ON v.id_ruta = r.id_ruta
            LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
            LEFT JOIN Carga cg ON v.id_viaje = cg.id_viaje AND cg.estado != 2
            LEFT JOIN Detalle_Carga dc ON cg.id_carga = dc.id_carga AND dc.estado != 2
            WHERE v.estado != 2
            GROUP BY v.id_viaje
            ORDER BY v.fecha_salida DESC
        `;
        
        const [viajes] = await db.query(sql);
        
        return res.status(200).json({ success: true, data: viajes });
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
                dc.precio_peso, dc.flete_subtotal
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
        
        // 2. Actualizar estado de la carga
        const sqlUpdateCarga = `
            UPDATE Carga
            SET estado_entrega = 'Entregado'
            WHERE id_carga = ?
        `;
        
        const [result] = await connection.query(sqlUpdateCarga, [idCarga]);
        
        // 3. Verificar si quedan cargas pendientes de entrega (ignorando Entregado y Rechazado)
        const sqlCheckAll = `
            SELECT COUNT(*) AS pendientes 
            FROM Carga 
            WHERE id_viaje = ? AND estado_entrega NOT IN ('Entregado', 'Rechazado') AND estado != 2
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

const entregaParcialCarga = async (req, res) => {
    let connection;
    try {
        const idCargaOriginal = req.params.id;
        const { productosAceptados, productosRechazados } = req.body;
        const userId = req.headers['x-user-profile'] || 1;

        if (!productosAceptados || !productosRechazados) {
            return res.status(400).json({ success: false, message: 'Datos incompletos para entrega parcial' });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [cargaRows] = await connection.query(`SELECT * FROM Carga WHERE id_carga = ? AND estado != 2`, [idCargaOriginal]);
        if (cargaRows.length === 0) throw new Error('Carga original no encontrada');
        const cargaOriginal = cargaRows[0];

        // FASE 1: Nueva Carga (Aceptados)
        if (productosAceptados.length > 0) {
            const [resultNuevaCarga] = await connection.query(`
                INSERT INTO Carga (id_viaje, id_remitente, id_destinatario, flete_total, estado_cobro, estado_entrega, id_usuario)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                cargaOriginal.id_viaje,
                cargaOriginal.id_remitente,
                cargaOriginal.id_destinatario,
                0.00,
                'Pendiente',
                'Entregado',
                userId
            ]);
            const idNuevaCarga = resultNuevaCarga.insertId;

            let nuevoFleteTotal = 0;

            for (const prod of productosAceptados) {
                const [detRows] = await connection.query(`SELECT * FROM Detalle_Carga WHERE id_detalle = ?`, [prod.id_detalle]);
                if (detRows.length > 0) {
                    const detOriginal = detRows[0];
                    const nuevaCantidad = Number(prod.cantidad);
                    const nuevoPesoTotal = nuevaCantidad * Number(detOriginal.peso_unitario);
                    const nuevoFleteSubtotal = nuevoPesoTotal * Number(detOriginal.precio_peso);
                    
                    nuevoFleteTotal += nuevoFleteSubtotal;

                    await connection.query(`
                        INSERT INTO Detalle_Carga (id_carga, id_producto, marca_visual, cantidad_sacos, peso_unitario, peso_total, precio_peso, flete_subtotal)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        idNuevaCarga,
                        detOriginal.id_producto,
                        detOriginal.marca_visual,
                        nuevaCantidad,
                        detOriginal.peso_unitario,
                        nuevoPesoTotal,
                        detOriginal.precio_peso,
                        nuevoFleteSubtotal
                    ]);
                }
            }

            await connection.query(`UPDATE Carga SET flete_total = ? WHERE id_carga = ?`, [nuevoFleteTotal, idNuevaCarga]);
        }

        // FASE 2: Vieja Carga (Rechazados)
        let fleteOriginalRestante = 0;
        
        const [detallesOriginales] = await connection.query(`SELECT * FROM Detalle_Carga WHERE id_carga = ? AND estado != 2`, [idCargaOriginal]);
        
        for (const det of detallesOriginales) {
            const prodRechazado = productosRechazados.find(p => p.id_detalle == det.id_detalle);
            const cantRechazada = prodRechazado ? Number(prodRechazado.cantidad) : 0;
            
            if (cantRechazada > 0) {
                const nuevoPesoTotal = cantRechazada * Number(det.peso_unitario);
                const nuevoFleteSubtotal = nuevoPesoTotal * Number(det.precio_peso);
                fleteOriginalRestante += nuevoFleteSubtotal;
                
                await connection.query(`
                    UPDATE Detalle_Carga 
                    SET cantidad_sacos = ?, peso_total = ?, flete_subtotal = ? 
                    WHERE id_detalle = ?
                `, [cantRechazada, nuevoPesoTotal, nuevoFleteSubtotal, det.id_detalle]);
            } else {
                await connection.query(`UPDATE Detalle_Carga SET estado = 2 WHERE id_detalle = ?`, [det.id_detalle]);
            }
        }

        await connection.query(`
            UPDATE Carga 
            SET flete_total = ?, estado_entrega = 'Rechazado', estado_cobro = 'Anulado' 
            WHERE id_carga = ?
        `, [fleteOriginalRestante, idCargaOriginal]);

        // Verificar si quedan cargas pendientes para finalizar el viaje
        const sqlCheckAll = `
            SELECT COUNT(*) AS pendientes 
            FROM Carga 
            WHERE id_viaje = ? AND estado_entrega NOT IN ('Entregado', 'Rechazado') AND estado != 2
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
        
        const sqlUpdateCarga = `
            UPDATE Carga
            SET estado_entrega = 'Rechazado', estado_cobro = 'Anulado'
            WHERE id_carga = ?
        `;
        await connection.query(sqlUpdateCarga, [idCarga]);
        
        const sqlCheckAll = `
            SELECT COUNT(*) AS pendientes 
            FROM Carga 
            WHERE id_viaje = ? AND estado_entrega NOT IN ('Entregado', 'Rechazado') AND estado != 2
        `;
        const [checkRows] = await connection.query(sqlCheckAll, [idViaje]);
        
        let viajeFinalizado = false;
        if (checkRows[0].pendientes === 0) {
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
            message: 'Carga rechazada.',
            viajeFinalizado: viajeFinalizado
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Error en rechazarCarga:', error);
        return res.status(500).json({ success: false, message: 'Error interno al rechazar carga.' });
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
    rechazarCarga
};
