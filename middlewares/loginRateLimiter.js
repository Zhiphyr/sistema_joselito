// Limita la cantidad de peticiones por IP en una ventana de tiempo,
// para frenar ráfagas de peticiones (doble clic descontrolado, scripts, bots, etc.)
// Fábrica genérica reutilizable por cualquier ruta que necesite este control.
function crearRateLimiter({ ventanaMs, maxPeticiones, mensaje }) {
    const registro = new Map(); // ip -> [timestamps]

    function limpiarAntiguos(timestamps, ahora) {
        return timestamps.filter((ts) => ahora - ts < ventanaMs);
    }

    return (req, res, next) => {
        const ip = req.ip;
        const ahora = Date.now();

        const timestamps = limpiarAntiguos(registro.get(ip) || [], ahora);
        timestamps.push(ahora);
        registro.set(ip, timestamps);

        if (timestamps.length > maxPeticiones) {
            return res.status(429).json({ success: false, message: mensaje });
        }

        next();
    };
}

// Instancia usada históricamente para el login (10 peticiones / 60s por IP).
const loginRateLimiter = crearRateLimiter({
    ventanaMs: 60 * 1000,
    maxPeticiones: 10,
    mensaje: 'Demasiados intentos de acceso desde este origen. Espere un momento e intente de nuevo.'
});

module.exports = loginRateLimiter;
module.exports.crearRateLimiter = crearRateLimiter;
