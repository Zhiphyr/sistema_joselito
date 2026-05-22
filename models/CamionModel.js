const db = require('../config/db');

class CamionModel {

    static async obtenerCamiones() {
        const query = `
            SELECT id_camion, nombre, placa, tipo_documento, numero_documento, conductor, direccion, telefono, estado,
                   fecha_creacion, fecha_actualizacion
            FROM camiones
            WHERE estado IN (0, 1)
            ORDER BY id_camion ASC
        `;
        const [rows] = await db.query(query);
        return rows;
    }

    static async obtenerCamionPorId(id_camion) {
        const query = `SELECT * FROM camiones WHERE id_camion = ?`;
        const [rows] = await db.query(query, [id_camion]);
        return rows[0];
    }

    static async findByPlaca(placa) {
        const query = `SELECT * FROM camiones WHERE UPPER(placa) = UPPER(?)`;
        const [rows] = await db.query(query, [placa]);
        return rows[0];
    }

    static async registrarCamion(datos) {
        const { nombre, placa, tipo_documento, numero_documento, conductor, direccion, telefono } = datos;
        const query = `
            INSERT INTO camiones (nombre, placa, tipo_documento, numero_documento, conductor, direccion, telefono)
            VALUES (?, UPPER(?), ?, ?, ?, ?, ?)
        `;
        const [result] = await db.query(query, [nombre, placa, tipo_documento, numero_documento, conductor, direccion, telefono]);
        return result.insertId;
    }

    static async actualizarCamion(id_camion, datos) {
        const { nombre, tipo_documento, numero_documento, conductor, direccion, telefono } = datos;
        const query = `
            UPDATE camiones
            SET nombre = ?, tipo_documento = ?, numero_documento = ?, conductor = ?, direccion = ?, telefono = ?
            WHERE id_camion = ?
        `;
        const [result] = await db.query(query, [nombre, tipo_documento, numero_documento, conductor, direccion, telefono, id_camion]);
        return result.affectedRows;
    }

    static async reactivarCamion(id_camion, datos) {
        const { nombre, tipo_documento, numero_documento, conductor, direccion, telefono } = datos;
        const query = `
            UPDATE camiones
            SET estado = 1, nombre = ?, tipo_documento = ?, numero_documento = ?, conductor = ?, direccion = ?, telefono = ?
            WHERE id_camion = ?
        `;
        const [result] = await db.query(query, [nombre, tipo_documento, numero_documento, conductor, direccion, telefono, id_camion]);
        return result.affectedRows;
    }

    static async cambiarEstadoCamion(id_camion, estado) {
        const query = `UPDATE camiones SET estado = ? WHERE id_camion = ?`;
        const [result] = await db.query(query, [estado, id_camion]);
        return result.affectedRows;
    }
}

module.exports = CamionModel;
