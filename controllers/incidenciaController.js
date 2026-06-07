const IncidenciaModel = require('../models/IncidenciaModel');

// ---------- TIPOS DE INCIDENCIA ----------

const listarTipos = async (req, res) => {
    try {
        const data = await IncidenciaModel.obtenerTipos();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error en listarTipos:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener tipos de incidencia' });
    }
};

const registrarTipo = async (req, res) => {
    try {
        const { nombre, afecta_default } = req.body;
        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({ success: false, message: 'El nombre del tipo es obligatorio' });
        }
        const id = await IncidenciaModel.registrarTipo({ nombre: nombre.trim(), afecta_default });
        return res.status(201).json({ success: true, message: 'Tipo de incidencia registrado', id });
    } catch (error) {
        console.error('Error en registrarTipo:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Ya existe un tipo con ese nombre' });
        }
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const actualizarTipo = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, afecta_default } = req.body;
        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({ success: false, message: 'El nombre del tipo es obligatorio' });
        }
        const afectados = await IncidenciaModel.actualizarTipo(id, { nombre: nombre.trim(), afecta_default });
        if (afectados > 0) {
            return res.status(200).json({ success: true, message: 'Tipo actualizado exitosamente' });
        }
        return res.status(404).json({ success: false, message: 'Tipo no encontrado' });
    } catch (error) {
        console.error('Error en actualizarTipo:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Ya existe un tipo con ese nombre' });
        }
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const cambiarEstadoTipo = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        const afectados = await IncidenciaModel.cambiarEstadoTipo(id, estado);
        if (afectados > 0) {
            const msg = estado === 2 ? 'Tipo eliminado' : (estado === 1 ? 'Tipo activado' : 'Tipo desactivado');
            return res.status(200).json({ success: true, message: msg });
        }
        return res.status(404).json({ success: false, message: 'Tipo no encontrado' });
    } catch (error) {
        console.error('Error en cambiarEstadoTipo:', error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(400).json({ success: false, message: 'No se puede eliminar: hay incidencias usando este tipo' });
        }
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// ---------- INCIDENCIAS (SOBRE CARGAS) ----------

const listar = async (req, res) => {
    try {
        const data = await IncidenciaModel.obtenerIncidencias();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error en listar incidencias:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener incidencias' });
    }
};

const listarViajes = async (req, res) => {
    try {
        const data = await IncidenciaModel.obtenerViajesConCargas();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error en listarViajes:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener viajes' });
    }
};

const listarCargasDeViaje = async (req, res) => {
    try {
        const { id } = req.params; // id_viaje
        const data = await IncidenciaModel.obtenerCargasDeViaje(id);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error en listarCargasDeViaje:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener las cargas del viaje' });
    }
};

const registrar = async (req, res) => {
    try {
        const { id_carga, id_tipo, afecta_a, monto_afectado, descripcion, fecha } = req.body;
        const id_usuario = req.headers['x-user-id'] || 1;

        if (!id_carga || !id_tipo || !afecta_a || !fecha) {
            return res.status(400).json({ success: false, message: 'Carga, tipo, afectación y fecha son obligatorios' });
        }

        const montoNum = Number(monto_afectado) || 0;

        const id = await IncidenciaModel.registrarIncidencia({
            id_carga, id_tipo, afecta_a, monto_afectado: montoNum, descripcion, fecha, id_usuario
        });

        return res.status(201).json({ success: true, message: 'Incidencia registrada exitosamente', id });
    } catch (error) {
        console.error('Error en registrar incidencia:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

/**
 * REGISTRO MASIVO:
 * Recibe { id_tipo, afecta_a, descripcion, fecha, items: [{id_carga, monto_afectado}, ...] }
 * Una sola descripción para varias cargas. El modelo hace el bucle de INSERT.
 */
const registrarMasiva = async (req, res) => {
    try {
        const { id_tipo, afecta_a, descripcion, fecha, items } = req.body;
        const id_usuario = req.headers['x-user-id'] || 1;

        if (!id_tipo || !afecta_a || !fecha) {
            return res.status(400).json({ success: false, message: 'Tipo, afectación y fecha son obligatorios' });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Debe seleccionar al menos una carga' });
        }

        // Normalizar montos
        const itemsLimpios = items.map(it => ({
            id_carga: it.id_carga,
            monto_afectado: Number(it.monto_afectado) || 0
        }));

        const insertados = await IncidenciaModel.registrarIncidenciaMasiva({
            items: itemsLimpios, id_tipo, afecta_a, descripcion, fecha, id_usuario
        });

        return res.status(201).json({
            success: true,
            message: `Se registraron ${insertados} incidencia(s) correctamente`,
            insertados
        });
    } catch (error) {
        console.error('Error en registrarMasiva:', error);
        return res.status(500).json({ success: false, message: 'Error interno al registrar las incidencias' });
    }
};

const anular = async (req, res) => {
    try {
        const { id } = req.params;
        const afectados = await IncidenciaModel.anularIncidencia(id);
        if (afectados > 0) {
            return res.status(200).json({ success: true, message: 'Incidencia anulada' });
        }
        return res.status(404).json({ success: false, message: 'Incidencia no encontrada' });
    } catch (error) {
        console.error('Error en anular incidencia:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

module.exports = {
    listarTipos,
    registrarTipo,
    actualizarTipo,
    cambiarEstadoTipo,
    listar,
    listarViajes,
    listarCargasDeViaje,
    registrar,
    registrarMasiva,
    anular
};
