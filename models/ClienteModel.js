const db = require('../config/db');

class ClienteModel {
    static async obtenerClientes() {
        const query = `
            SELECT id_cliente, tipo_documento, numero_documento, nombre_razon_social, direccion, telefono, correo, estado
            FROM clientes
            WHERE estado IN (0, 1)
            ORDER BY id_cliente ASC
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

    static async tieneViajesActivos(id_cliente) {
        const query = `
            SELECT COUNT(*) as activeCount 
            FROM viaje v
            JOIN carga c ON v.id_viaje = c.id_viaje
            WHERE (c.id_remitente = ? OR c.id_destinatario = ?)
            AND v.estado_operativo IN ('En Ruta', 'Llegó a Destino', 'Descargado', 'Incidencia')
            AND v.estado = 1
            AND c.estado = 1
        `;
        const [rows] = await db.query(query, [id_cliente, id_cliente]);
        return rows[0].activeCount > 0;
    }
}

module.exports = ClienteModel;
