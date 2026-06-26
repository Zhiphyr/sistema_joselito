require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        await connection.query("ALTER TABLE Viaje MODIFY COLUMN estado_pagos ENUM('Pendiente', 'Liquidado', 'Anulado') DEFAULT 'Pendiente' COMMENT 'Controla si el chofer ya cobró su viaje'");
        console.log("Columna estado_pagos modificada exitosamente para incluir 'Anulado'.");
    } catch (error) {
        console.error("Error al modificar la base de datos:", error);
    } finally {
        await connection.end();
    }
}

main();
