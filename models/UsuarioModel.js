const db = require('../config/db');

class UsuarioModel {
    static async findByUsername(username) {
        const query = `
            SELECT u.*, p.nombre as nombre_perfil, p.estado as estado_perfil
            FROM usuarios u
            INNER JOIN perfiles p ON u.id_perfil = p.id_perfil
            WHERE u.usuario = ?
        `;
        const [rows] = await db.query(query, [username]);
        return rows[0];
    }

    static async obtenerUsuarioPorId(id_usuario) {
        const query = `SELECT * FROM usuarios WHERE id_usuario = ?`;
        const [rows] = await db.query(query, [id_usuario]);
        return rows[0];
    }

    static async obtenerUsuarios() {
        const query = `
            SELECT u.id_usuario, u.nombre, u.usuario, u.estado, p.nombre as perfil
            FROM usuarios u
            INNER JOIN perfiles p ON u.id_perfil = p.id_perfil
            WHERE u.estado IN (0, 1) AND u.id_perfil != 1
            ORDER BY u.id_usuario ASC
        `;
        const [rows] = await db.query(query);
        return rows;
    }

    static async obtenerPerfilesActivos() {
        const query = `SELECT id_perfil, nombre FROM perfiles WHERE estado = 1 AND id_perfil != 1`;
        const [rows] = await db.query(query);
        return rows;
    }
    static async contarUsuariosPorPerfil(id_perfil) {
        const query = `SELECT COUNT(*) as count FROM usuarios WHERE id_perfil = ? AND estado IN (0, 1)`;
        const [rows] = await db.query(query, [id_perfil]);
        return rows[0].count;
    }

    static async desactivarUsuariosPorPerfil(id_perfil) {
        const query = `UPDATE usuarios SET estado = 0 WHERE id_perfil = ?`;
        const [result] = await db.query(query, [id_perfil]);
        return result.affectedRows;
    }

    static async registrarUsuario(datos) {
        const { id_perfil, nombre, usuario, clave } = datos;
        const query = `INSERT INTO usuarios (id_perfil, nombre, usuario, clave) VALUES (?, ?, ?, ?)`;
        const [result] = await db.query(query, [id_perfil, nombre, usuario, clave]);
        return result.insertId;
    }

    static async actualizarUsuario(id_usuario, datos) {
        let query = '';
        let params = [];

        if (datos.clave) {
            query = `UPDATE usuarios SET id_perfil = ?, nombre = ?, usuario = ?, clave = ? WHERE id_usuario = ?`;
            params = [datos.id_perfil, datos.nombre, datos.usuario, datos.clave, id_usuario];
        } else {
            query = `UPDATE usuarios SET id_perfil = ?, nombre = ?, usuario = ? WHERE id_usuario = ?`;
            params = [datos.id_perfil, datos.nombre, datos.usuario, id_usuario];
        }

        const [result] = await db.query(query, params);
        return result.affectedRows;
    }

    static async cambiarEstadoUsuario(id_usuario, estado) {
        const query = `UPDATE usuarios SET estado = ? WHERE id_usuario = ?`;
        const [result] = await db.query(query, [estado, id_usuario]);
        return result.affectedRows;
    }

    static async registrarIntentoFallido(id_usuario, maxIntentos, minutosBloqueo) {
        const query = `
            UPDATE usuarios
            SET intentos_fallidos = intentos_fallidos + 1,
                bloqueado_hasta = CASE
                    WHEN intentos_fallidos >= ? THEN DATE_ADD(NOW(), INTERVAL ? MINUTE)
                    ELSE bloqueado_hasta
                END
            WHERE id_usuario = ?
        `;
        await db.query(query, [maxIntentos, minutosBloqueo, id_usuario]);

        const [rows] = await db.query(
            `SELECT intentos_fallidos, bloqueado_hasta FROM usuarios WHERE id_usuario = ?`,
            [id_usuario]
        );
        return rows[0];
    }

    static async resetearIntentosFallidos(id_usuario) {
        const query = `UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id_usuario = ?`;
        const [result] = await db.query(query, [id_usuario]);
        return result.affectedRows;
    }
}

module.exports = UsuarioModel;
