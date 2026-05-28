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

module.exports = {
    registrarViaje
};
