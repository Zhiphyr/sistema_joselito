const db = require('../config/db');

class RutaModel {

    static async obtenerRutas() {
        const query = `
            SELECT id_ruta, ciudad_origen, ciudad_destino, descripcion, estado,
                   fecha_creacion, fecha_actualizacion
            FROM rutas
            WHERE estado IN (0, 1)
            ORDER BY id_ruta ASC
        `;
        const [rows] = await db.query(query);
        return rows;
    }

    static async obtenerRutaPorId(id_ruta) {
        const query = `SELECT * FROM rutas WHERE id_ruta = ?`;
        const [rows] = await db.query(query, [id_ruta]);
        return rows[0];
    }

    static async findByOrigenDestino(ciudad_origen, ciudad_destino) {
        const query = `
            SELECT * FROM rutas 
            WHERE UPPER(ciudad_origen) = UPPER(?) AND UPPER(ciudad_destino) = UPPER(?)
        `;
        const [rows] = await db.query(query, [ciudad_origen, ciudad_destino]);
        return rows[0];
    }

    static async registrarRuta(datos) {
        const { ciudad_origen, ciudad_destino, descripcion } = datos;
        const query = `
            INSERT INTO rutas (ciudad_origen, ciudad_destino, descripcion)
            VALUES (UPPER(?), UPPER(?), ?)
        `;
        const [result] = await db.query(query, [ciudad_origen, ciudad_destino, descripcion]);
        return result.insertId;
    }

    static async actualizarRuta(id_ruta, datos) {
        const { descripcion } = datos;
        const query = `
            UPDATE rutas
            SET descripcion = ?
            WHERE id_ruta = ?
        `;
        const [result] = await db.query(query, [descripcion, id_ruta]);
        return result.affectedRows;
    }

    static async reactivarRuta(id_ruta, datos) {
        const { descripcion } = datos;
        const query = `
            UPDATE rutas
            SET estado = 1, descripcion = ?
            WHERE id_ruta = ?
        `;
        const [result] = await db.query(query, [descripcion, id_ruta]);
        return result.affectedRows;
    }

    static async cambiarEstadoRuta(id_ruta, estado) {
        const query = `UPDATE rutas SET estado = ? WHERE id_ruta = ?`;
        const [result] = await db.query(query, [estado, id_ruta]);
        return result.affectedRows;
    }

    static async tieneViajesActivos(id_ruta) {
        const query = `
            SELECT COUNT(*) as activeCount 
            FROM viaje 
            WHERE id_ruta = ? 
            AND estado_operativo IN ('En Ruta', 'Llegó a Destino', 'Descargado', 'Incidencia') 
            AND estado = 1
        `;
        const [rows] = await db.query(query, [id_ruta]);
        return rows[0].activeCount > 0;
    }
}

module.exports = RutaModel;
