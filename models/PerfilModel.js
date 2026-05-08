const db = require('../config/db');

class PerfilModel {
    static async obtenerPerfiles() {
        const query = `
            SELECT id_perfil, nombre, descripcion, estado
            FROM perfiles
            WHERE estado IN (0, 1) AND id_perfil != 1
            ORDER BY id_perfil ASC
        `;
        const [rows] = await db.query(query);
        return rows;
    }

    static async crearPerfil(datos) {
        const { nombre, descripcion } = datos;
        const query = `INSERT INTO perfiles (nombre, descripcion) VALUES (?, ?)`;
        const [result] = await db.query(query, [nombre, descripcion]);
        return result.insertId;
    }

    static async actualizarPerfil(id_perfil, datos) {
        const { nombre, descripcion } = datos;
        const query = `UPDATE perfiles SET nombre = ?, descripcion = ? WHERE id_perfil = ?`;
        const [result] = await db.query(query, [nombre, descripcion, id_perfil]);
        return result.affectedRows;
    }

    static async cambiarEstadoPerfil(id_perfil, estado) {
        const query = `UPDATE perfiles SET estado = ? WHERE id_perfil = ?`;
        const [result] = await db.query(query, [estado, id_perfil]);
        return result.affectedRows;
    }

    static async obtenerOpcionesActivas() {
        const query = `SELECT id_opcion, nombre, ruta, icono FROM opciones WHERE estado = 1 AND ruta != 'opciones' ORDER BY id_opcion ASC`;
        const [rows] = await db.query(query);
        return rows;
    }

    static async obtenerOpcionesPorPerfil(id_perfil) {
        const query = `SELECT id_opcion FROM perfil_opcion WHERE id_perfil = ?`;
        const [rows] = await db.query(query, [id_perfil]);
        // Devolvemos solo un array simple con los IDs
        return rows.map(row => row.id_opcion);
    }

    static async guardarPermisos(id_perfil, array_opciones) {
        // Obtenemos una conexión individual para manejar la transacción
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            // 1. Eliminar permisos anteriores
            await connection.query(`DELETE FROM perfil_opcion WHERE id_perfil = ?`, [id_perfil]);

            // 2. Insertar los nuevos (si hay alguno)
            if (array_opciones && array_opciones.length > 0) {
                const values = array_opciones.map(id_opcion => [id_perfil, id_opcion]);
                await connection.query(`INSERT INTO perfil_opcion (id_perfil, id_opcion) VALUES ?`, [values]);
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = PerfilModel;
