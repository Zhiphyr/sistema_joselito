const bcrypt = require('bcryptjs');
const db = require('../config/db');

// PIN compartido de autorización para anular pagos (Indemnizaciones, Deudas por
// Cobrar), guardado en configuracion_sistema.PIN_ANULACION_PAGOS.
async function verificarPinAnulacion(pin) {
    if (!pin) return false;
    const [rows] = await db.query(
        `SELECT valor FROM configuracion_sistema WHERE parametro = 'PIN_ANULACION_PAGOS'`
    );
    if (rows.length === 0) return false;
    return bcrypt.compare(String(pin), rows[0].valor);
}

// Motivo de anulación: 10-300 caracteres, solo letras (con tildes/ñ), números,
// espacios y puntuación común. No es una defensa anti-inyección SQL (eso ya lo
// garantizan los placeholders parametrizados de mysql2), es para descartar basura.
const MOTIVO_REGEX = /^[a-zA-Z0-9À-ÿ\s.,\-¿?¡!:;'"()/#]+$/;
function validarMotivoAnulacion(motivo) {
    if (!motivo || typeof motivo !== 'string') return false;
    const limpio = motivo.trim();
    return limpio.length >= 10 && limpio.length <= 300 && MOTIVO_REGEX.test(limpio);
}

module.exports = { verificarPinAnulacion, validarMotivoAnulacion };
