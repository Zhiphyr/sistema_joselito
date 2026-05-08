const UsuarioModel = require('../models/UsuarioModel');
const bcrypt = require('bcryptjs');

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

        // Comparar contraseñas
        const isMatch = await bcrypt.compare(clave, user.clave);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }

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
