const db = require('../config/db');

class IncidenciaModel {

    // Catálogo de tipos de incidencia (Robo, Malogrado, Faltante, Otro)
    static async obtenerTipos() {
        const query = `SELECT id_tipo, nombre, afecta_default, estado FROM tipos_incidencia WHERE estado IN (0,1) ORDER BY id_tipo ASC`;
        const [rows] = await db.query(query);
        return rows;
    }

    static async registrarTipo(datos) {
        const { nombre, afecta_default } = datos;
        const query = `INSERT INTO tipos_incidencia (nombre, afecta_default) VALUES (?, ?)`;
        const [result] = await db.query(query, [nombre, afecta_default || 'Empresa']);
        return result.insertId;
    }

    static async actualizarTipo(id_tipo, datos) {
        const { nombre, afecta_default } = datos;
        const query = `UPDATE tipos_incidencia SET nombre = ?, afecta_default = ? WHERE id_tipo = ?`;
        const [result] = await db.query(query, [nombre, afecta_default, id_tipo]);
        return result.affectedRows;
    }

    static async cambiarEstadoTipo(id_tipo, estado) {
        const query = `UPDATE tipos_incidencia SET estado = ? WHERE id_tipo = ?`;
        const [result] = await db.query(query, [estado, id_tipo]);
        return result.affectedRows;
    }

    // Lista de incidencias registradas con info de carga y viaje
    static async obtenerIncidencias() {
        const query = `
            SELECT 
                i.id_incidencia, i.id_carga, i.monto_afectado, i.afecta_a, i.descripcion, i.fecha,
                t.nombre AS tipo,
                ca.id_viaje,
                cam.placa AS vehiculo,
                rem.nombre_razon_social AS remitente,
                dest.nombre_razon_social AS destinatario,
                u.nombre AS usuario
            FROM incidencias i
            JOIN tipos_incidencia t ON i.id_tipo = t.id_tipo
            JOIN carga ca ON i.id_carga = ca.id_carga
            JOIN viaje v ON ca.id_viaje = v.id_viaje
            JOIN camiones cam ON v.id_camion = cam.id_camion
            JOIN clientes rem ON ca.id_remitente = rem.id_cliente
            JOIN clientes dest ON ca.id_destinatario = dest.id_cliente
            JOIN usuarios u ON i.id_usuario = u.id_usuario
            WHERE i.estado = 1
            ORDER BY i.id_incidencia DESC
        `;
        const [rows] = await db.query(query);
        return rows;
    }

    // Viajes disponibles para registrar incidencias (no eliminados)
    static async obtenerViajesConCargas() {
        const query = `
            SELECT 
                v.id_viaje, v.estado_operativo, v.fecha_salida,
                cam.placa AS vehiculo, cam.conductor AS chofer,
                r.ciudad_origen, r.ciudad_destino,
                COUNT(ca.id_carga) AS total_cargas
            FROM viaje v
            JOIN camiones cam ON v.id_camion = cam.id_camion
            JOIN rutas r ON v.id_ruta = r.id_ruta
            LEFT JOIN carga ca ON v.id_viaje = ca.id_viaje AND ca.estado != 2
            WHERE v.estado != 2
            GROUP BY v.id_viaje
            HAVING total_cargas > 0
            ORDER BY v.fecha_salida DESC
        `;
        const [rows] = await db.query(query);
        return rows;
    }

    // Cargas de un viaje específico (para marcar cuáles tuvieron incidencia)
    static async obtenerCargasDeViaje(id_viaje) {
        const query = `
            SELECT 
                ca.id_carga, ca.flete_total,
                rem.nombre_razon_social AS remitente,
                dest.nombre_razon_social AS destinatario,
                COALESCE((SELECT SUM(dc.peso_total) FROM detalle_carga dc WHERE dc.id_carga = ca.id_carga AND dc.estado != 2), 0) AS peso_total
            FROM carga ca
            JOIN clientes rem ON ca.id_remitente = rem.id_cliente
            JOIN clientes dest ON ca.id_destinatario = dest.id_cliente
            WHERE ca.id_viaje = ? AND ca.estado != 2
            ORDER BY ca.id_carga ASC
        `;
        const [rows] = await db.query(query, [id_viaje]);
        return rows;
    }

    // Registro INDIVIDUAL de una incidencia
    static async registrarIncidencia(datos) {
        const { id_carga, id_tipo, afecta_a, monto_afectado, descripcion, fecha, id_usuario } = datos;
        const query = `
            INSERT INTO incidencias (id_carga, id_tipo, afecta_a, monto_afectado, descripcion, fecha, id_usuario)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.query(query, [id_carga, id_tipo, afecta_a, monto_afectado, descripcion || null, fecha, id_usuario]);
        return result.insertId;
    }

    /**
     * Registro MASIVO: una sola descripción/tipo/fecha aplicada a varias cargas.
     * `items` = [{ id_carga, monto_afectado }, ...]
     * Hace el bucle de INSERT INTO incidencias dentro de una transacción.
     */
    static async registrarIncidenciaMasiva(datos) {
        const { items, id_tipo, afecta_a, descripcion, fecha, id_usuario } = datos;
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            let insertados = 0;
            for (const item of items) {
                await connection.query(
                    `INSERT INTO incidencias (id_carga, id_tipo, afecta_a, monto_afectado, descripcion, fecha, id_usuario)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [item.id_carga, id_tipo, afecta_a, item.monto_afectado, descripcion || null, fecha, id_usuario]
                );
                insertados++;
            }

            await connection.commit();
            return insertados;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async anularIncidencia(id_incidencia) {
        const query = `UPDATE incidencias SET estado = 0 WHERE id_incidencia = ?`;
        const [result] = await db.query(query, [id_incidencia]);
        return result.affectedRows;
    }
}

module.exports = IncidenciaModel;
