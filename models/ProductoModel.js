const db = require('../config/db');

class ProductoModel {
    static async obtenerProductos() {
        const query = `
            SELECT id_producto, nombre, descripcion, estado
            FROM productos
            WHERE estado IN (0, 1)
            ORDER BY id_producto DESC
        `;
        const [rows] = await db.query(query);
        return rows;
    }

    static async obtenerProductoPorId(id_producto) {
        const query = `SELECT * FROM productos WHERE id_producto = ?`;
        const [rows] = await db.query(query, [id_producto]);
        return rows[0];
    }

    static async findByNombre(nombre) {
        const query = `SELECT * FROM productos WHERE LOWER(nombre) = LOWER(?)`;
        const [rows] = await db.query(query, [nombre]);
        return rows[0];
    }

    static async registrarProducto(datos) {
        const { nombre, descripcion } = datos;
        const query = `INSERT INTO productos (nombre, descripcion) VALUES (?, ?)`;
        const [result] = await db.query(query, [nombre, descripcion]);
        return result.insertId;
    }

    static async actualizarProducto(id_producto, datos) {
        const { nombre, descripcion } = datos;
        const query = `UPDATE productos SET nombre = ?, descripcion = ? WHERE id_producto = ?`;
        const [result] = await db.query(query, [nombre, descripcion, id_producto]);
        return result.affectedRows;
    }

    static async cambiarEstadoProducto(id_producto, estado) {
        const query = `UPDATE productos SET estado = ? WHERE id_producto = ?`;
        const [result] = await db.query(query, [estado, id_producto]);
        return result.affectedRows;
    }
}

module.exports = ProductoModel;
