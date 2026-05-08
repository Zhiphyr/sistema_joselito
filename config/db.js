require('dotenv').config();
const mysql = require('mysql2/promise');

class Database {
    constructor() {
        if (!Database.instance) {
            this.pool = mysql.createPool({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
            Database.instance = this;
        }
        return Database.instance;
    }

    // Obtiene una conexión individual del pool si se necesitan transacciones
    async getConnection() {
        return await this.pool.getConnection();
    }
    
    // Método helper para ejecutar consultas directamente desde el pool
    async query(sql, params) {
        return await this.pool.query(sql, params);
    }
}

// Creamos y exportamos una única instancia (Singleton)
const dbInstance = new Database();
module.exports = dbInstance;
