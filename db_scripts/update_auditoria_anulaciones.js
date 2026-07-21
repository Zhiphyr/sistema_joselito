const db = require('../config/db');

async function updateDB() {
    try {
        console.log('Iniciando creación de tabla de auditoría de anulaciones...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS auditoria_anulacion (
                id_auditoria INT AUTO_INCREMENT PRIMARY KEY,
                modulo ENUM('SINIESTROS','COBRO_FLETE') NOT NULL,
                id_registro INT NOT NULL,
                motivo VARCHAR(300) NOT NULL,
                id_usuario INT NOT NULL,
                fecha_anulacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_auditoria_anulacion_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Tabla auditoria_anulacion lista.');

        console.log('Migración completada exitosamente.');
        process.exit(0);
    } catch (error) {
        console.error('Error en la migración de auditoria_anulacion:', error);
        process.exit(1);
    }
}

updateDB();
