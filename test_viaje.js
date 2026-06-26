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
        const [rows] = await connection.query("SELECT id_viaje, estado_operativo, estado_pagos FROM Viaje WHERE id_viaje = 20");
        console.log(rows);
    } catch (e) { console.error(e); }
    await connection.end();
}
main();
