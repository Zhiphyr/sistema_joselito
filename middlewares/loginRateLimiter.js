// Limita la cantidad de peticiones de login por IP en una ventana de tiempo,
// para frenar ráfagas de peticiones (doble clic descontrolado, scripts, etc.)
// independientemente del bloqueo por cuenta que maneja authController.
const VENTANA_MS = 60 * 1000; // 1 minuto
const MAX_PETICIONES = 10;

const registro = new Map(); // ip -> [timestamps]

function limpiarAntiguos(timestamps, ahora) {
    return timestamps.filter((ts) => ahora - ts < VENTANA_MS);
}

const loginRateLimiter = (req, res, next) => {
    const ip = req.ip;
    const ahora = Date.now();

    const timestamps = limpiarAntiguos(registro.get(ip) || [], ahora);
    timestamps.push(ahora);
    registro.set(ip, timestamps);

    if (timestamps.length > MAX_PETICIONES) {
        return res.status(429).json({
            success: false,
            message: 'Demasiados intentos de acceso desde este origen. Espere un momento e intente de nuevo.'
        });
    }

    next();
};

module.exports = loginRateLimiter;
