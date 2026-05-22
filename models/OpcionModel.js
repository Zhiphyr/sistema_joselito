const db = require('../config/db');

class OpcionModel {
    static async obtenerMenuPorPerfil(id_perfil) {
        const query = `
            SELECT o.id_opcion, o.nombre, o.ruta, o.icono
            FROM opciones o
            INNER JOIN perfil_opcion po ON o.id_opcion = po.id_opcion
            WHERE po.id_perfil = ? AND o.estado = 1
            ORDER BY o.id_opcion ASC
        `;
        const [rows] = await db.query(query, [id_perfil]);
        return rows;
    }

    static async obtenerOpciones() {
        const query = `
            SELECT id_opcion, nombre, ruta, icono, estado 
            FROM opciones 
            WHERE estado IN (0, 1) 
            ORDER BY id_opcion ASC
        `;
        const [rows] = await db.query(query);
        return rows;
    }

    static async registrarOpcion(datos) {
        const { nombre, ruta, icono } = datos;
        const query = `INSERT INTO opciones (nombre, ruta, icono) VALUES (?, ?, ?)`;
        const [result] = await db.query(query, [nombre, ruta, icono]);
        return result.insertId;
    }

    static async actualizarOpcion(id_opcion, datos) {
        const { nombre, ruta, icono } = datos;
        const query = `UPDATE opciones SET nombre = ?, ruta = ?, icono = ? WHERE id_opcion = ?`;
        const [result] = await db.query(query, [nombre, ruta, icono, id_opcion]);
        return result.affectedRows;
    }

    static async cambiarEstadoOpcion(id_opcion, estado) {
        const query = `UPDATE opciones SET estado = ? WHERE id_opcion = ?`;
        const [result] = await db.query(query, [estado, id_opcion]);
        return result.affectedRows;
    }
}

module.exports = OpcionModel;
