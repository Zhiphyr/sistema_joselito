const UsuarioModel = require('../models/UsuarioModel');
const bcrypt = require('bcryptjs');

const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 5;

const login = async (req, res) => {
    try {
        const { usuario, clave } = req.body;

        if (!usuario || !clave) {
            return res.status(400).json({ success: false, message: 'Usuario y clave son requeridos' });
        }

        // Buscar el usuario en la BD
        const user = await UsuarioModel.findByUsername(usuario);

        if (!user) {
            return res.status(404).json({ success: false, message: 'Credenciales incorrectas' });
        }

        // Validar que el usuario esté activo
        if (user.estado !== 1) {
            return res.status(403).json({ success: false, message: 'El usuario se encuentra inactivo o bloqueado' });
        }

        // Validar que su perfil esté activo
        if (user.estado_perfil !== 1) {
            return res.status(403).json({ success: false, message: 'El perfil de este usuario está inactivo' });
        }

        // Si el usuario está en periodo de bloqueo por intentos fallidos, no dejarlo pasar
        // aunque las credenciales que envíe ahora sean correctas.
        if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
            const minutosRestantes = Math.ceil((new Date(user.bloqueado_hasta) - new Date()) / 60000);
            return res.status(423).json({
                success: false,
                message: `Cuenta bloqueada por intentos fallidos. Intente nuevamente en ${minutosRestantes} minuto(s).`
            });
        }

        // Comparar contraseñas
        const isMatch = await bcrypt.compare(clave, user.clave);

        if (!isMatch) {
            const estado = await UsuarioModel.registrarIntentoFallido(user.id_usuario, MAX_INTENTOS, MINUTOS_BLOQUEO);

            if (estado.bloqueado_hasta && new Date(estado.bloqueado_hasta) > new Date()) {
                return res.status(423).json({
                    success: false,
                    message: `Ha superado el número de intentos permitidos. Cuenta bloqueada por ${MINUTOS_BLOQUEO} minutos.`
                });
            }

            const intentosRestantes = MAX_INTENTOS - estado.intentos_fallidos;
            return res.status(401).json({
                success: false,
                message: `Credenciales incorrectas. Le queda(n) ${intentosRestantes} intento(s) antes del bloqueo.`
            });
        }

        // Login correcto: limpiar contador de intentos fallidos
        await UsuarioModel.resetearIntentosFallidos(user.id_usuario);

        // Si todo es correcto, responder con los datos básicos
        return res.status(200).json({
            success: true,
            message: 'Login exitoso',
            data: {
                id_usuario: user.id_usuario,
                nombre: user.nombre,
                id_perfil: user.id_perfil,
                perfil: user.nombre_perfil
            }
        });

    } catch (error) {
        console.error('Error en el login:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

module.exports = {
    login
};
