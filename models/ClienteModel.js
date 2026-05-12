const db = require('../config/db');

class ClienteModel {
    static async obtenerClientes() {
        const query = `
            SELECT id_cliente, tipo_documento, numero_documento, nombre_razon_social, direccion, telefono, correo, estado
            FROM clientes
            WHERE estado IN (0, 1)
            ORDER BY id_cliente DESC
        `;
        const [rows] = await db.query(query);
        return rows;
    }

    static async obtenerClientePorId(id_cliente) {
        const query = `SELECT * FROM clientes WHERE id_cliente = ?`;
        const [rows] = await db.query(query, [id_cliente]);
        return rows[0];
    }

    static async findByDocumento(numero_documento) {
        const query = `SELECT * FROM clientes WHERE numero_documento = ?`;
        const [rows] = await db.query(query, [numero_documento]);
        return rows[0];
    }

    static async registrarCliente(datos) {
        const { tipo_documento, numero_documento, nombre_razon_social, direccion, telefono, correo } = datos;
        const query = `
            INSERT INTO clientes (tipo_documento, numero_documento, nombre_razon_social, direccion, telefono, correo) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.query(query, [tipo_documento, numero_documento, nombre_razon_social, direccion, telefono, correo]);
        return result.insertId;
    }

    static async actualizarCliente(id_cliente, datos) {
        // En base a la inmutabilidad de los documentos, solo actualizamos el resto
        const { nombre_razon_social, direccion, telefono, correo } = datos;
        const query = `
            UPDATE clientes 
            SET nombre_razon_social = ?, direccion = ?, telefono = ?, correo = ? 
            WHERE id_cliente = ?
        `;
        const [result] = await db.query(query, [nombre_razon_social, direccion, telefono, correo, id_cliente]);
        return result.affectedRows;
    }

    static async cambiarEstadoCliente(id_cliente, estado) {
        const query = `UPDATE clientes SET estado = ? WHERE id_cliente = ?`;
        const [result] = await db.query(query, [estado, id_cliente]);
        return result.affectedRows;
    }
}

module.exports = ClienteModel;
