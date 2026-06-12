const db = require('./config/db');

async function run() {
    try {
        const tables = ['liquidaciones_chofer', 'viaje', 'descuento_incidencia', 'incidencia_viaje'];
        for (const t of tables) {
            try {
                const [cols] = await db.query(`DESCRIBE ${t}`);
                console.log(`\n--- COLUMNS: ${t} ---`);
                console.log(cols.map(c => ({ Field: c.Field, Type: c.Type })));
            } catch (e) {
                console.log(`Table ${t} describe failed: ${e.message}`);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
