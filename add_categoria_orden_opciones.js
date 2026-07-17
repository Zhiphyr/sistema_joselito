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
        console.log('Iniciando migración: categoria + orden en opciones...');

        if (!(await columnExists('opciones', 'categoria'))) {
            await db.query(`ALTER TABLE opciones ADD COLUMN categoria VARCHAR(50) NULL AFTER icono`);
            console.log('Columna "categoria" agregada.');
        } else {
            console.log('Columna "categoria" ya existe, se omite.');
        }

        if (!(await columnExists('opciones', 'orden'))) {
            await db.query(`ALTER TABLE opciones ADD COLUMN orden INT NOT NULL DEFAULT 0 AFTER categoria`);
            console.log('Columna "orden" agregada.');
        } else {
            console.log('Columna "orden" ya existe, se omite.');
        }

        // categoria = NULL significa "nivel superior, fuera de cualquier grupo" (hoy solo Dashboard).
        // orden usa huecos: 10/20/30 dentro de una categoría, 100/200/300 entre categorías,
        // para poder insertar o reordenar después sin renumerar todo.
        const backfill = [
            { id: 1, categoria: null, orden: 0 }, // Dashboard (standalone, fuera de categorías)
            { id: 2, categoria: 'Administración', orden: 10 },
            { id: 3, categoria: 'Administración', orden: 20 },
            { id: 4, categoria: 'Administración', orden: 30 },
            { id: 5, categoria: 'Catálogos', orden: 100 },
            { id: 6, categoria: 'Catálogos', orden: 110 },
            { id: 7, categoria: 'Catálogos', orden: 120 },
            { id: 8, categoria: 'Catálogos', orden: 130 },
            { id: 9, categoria: 'Operaciones', orden: 200 },
            { id: 10, categoria: 'Operaciones', orden: 210 },
            { id: 11, categoria: 'Operaciones', orden: 220 },
            { id: 12, categoria: 'Finanzas', orden: 300 },
            { id: 13, categoria: 'Finanzas', orden: 310 },
            { id: 14, categoria: 'Finanzas', orden: 320 },
            { id: 15, categoria: 'Finanzas', orden: 330 },
            { id: 16, categoria: 'Finanzas', orden: 340 },
        ];

        for (const item of backfill) {
            await db.query(
                `UPDATE opciones SET categoria = ?, orden = ? WHERE id_opcion = ?`,
                [item.categoria, item.orden, item.id]
            );
        }
        console.log(`Backfill completado para ${backfill.length} filas.`);
        console.log('Migración completada exitosamente.');
    } catch (err) {
        console.error('Migración falló:', err);
    } finally {
        process.exit();
    }
}

run();
