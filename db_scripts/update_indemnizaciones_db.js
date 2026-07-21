const db = require('../config/db');

async function updateDB() {
    try {
        console.log('Iniciando actualización de base de datos...');

        // 1. Alter table incidencia_detalle_carga
        console.log('Alterando incidencia_detalle_carga...');
        try {
            await db.query(`ALTER TABLE incidencia_detalle_carga ADD COLUMN estado_pago_cliente ENUM('Pendiente', 'Pagado') DEFAULT 'Pendiente'`);
            console.log('Columna estado_pago_cliente añadida.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('La columna estado_pago_cliente ya existe.');
            } else {
                throw e;
            }
        }

        // 2. Create pago_indemnizacion
        console.log('Creando tabla pago_indemnizacion...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS pago_indemnizacion (
                id_pago INT AUTO_INCREMENT PRIMARY KEY,
                id_cliente INT NOT NULL,
                monto_total DECIMAL(10,2) NOT NULL,
                fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metodo_pago VARCHAR(50) NOT NULL COMMENT 'Transferencia, Yape, Efectivo, etc.',
                referencia_pago VARCHAR(100) NULL COMMENT 'Nro de operación',
                evidencia_url VARCHAR(255) NULL COMMENT 'URL de evidencia',
                observaciones TEXT NULL,
                id_usuario INT NOT NULL COMMENT 'Usuario que registró el pago',
                estado TINYINT(1) DEFAULT 1 COMMENT '1: Activo, 0: Anulado',
                CONSTRAINT fk_pago_indem_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
                CONSTRAINT fk_pago_indem_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Tabla pago_indemnizacion creada.');

        // 3. Create pago_indemnizacion_detalle
        console.log('Creando tabla pago_indemnizacion_detalle...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS pago_indemnizacion_detalle (
                id_pago INT NOT NULL,
                id_incidencia INT NOT NULL,
                id_detalle INT NOT NULL,
                monto_pagado DECIMAL(10,2) NOT NULL,
                PRIMARY KEY (id_pago, id_incidencia, id_detalle),
                CONSTRAINT fk_pid_pago FOREIGN KEY (id_pago) REFERENCES pago_indemnizacion(id_pago),
                CONSTRAINT fk_pid_incidencia_detalle FOREIGN KEY (id_incidencia, id_detalle) REFERENCES incidencia_detalle_carga(id_incidencia, id_detalle)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Tabla pago_indemnizacion_detalle creada.');

        // 4. Register new option in opciones
        console.log('Registrando opción de menú...');
        const [opciones] = await db.query(`SELECT id_opcion FROM opciones WHERE ruta = 'indemnizaciones'`);
        let id_opcion;
        if (opciones.length === 0) {
            const [result] = await db.query(`
                INSERT INTO opciones (nombre, ruta, icono, estado)
                VALUES ('Indemnizaciones', 'indemnizaciones', 'fas fa-handshake', 1)
            `);
            id_opcion = result.insertId;
            console.log(`Opción Indemnizaciones creada con ID: ${id_opcion}`);
        } else {
            id_opcion = opciones[0].id_opcion;
            console.log(`Opción Indemnizaciones ya existe con ID: ${id_opcion}`);
        }

        // 5. Assign to profiles (1 and 2)
        console.log('Asignando opción a perfiles 1 y 2...');
        const perfiles = [1, 2];
        for (const id_perfil of perfiles) {
            const [po] = await db.query(`SELECT * FROM perfil_opcion WHERE id_perfil = ? AND id_opcion = ?`, [id_perfil, id_opcion]);
            if (po.length === 0) {
                await db.query(`INSERT INTO perfil_opcion (id_perfil, id_opcion) VALUES (?, ?)`, [id_perfil, id_opcion]);
                console.log(`Opción asignada al perfil ${id_perfil}`);
            } else {
                console.log(`Opción ya asignada al perfil ${id_perfil}`);
            }
        }

        console.log('Actualización de base de datos completada exitosamente.');
        process.exit(0);
    } catch (error) {
        console.error('Error actualizando la base de datos:', error);
        process.exit(1);
    }
}

updateDB();
