const pool = require('./config/db');

async function run() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`cotizaciones\` (
              \`id_cotizacion\` int NOT NULL AUTO_INCREMENT,
              \`nombres\` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
              \`telefono\` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
              \`correo\` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
              \`id_ruta\` int NOT NULL,
              \`flete_estimado_min\` decimal(10,2) NOT NULL,
              \`flete_estimado_max\` decimal(10,2) NOT NULL,
              \`estado\` enum('Pendiente','Contactado','Convertido a Carga') COLLATE utf8mb4_general_ci DEFAULT 'Pendiente',
              \`fecha_registro\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (\`id_cotizacion\`),
              KEY \`fk_cotizaciones_ruta\` (\`id_ruta\`),
              CONSTRAINT \`fk_cotizaciones_ruta\` FOREIGN KEY (\`id_ruta\`) REFERENCES \`rutas\` (\`id_ruta\`) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);
        console.log("Tabla cotizaciones creada o ya existe.");
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`cotizacion_detalles\` (
              \`id_cotizacion_detalle\` int NOT NULL AUTO_INCREMENT,
              \`id_cotizacion\` int NOT NULL,
              \`producto\` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
              \`cantidad\` int NOT NULL,
              \`es_fragil\` tinyint(1) DEFAULT '0',
              \`es_perecible\` tinyint(1) DEFAULT '0',
              \`es_mudanza\` tinyint(1) DEFAULT '0',
              \`subtotal_calculado\` decimal(10,2) NOT NULL,
              PRIMARY KEY (\`id_cotizacion_detalle\`),
              KEY \`fk_cotizacion_detalle\` (\`id_cotizacion\`),
              CONSTRAINT \`fk_cotizacion_detalle\` FOREIGN KEY (\`id_cotizacion\`) REFERENCES \`cotizaciones\` (\`id_cotizacion\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);
        console.log("Tabla cotizacion_detalles creada o ya existe.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
