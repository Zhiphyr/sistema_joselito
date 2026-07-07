const db = require('./config/db');

async function migrateDB() {
    try {
        console.log("Starting migrations...");

        // 1. Temporarily expand ENUM
        await db.query(`ALTER TABLE Incidencia_Viaje MODIFY COLUMN tipo_incidencia ENUM(
            'Falla Mecánica',
            'Retraso en Ruta',
            'Daño/Mala Estiba',
            'Daño / Mala Estiba',
            'Faltante / Pérdida',
            'Faltante / Pérdida / Robo',
            'Accidente',
            'Queja de Cliente / Administrativo',
            'Otro'
        ) NOT NULL;`);
        console.log("ENUM expanded.");

        // 2. Update data
        await db.query(`UPDATE Incidencia_Viaje SET tipo_incidencia = 'Daño / Mala Estiba' WHERE tipo_incidencia = 'Daño/Mala Estiba';`);
        await db.query(`UPDATE Incidencia_Viaje SET tipo_incidencia = 'Faltante / Pérdida / Robo' WHERE tipo_incidencia = 'Faltante / Pérdida';`);
        console.log("Data migrated.");

        // 3. Finalize ENUM
        await db.query(`ALTER TABLE Incidencia_Viaje MODIFY COLUMN tipo_incidencia ENUM(
            'Retraso en Ruta', 
            'Daño / Mala Estiba', 
            'Faltante / Pérdida / Robo', 
            'Accidente', 
            'Falla Mecánica', 
            'Queja de Cliente / Administrativo', 
            'Otro'
        ) NOT NULL;`);
        console.log("ENUM finalized.");

        // 4. Add columns to Incidencia_Detalle_Carga
        // Ignore errors if columns already exist
        try {
            await db.query(`ALTER TABLE Incidencia_Detalle_Carga ADD COLUMN precio_unitario_acordado DECIMAL(10,2) DEFAULT 0.00;`);
            console.log("Added precio_unitario_acordado.");
        } catch(e) { console.log("precio_unitario_acordado might already exist.", e.message); }
        
        try {
            await db.query(`ALTER TABLE Incidencia_Detalle_Carga ADD COLUMN subtotal_indemnizar DECIMAL(10,2) DEFAULT 0.00;`);
            console.log("Added subtotal_indemnizar.");
        } catch(e) { console.log("subtotal_indemnizar might already exist.", e.message); }

        console.log("Migrations completed successfully.");
    } catch(err) {
        console.error("Migration failed:", err);
    } finally {
        process.exit();
    }
}

migrateDB();
