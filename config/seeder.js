const db = require('./db');

async function autoSeed() {
    try {
        // 1. Verificar Entidad
        const [entidad] = await db.query('SELECT id_entidad FROM entidad_financiera WHERE nombre = ?', ['Caja Interna']);
        if (entidad.length === 0) {
            await db.query(`INSERT INTO entidad_financiera (nombre, tipo_entidad, color_primario, color_fondo, estado) VALUES ('Caja Interna', 'Financiera', '#10b981', '#ecfdf5', 1)`);
            console.log('✅ Entidad Caja Interna auto-creada.');
        }

        // 2. Verificar Cuenta Sistema
        const [cuenta] = await db.query('SELECT id_cuenta FROM cuenta_bancaria WHERE es_sistema = 1');
        if (cuenta.length === 0) {
            await db.query(`
                INSERT INTO cuenta_bancaria (id_entidad, tipo_cuenta, nro_cuenta, titular, estado, es_sistema)
                SELECT id_entidad, 'Efectivo', 'Caja Física Principal', 'Empresa', 1, 1 
                FROM entidad_financiera WHERE nombre = 'Caja Interna'
            `);
            console.log('✅ Cuenta Caja Física Principal auto-creada.');
        }
    } catch (e) {
        console.error('❌ Error en Auto-Seeding:', e);
    }
}

module.exports = autoSeed;
