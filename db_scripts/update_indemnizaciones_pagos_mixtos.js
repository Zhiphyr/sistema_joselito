const db = require('../config/db');

async function updateDB() {
    try {
        console.log('Iniciando migración de pagos mixtos para indemnizaciones...');

        // 1. Crear tabla detalle_pago_indemnizacion (una fila por método de pago usado en un pago)
        console.log('Creando tabla detalle_pago_indemnizacion...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS detalle_pago_indemnizacion (
                id_detalle_pago INT AUTO_INCREMENT PRIMARY KEY,
                id_pago INT NOT NULL,
                metodo_pago ENUM('Efectivo','Transferencia','Depósito','Billetera Digital') NOT NULL,
                id_cuenta INT NULL,
                id_billetera INT NULL,
                monto_pagado DECIMAL(10,2) NOT NULL,
                numero_operacion VARCHAR(100) NULL,
                evidencia_url VARCHAR(255) NULL,
                fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_dpi_pago FOREIGN KEY (id_pago) REFERENCES pago_indemnizacion(id_pago) ON DELETE CASCADE,
                CONSTRAINT fk_dpi_cuenta FOREIGN KEY (id_cuenta) REFERENCES cuenta_bancaria(id_cuenta),
                CONSTRAINT fk_dpi_billetera FOREIGN KEY (id_billetera) REFERENCES billetera_digital(id_billetera)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Tabla detalle_pago_indemnizacion lista.');

        // 2. Eliminar columnas de método de pago único en la cabecera (ahora viven en detalle_pago_indemnizacion)
        const columnasViejas = ['metodo_pago', 'referencia_pago', 'evidencia_url'];
        for (const columna of columnasViejas) {
            console.log(`Eliminando columna pago_indemnizacion.${columna}...`);
            try {
                await db.query(`ALTER TABLE pago_indemnizacion DROP COLUMN ${columna}`);
                console.log(`Columna ${columna} eliminada.`);
            } catch (e) {
                if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY' || e.code === 'ER_BAD_FIELD_ERROR') {
                    console.log(`La columna ${columna} ya no existe.`);
                } else {
                    throw e;
                }
            }
        }

        console.log('Migración de pagos mixtos completada exitosamente.');
        process.exit(0);
    } catch (error) {
        console.error('Error en la migración de pagos mixtos:', error);
        process.exit(1);
    }
}

updateDB();
