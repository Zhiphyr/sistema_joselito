const db = require('./config/db');

async function columnExists(table, column) {
    const [rows] = await db.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [process.env.DB_NAME, table, column]
    );
    return rows[0].cnt > 0;
}

async function isNullable(table, column) {
    const [rows] = await db.query(
        `SELECT IS_NULLABLE FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [process.env.DB_NAME, table, column]
    );
    return rows.length > 0 && rows[0].IS_NULLABLE === 'YES';
}

async function constraintExists(constraintName) {
    const [rows] = await db.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.TABLE_CONSTRAINTS
         WHERE TABLE_SCHEMA = ? AND CONSTRAINT_NAME = ?`,
        [process.env.DB_NAME, constraintName]
    );
    return rows[0].cnt > 0;
}

async function getColumnType(table, column) {
    const [rows] = await db.query(
        `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [process.env.DB_NAME, table, column]
    );
    return rows.length > 0 ? rows[0].COLUMN_TYPE : null;
}

async function run() {
    try {
        console.log('Iniciando migración: conversión cotización -> carga...');

        // 1. Carga.id_viaje nullable
        if (await isNullable('Carga', 'id_viaje')) {
            console.log('Carga.id_viaje ya admite NULL, se omite.');
        } else {
            await db.query('ALTER TABLE Carga MODIFY id_viaje INT NULL');
            console.log('Carga.id_viaje ahora admite NULL.');
        }

        // 2. Carga.id_cotizacion_origen + FK
        if (await columnExists('Carga', 'id_cotizacion_origen')) {
            console.log('Carga.id_cotizacion_origen ya existe, se omite.');
        } else {
            await db.query('ALTER TABLE Carga ADD COLUMN id_cotizacion_origen INT NULL AFTER id_viaje');
            console.log('Columna Carga.id_cotizacion_origen agregada.');
        }

        if (await constraintExists('fk_carga_cotizacion_origen')) {
            console.log('FK fk_carga_cotizacion_origen ya existe, se omite.');
        } else {
            await db.query(`
                ALTER TABLE Carga ADD CONSTRAINT fk_carga_cotizacion_origen
                  FOREIGN KEY (id_cotizacion_origen) REFERENCES cotizaciones(id_cotizacion)
                  ON DELETE SET NULL ON UPDATE CASCADE
            `);
            console.log('FK fk_carga_cotizacion_origen agregada.');
        }

        // 3. cotizaciones.estado - nuevo valor ENUM
        const tipoActual = await getColumnType('cotizaciones', 'estado');
        if (tipoActual && tipoActual.includes('Rechazado/Vencido')) {
            console.log('cotizaciones.estado ya incluye "Rechazado/Vencido", se omite.');
        } else {
            await db.query(`
                ALTER TABLE cotizaciones MODIFY estado
                  ENUM('Pendiente','Contactado','Convertido a Carga','Rechazado/Vencido') DEFAULT 'Pendiente'
            `);
            console.log('cotizaciones.estado ahora incluye "Rechazado/Vencido".');
        }

        console.log('Migración completada exitosamente.');
        process.exit(0);
    } catch (e) {
        console.error('Migración falló:', e);
        process.exit(1);
    }
}

run();
