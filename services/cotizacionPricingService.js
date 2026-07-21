const pool = require('../config/db');

const MODIFICADOR_FRAGIL = 0.15;
const MODIFICADOR_PERECIBLE = 0.20;
const MODIFICADOR_MUDANZA = 0.50;
const PRECIO_DEFAULT_KG = 0.20;
const RANGO_PORCENTAJE = 0.05;

async function obtenerPrecioBaseUnitario(id_ruta) {
    const [historial] = await pool.query(`
        SELECT AVG(dc.precio_peso) as avg_unit_price
        FROM detalle_carga dc
        JOIN carga c ON dc.id_carga = c.id_carga
        JOIN viaje v ON c.id_viaje = v.id_viaje
        WHERE v.id_ruta = ?
          AND dc.fecha_registro >= DATE_SUB(NOW(), INTERVAL 2 MONTH)
          AND dc.estado = 1
    `, [id_ruta]);

    const precio = historial[0].avg_unit_price;
    return (!precio || precio <= 0) ? PRECIO_DEFAULT_KG : precio;
}

// producto: { nombre, id_producto, peso_unitario, cantidad, fragil, perecible, mudanza }
function calcularDetalleProducto(precioBaseUnitario, producto) {
    const peso_total = (producto.peso_unitario || 1) * producto.cantidad;
    let modificador = 1.0;
    if (producto.fragil) modificador += MODIFICADOR_FRAGIL;
    if (producto.perecible) modificador += MODIFICADOR_PERECIBLE;
    if (producto.mudanza) modificador += MODIFICADOR_MUDANZA;
    const subtotalCalculado = peso_total * precioBaseUnitario * modificador;

    return {
        nombre: producto.nombre,
        id_producto: producto.id_producto,
        peso_unitario: producto.peso_unitario,
        cantidad: producto.cantidad,
        peso_total,
        fragil: producto.fragil ? 1 : 0,
        perecible: producto.perecible ? 1 : 0,
        mudanza: producto.mudanza ? 1 : 0,
        subtotalCalculado
    };
}

async function calcularCotizacionCompleta(id_ruta, productos) {
    const precioBaseUnitario = await obtenerPrecioBaseUnitario(id_ruta);

    let totalCalculado = 0;
    const detalles = productos.map(p => {
        const det = calcularDetalleProducto(precioBaseUnitario, p);
        totalCalculado += det.subtotalCalculado;
        return det;
    });

    return {
        precioBaseUnitario,
        detalles,
        totalCalculado,
        fleteMin: totalCalculado * (1 - RANGO_PORCENTAJE),
        fleteMax: totalCalculado * (1 + RANGO_PORCENTAJE)
    };
}

module.exports = {
    calcularCotizacionCompleta,
    obtenerPrecioBaseUnitario,
    MODIFICADOR_FRAGIL,
    MODIFICADOR_PERECIBLE,
    MODIFICADOR_MUDANZA,
    PRECIO_DEFAULT_KG,
    RANGO_PORCENTAJE
};
