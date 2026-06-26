const db = require('./config/db');

async function test() {
    const sql = `
        SELECT 
            iv.id_incidencia,
            iv.tipo_incidencia,
            v.id_viaje,
            (iv.monto_descuento_chofer - iv.monto_cobrado) AS saldo_deuda
        FROM incidencia_viaje iv
        JOIN viaje v ON iv.id_viaje = v.id_viaje
        WHERE v.id_camion = ?
            AND iv.estado = 1
            AND iv.monto_descuento_chofer IS NOT NULL
            AND iv.estado_cobro_penalidad IN ('Pendiente', 'Cobrado Parcial')
            AND (iv.monto_descuento_chofer - iv.monto_cobrado) > 0
    `;
    const [rows] = await db.query(sql, [2]);
    console.log(rows);
    process.exit();
}
test();
