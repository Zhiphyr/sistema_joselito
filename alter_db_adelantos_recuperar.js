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
        await connection.query("ALTER TABLE Incidencia_Viaje ADD COLUMN adelanto_recuperar DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Adelanto a recuperar en caso de anulación' AFTER gastos_adicionales;");
        console.log("Columna adelanto_recuperar añadida exitosamente.");
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log("La columna adelanto_recuperar ya existe.");
        } else {
            console.error("Error al modificar la base de datos:", error);
        }
    } finally {
        await connection.end();
    }
}

main();
