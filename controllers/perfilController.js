const PerfilModel = require('../models/PerfilModel');
const UsuarioModel = require('../models/UsuarioModel');

const listarPerfiles = async (req, res) => {
    try {
        const perfiles = await PerfilModel.obtenerPerfiles();
        return res.status(200).json({ success: true, data: perfiles });
    } catch (error) {
        console.error('Error en listarPerfiles:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const crear = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;

        if (!nombre) {
            return res.status(400).json({ success: false, message: 'El nombre del perfil es obligatorio' });
        }

        const id = await PerfilModel.crearPerfil({ nombre, descripcion });
        return res.status(201).json({ success: true, message: 'Perfil creado exitosamente', id });
    } catch (error) {
        console.error('Error en crear perfil:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Ya existe un perfil con ese nombre' });
        }
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const actualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion } = req.body;

        if (!nombre) {
            return res.status(400).json({ success: false, message: 'El nombre es obligatorio' });
        }

        if (parseInt(id) === 1) {
            return res.status(403).json({ success: false, message: 'El perfil Desarrollador está protegido por el sistema' });
        }

        if (parseInt(id) === 2) {
            if (nombre.toLowerCase() !== 'administrador') {
                return res.status(400).json({ success: false, message: 'El nombre del Perfil Administrador Principal no puede ser alterado' });
            }
        }

        await PerfilModel.actualizarPerfil(id, { nombre, descripcion });
        return res.status(200).json({ success: true, message: 'Perfil actualizado exitosamente' });
    } catch (error) {
        console.error('Error en actualizar perfil:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Ya existe un perfil con ese nombre' });
        }
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const contarUsuariosAsignados = async (req, res) => {
    try {
        const { id } = req.params;
        const count = await UsuarioModel.contarUsuariosPorPerfil(id);
        return res.status(200).json({ success: true, count });
    } catch (error) {
        console.error('Error al contar usuarios por perfil:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const id_perfil_logueado = req.headers['x-user-profile'];

        if (parseInt(id) === 1) {
            return res.status(403).json({ success: false, message: 'El perfil Desarrollador no puede ser alterado' });
        }

        if (parseInt(id) === 2) {
            if (parseInt(id_perfil_logueado) !== 1) {
                return res.status(403).json({ success: false, message: 'El perfil Administrador Principal no puede ser desactivado ni eliminado por este nivel de acceso' });
            }
        }

        // Si se va a desactivar o eliminar, desactivamos a los usuarios asociados
        if (estado === 0 || estado === 2) {
            await UsuarioModel.desactivarUsuariosPorPerfil(id);
        }

        const afectados = await PerfilModel.cambiarEstadoPerfil(id, estado);

        if (afectados > 0) {
            let mensaje = estado === 2 ? 'Perfil eliminado correctamente y usuarios vinculados desactivados' : 'Estado actualizado y usuarios vinculados gestionados';
            return res.status(200).json({ success: true, message: mensaje });
        } else {
            return res.status(404).json({ success: false, message: 'Perfil no encontrado' });
        }
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(400).json({ success: false, message: 'No se puede eliminar: Hay usuarios asignados a este perfil' });
        }
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const listarOpciones = async (req, res) => {
    try {
        const opciones = await PerfilModel.obtenerOpcionesActivas();
        return res.status(200).json({ success: true, data: opciones });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error al obtener opciones' });
    }
};

const listarPermisosDePerfil = async (req, res) => {
    try {
        const { id } = req.params;
        const opcionesAsignadas = await PerfilModel.obtenerOpcionesPorPerfil(id);
        return res.status(200).json({ success: true, data: opcionesAsignadas });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error al obtener permisos del perfil' });
    }
};

const asignarPermisos = async (req, res) => {
    try {
        const { id } = req.params;
        const { opciones } = req.body;

        const id_perfil_logueado = req.headers['x-user-profile'];

        if (parseInt(id) === 1) {
            return res.status(403).json({ success: false, message: 'Los permisos del Desarrollador están protegidos' });
        }

        if (parseInt(id) === 2) {
            if (parseInt(id_perfil_logueado) !== 1) {
                return res.status(403).json({ success: false, message: 'Los permisos del Administrador Principal solo pueden ser modificados por el Desarrollador' });
            }
        }

        if (!Array.isArray(opciones)) {
            return res.status(400).json({ success: false, message: 'El formato de opciones es inválido' });
        }

        await PerfilModel.guardarPermisos(id, opciones);
        return res.status(200).json({ success: true, message: 'Permisos actualizados correctamente' });
    } catch (error) {
        console.error('Error al guardar permisos:', error);
        return res.status(500).json({ success: false, message: 'Error interno al guardar los permisos' });
    }
};

module.exports = {
    listarPerfiles,
    crear,
    actualizar,
    contarUsuariosAsignados,
    cambiarEstado,
    listarOpciones,
    listarPermisosDePerfil,
    asignarPermisos
};
