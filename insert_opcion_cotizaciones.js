const db = require('./config/db');

async function run() {
    try {
        const [existente] = await db.query("SELECT id_opcion FROM opciones WHERE ruta = 'cotizaciones'");

        if (existente.length > 0) {
            console.log('La opción "cotizaciones" ya existe, se omite la inserción.');
            process.exit(0);
        }

        await db.query(
            "INSERT INTO `opciones` (`nombre`, `ruta`, `icono`, `categoria`, `orden`, `estado`) VALUES (?, ?, ?, ?, ?, ?)",
            ['Cotizaciones', 'cotizaciones', 'fas fa-file-invoice-dollar', 'Operaciones', 230, 1]
        );
        console.log('Opción "Cotizaciones" creada.');

        const [opcion] = await db.query("SELECT id_opcion FROM opciones WHERE ruta = 'cotizaciones' LIMIT 1");
        const idOpcion = opcion[0].id_opcion;

        await db.query(
            "INSERT INTO `perfil_opcion` (`id_perfil`, `id_opcion`) VALUES (1, ?), (2, ?)",
            [idOpcion, idOpcion]
        );
        console.log('Permisos asignados a Developer y Administrador.');

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
