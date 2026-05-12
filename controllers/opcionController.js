const OpcionModel = require('../models/OpcionModel');

const listar = async (req, res) => {
    try {
        const opciones = await OpcionModel.obtenerOpciones();
        return res.status(200).json({ success: true, data: opciones });
    } catch (error) {
        console.error('Error en listar opciones:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const registrar = async (req, res) => {
    try {
        const { nombre, ruta, icono } = req.body;

        if (!nombre || !ruta || !icono) {
            return res.status(400).json({ success: false, message: 'Todos los campos (nombre, ruta, icono) son obligatorios' });
        }

        const id = await OpcionModel.registrarOpcion({ nombre, ruta, icono });
        return res.status(201).json({ success: true, message: 'Opción registrada exitosamente', id });
    } catch (error) {
        console.error('Error en registrar opción:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Posible registro duplicado' });
        }
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const actualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, ruta, icono } = req.body;

        if (!nombre || !ruta || !icono) {
            return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
        }

        const afectados = await OpcionModel.actualizarOpcion(id, { nombre, ruta, icono });
        if (afectados > 0) {
            return res.status(200).json({ success: true, message: 'Opción actualizada exitosamente' });
        } else {
            return res.status(404).json({ success: false, message: 'Opción no encontrada' });
        }
    } catch (error) {
        console.error('Error en actualizar opción:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (parseInt(id) === 1) {
            return res.status(403).json({ success: false, message: 'La opción principal del sistema no puede ser desactivada' });
        }

        const afectados = await OpcionModel.cambiarEstadoOpcion(id, estado);

        if (afectados > 0) {
            let mensaje = estado === 2 ? 'Opción eliminada lógicamente' : 'Estado de la opción actualizado';
            return res.status(200).json({ success: true, message: mensaje });
        } else {
            return res.status(404).json({ success: false, message: 'Opción no encontrada' });
        }
    } catch (error) {
        console.error('Error en cambiarEstado de opción:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

module.exports = {
    listar,
    registrar,
    actualizar,
    cambiarEstado
};
