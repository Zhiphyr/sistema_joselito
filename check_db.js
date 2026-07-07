const db = require('./config/db');

async function checkSchema() {
    try {
        const [rows1] = await db.query('DESCRIBE Incidencia_Detalle_Carga');
        console.log("Incidencia_Detalle_Carga:\n", rows1);

        const [rows2] = await db.query('DESCRIBE Incidencia_Viaje');
        console.log("Incidencia_Viaje:\n", rows2);
        
        const [rows4] = await db.query("SHOW COLUMNS FROM Incidencia_Viaje LIKE 'tipo_incidencia'");
        console.log("tipo_incidencia enum:\n", rows4[0].Type);
    } catch(err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkSchema();
