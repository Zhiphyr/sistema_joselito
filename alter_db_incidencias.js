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
        await connection.query('ALTER TABLE incidencia_viaje DROP COLUMN estado_resolucion');
        console.log("Columna estado_resolucion eliminada de incidencia_viaje exitosamente.");
    } catch (error) {
        if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
            console.log("La columna ya no existe, omitiendo...");
        } else {
            console.error("Error al modificar la base de datos:", error);
        }
    } finally {
        await connection.end();
    }
}

main();
