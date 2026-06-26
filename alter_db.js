const db = require('./config/db');

async function run() {
    try {
        await db.query(`ALTER TABLE liquidacion_viaje 
                        ADD COLUMN numero_operacion VARCHAR(100) NULL AFTER metodo_pago,
                        ADD COLUMN evidencia_url VARCHAR(255) NULL AFTER numero_operacion;`);
        console.log('Tabla alterada con éxito.');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('Las columnas ya existen.');
        } else {
            console.error('Error alterando la tabla:', e);
        }
    } finally {
        process.exit(0);
    }
}
run();
