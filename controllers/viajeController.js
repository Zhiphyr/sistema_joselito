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
                IF(v.fecha_llegada IS NULL, 'En Ruta', 'Llegó a Destino') as estado_operativo,
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
                c.id_carga, 
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
                dc.id_carga, p.nombre AS producto, dc.marca_visual, 
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

module.exports = {
    registrarViaje,
    obtenerHistorialViajes,
    obtenerCargasPorViaje
};
