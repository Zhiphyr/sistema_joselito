const RutaModel = require('../models/RutaModel');

const listarRutas = async (req, res) => {
    try {
        const rutas = await RutaModel.obtenerRutas();
        return res.status(200).json({ success: true, data: rutas });
    } catch (error) {
        console.error('Error en listarRutas:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const registrar = async (req, res) => {
    try {
        const { ciudad_origen, ciudad_destino, descripcion } = req.body;

        if (!ciudad_origen || !ciudad_destino) {
            return res.status(400).json({ success: false, message: 'Ciudad de origen y destino son obligatorias' });
        }

        const regexCiudades = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
        if (!regexCiudades.test(ciudad_origen) || ciudad_origen.length > 50) {
            return res.status(400).json({ success: false, message: 'La ciudad de origen tiene caracteres inválidos o supera los 50 caracteres.' });
        }
        if (!regexCiudades.test(ciudad_destino) || ciudad_destino.length > 50) {
            return res.status(400).json({ success: false, message: 'La ciudad de destino tiene caracteres inválidos o supera los 50 caracteres.' });
        }

        if (descripcion) {
            const regexDesc = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s,.\n-]+$/;
            if (!regexDesc.test(descripcion) || descripcion.length > 300) {
                return res.status(400).json({ success: false, message: 'La descripción contiene caracteres inválidos o supera los 300 caracteres.' });
            }
        }

        const origenNorm = ciudad_origen.replace(/\s{2,}/g, ' ').trim().toUpperCase();
        const destinoNorm = ciudad_destino.replace(/\s{2,}/g, ' ').trim().toUpperCase();

        if (origenNorm === destinoNorm) {
            return res.status(400).json({ success: false, message: 'El origen y destino no pueden ser iguales' });
        }

        const existe = await RutaModel.findByOrigenDestino(origenNorm, destinoNorm);

        if (existe) {
            if (existe.estado === 1 || existe.estado === 0) {
                // Ruta activa o inactiva: no se puede duplicar
                return res.status(400).json({
                    success: false,
                    message: `La ruta de ${origenNorm} a ${destinoNorm} ya se encuentra registrada en el sistema`
                });
            } else if (existe.estado === 2) {
                // Ruta eliminada: ofrecer reactivación al frontend
                return res.status(409).json({
                    success: false,
                    status: 'deleted_exists',
                    id_ruta: existe.id_ruta,
                    rutaInfo: existe,
                    message: `La ruta de ${origenNorm} a ${destinoNorm} pertenece a un registro que fue eliminado anteriormente`
                });
            }
        }

        const id = await RutaModel.registrarRuta({
            ciudad_origen: origenNorm,
            ciudad_destino: destinoNorm,
            descripcion: descripcion ? descripcion.trim() : null
        });
        return res.status(201).json({ success: true, message: 'Ruta registrada exitosamente', id });

    } catch (error) {
        console.error('Error en registrar ruta:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const actualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const { descripcion } = req.body;

        const ruta = await RutaModel.obtenerRutaPorId(id);
        if (!ruta) {
            return res.status(404).json({ success: false, message: 'Ruta no encontrada' });
        }

        // Se bloquea explícitamente cualquier intento de actualizar ciudad_origen y ciudad_destino.
        // Solo pasamos descripcion al modelo.

        if (descripcion) {
            const regexDesc = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s,.\n-]+$/;
            if (!regexDesc.test(descripcion) || descripcion.length > 300) {
                return res.status(400).json({ success: false, message: 'La descripción contiene caracteres inválidos o supera los 300 caracteres.' });
            }
        }
        await RutaModel.actualizarRuta(id, { descripcion: descripcion ? descripcion.trim() : null });
        return res.status(200).json({ success: true, message: 'Ruta actualizada exitosamente' });

    } catch (error) {
        console.error('Error en actualizar ruta:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const reactivar = async (req, res) => {
    try {
        const { id } = req.params;
        const { descripcion } = req.body;

        const ruta = await RutaModel.obtenerRutaPorId(id);
        if (!ruta) {
            return res.status(404).json({ success: false, message: 'Ruta no encontrada' });
        }

        if (ruta.estado !== 2) {
            return res.status(400).json({ success: false, message: 'Solo se pueden reactivar rutas eliminadas' });
        }

        await RutaModel.reactivarRuta(id, {
            descripcion: descripcion ? descripcion.trim() : ruta.descripcion
        });

        return res.status(200).json({ success: true, message: 'Ruta reactivada exitosamente' });

    } catch (error) {
        console.error('Error en reactivar ruta:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const ruta = await RutaModel.obtenerRutaPorId(id);
        if (!ruta) {
            return res.status(404).json({ success: false, message: 'Ruta no encontrada' });
        }

        // Si se va a desactivar (0) o eliminar (2), validar viajes activos
        if (estado === 0 || estado === 2) {
            const tieneViajes = await RutaModel.tieneViajesActivos(id);
            if (tieneViajes) {
                return res.status(409).json({ 
                    success: false, 
                    status: 'active_trips',
                    message: 'No se puede desactivar o eliminar la ruta porque está asignada a uno o más viajes activos.' 
                });
            }
        }

        const afectados = await RutaModel.cambiarEstadoRuta(id, estado);

        if (afectados > 0) {
            const mensaje =
                estado === 2 ? 'Ruta eliminada del sistema' :
                estado === 1 ? 'Ruta activada exitosamente' :
                'Ruta desactivada exitosamente';
            return res.status(200).json({ success: true, message: mensaje });
        } else {
            return res.status(404).json({ success: false, message: 'No se pudo cambiar el estado' });
        }

    } catch (error) {
        console.error('Error en cambiarEstado ruta:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

module.exports = {
    listarRutas,
    registrar,
    actualizar,
    reactivar,
    cambiarEstado
};
