require('dotenv').config();
const db = require('./config/db');

async function columnExists(table, column) {
    const [rows] = await db.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [process.env.DB_NAME, table, column]
    );
    return rows[0].cnt > 0;
}

async function run() {
    try {
        console.log('Iniciando migración: bloqueo de login por intentos fallidos...');

        if (!(await columnExists('usuarios', 'intentos_fallidos'))) {
            await db.query(`ALTER TABLE usuarios ADD COLUMN intentos_fallidos INT NOT NULL DEFAULT 0 AFTER estado`);
            console.log('Columna "intentos_fallidos" agregada.');
        } else {
            console.log('Columna "intentos_fallidos" ya existe, se omite.');
        }

        if (!(await columnExists('usuarios', 'bloqueado_hasta'))) {
            await db.query(`ALTER TABLE usuarios ADD COLUMN bloqueado_hasta DATETIME NULL AFTER intentos_fallidos`);
            console.log('Columna "bloqueado_hasta" agregada.');
        } else {
            console.log('Columna "bloqueado_hasta" ya existe, se omite.');
        }

        console.log('Migración completada exitosamente.');
    } catch (err) {
        console.error('Migración falló:', err);
    } finally {
        process.exit();
    }
}

run();
