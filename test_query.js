const pool = require('./config/db');

async function testQuery() {
    try {
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM camiones c WHERE c.estado = 1 AND NOT EXISTS (
                    SELECT 1 FROM Viaje v 
                    WHERE v.id_camion = c.id_camion 
                    AND v.estado_operativo IN ('En Ruta', 'Llegó a Destino', 'Descargado', 'Incidencia')
                    AND v.estado != 2
                )) AS disponibles, 
                (SELECT COUNT(*) FROM camiones WHERE estado = 1) AS total
        `;
        const [rows] = await pool.query(query);
        console.log("Result:", rows);

        process.exit();
    } catch (e) {
        console.error("Error:", e.message);
        process.exit();
    }
}
testQuery();
