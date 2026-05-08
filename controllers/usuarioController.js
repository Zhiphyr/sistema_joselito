const UsuarioModel = require('../models/UsuarioModel');
const bcrypt = require('bcryptjs');

const listarUsuarios = async (req, res) => {
    try {
        const usuarios = await UsuarioModel.obtenerUsuarios();
        return res.status(200).json({ success: true, data: usuarios });
    } catch (error) {
        console.error('Error en listarUsuarios:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener usuarios' });
    }
};

const listarPerfilesActivos = async (req, res) => {
    try {
        const perfiles = await UsuarioModel.obtenerPerfilesActivos();
        return res.status(200).json({ success: true, data: perfiles });
    } catch (error) {
        console.error('Error en listarPerfiles:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener perfiles' });
    }
};

const registrar = async (req, res) => {
    try {
        const { id_perfil, nombre, usuario, clave } = req.body;

        if (!id_perfil || !nombre || !usuario || !clave) {
            return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
        }

        // Validar que el usuario no exista
        const existe = await UsuarioModel.findByUsername(usuario);
        if (existe) {
            return res.status(400).json({ success: false, message: 'El nombre de usuario ya está registrado' });
        }

        const hashClave = await bcrypt.hash(clave, 10);

        const id = await UsuarioModel.registrarUsuario({
            id_perfil, nombre, usuario, clave: hashClave
        });

        return res.status(201).json({ success: true, message: 'Usuario registrado exitosamente', id });
    } catch (error) {
        console.error('Error en registrar usuario:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const actualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_perfil, nombre, usuario, clave } = req.body;

        if (!id_perfil || !nombre || !usuario) {
            return res.status(400).json({ success: false, message: 'Nombre, usuario y perfil son obligatorios' });
        }

        const usuarioTarget = await UsuarioModel.obtenerUsuarioPorId(id);
        if (!usuarioTarget) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        const id_perfil_logueado = req.headers['x-user-profile'];

        // Protección DEV (Root): Solo el propio DEV puede editar su cuenta
        if (parseInt(usuarioTarget.id_perfil) === 1 && parseInt(id_perfil_logueado) !== 1) {
            return res.status(403).json({ success: false, message: 'Acceso Denegado: Este usuario está protegido por el sistema' });
        }

        let hashClave = null;
        if (clave && clave.trim() !== '') {
            hashClave = await bcrypt.hash(clave, 10);
        }

        await UsuarioModel.actualizarUsuario(id, {
            id_perfil, nombre, usuario, clave: hashClave
        });

        return res.status(200).json({ success: true, message: 'Usuario actualizado exitosamente' });
    } catch (error) {
        console.error('Error en actualizar usuario:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body; // 0: Inactivo, 1: Activo, 2: Eliminado
        const id_usuario_logueado = req.headers['x-user-id']; // Asumimos que enviamos el ID logueado para validar

        // Regla: Un usuario no puede eliminarse ni desactivarse a sí mismo
        if (parseInt(id) === parseInt(id_usuario_logueado)) {
            return res.status(400).json({ success: false, message: 'No puedes alterar tu propio estado de cuenta' });
        }

        const usuarioTarget = await UsuarioModel.obtenerUsuarioPorId(id);
        if (!usuarioTarget) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        const id_perfil_logueado = req.headers['x-user-profile'];

        // Protección DEV (Root): Nadie (excepto Dev a sí mismo si no estuviera protegido arriba)
        if (parseInt(usuarioTarget.id_perfil) === 1) {
            return res.status(403).json({ success: false, message: 'Acceso Denegado: Este usuario no puede ser eliminado ni desactivado' });
        }

        // Regla: Proteger al administrador de sede (normalmente id 2)
        // Solo el Desarrollador (1) puede desactivarlo o eliminarlo.
        if (parseInt(usuarioTarget.id_perfil) === 2 && parseInt(estado) !== 1) {
            if (parseInt(id_perfil_logueado) !== 1) {
                return res.status(400).json({ success: false, message: 'El administrador principal no puede ser desactivado ni eliminado por este nivel de acceso' });
            }
        }

        const afectados = await UsuarioModel.cambiarEstadoUsuario(id, estado);

        if (afectados > 0) {
            let mensaje = 'Estado actualizado';
            if (estado === 2) mensaje = 'Usuario eliminado correctamente';
            return res.status(200).json({ success: true, message: mensaje });
        } else {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

    } catch (error) {
        console.error('Error en cambiarEstado:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

module.exports = {
    listarUsuarios,
    listarPerfilesActivos,
    registrar,
    actualizar,
    cambiarEstado
};
