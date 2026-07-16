const CamionModel = require('../models/CamionModel');

const listarCamiones = async (req, res) => {
    try {
        const camiones = await CamionModel.obtenerCamiones();
        return res.status(200).json({ success: true, data: camiones });
    } catch (error) {
        console.error('Error en listarCamiones:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const listarCamionesDisponibles = async (req, res) => {
    try {
        const camiones = await CamionModel.obtenerCamionesDisponibles();
        return res.status(200).json({ success: true, data: camiones });
    } catch (error) {
        console.error('Error en listarCamionesDisponibles:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const registrar = async (req, res) => {
    try {
        const { nombre, placa, tipo_documento, numero_documento, conductor, direccion, telefono } = req.body;

        if (!nombre || !placa || !tipo_documento || !numero_documento || !conductor || !telefono) {
            return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios (excepto dirección)' });
        }

        const tipoMin = tipo_documento.toLowerCase();
        if (tipoMin === 'dni' && numero_documento.length !== 8) {
            return res.status(400).json({ success: false, message: 'El DNI debe tener 8 dígitos' });
        }
        if (tipoMin === 'ruc' && numero_documento.length !== 11) {
            return res.status(400).json({ success: false, message: 'El RUC debe tener 11 dígitos' });
        }

        if (nombre.trim().length < 3 || nombre.trim().length > 50) {
            return res.status(400).json({ success: false, message: 'El nombre/unidad debe tener entre 3 y 50 caracteres' });
        }
        if (direccion && direccion.trim().length > 150) {
            return res.status(400).json({ success: false, message: 'La dirección no puede exceder los 150 caracteres' });
        }
        const telfRegex = /^9\d{8}$/;
        if (!telfRegex.test(telefono.trim())) {
            return res.status(400).json({ success: false, message: 'El teléfono debe tener 9 dígitos y empezar con 9' });
        }

        const placaNorm = placa.trim().toUpperCase();
        const placaRegex = /^[A-Z0-9]{3}-\d{3}$/;
        if (!placaRegex.test(placaNorm)) {
            return res.status(400).json({ success: false, message: 'El formato de la placa es inválido. (Ej. ABC-123)' });
        }

        const existe = await CamionModel.findByPlaca(placaNorm);

        if (existe) {
            if (existe.estado === 1 || existe.estado === 0) {
                // Camión activo o inactivo: no se puede duplicar
                return res.status(400).json({
                    success: false,
                    message: `La placa ${placaNorm} ya se encuentra registrada en el sistema`
                });
            } else if (existe.estado === 2) {
                // Camión eliminado: ofrecer reactivación al frontend
                return res.status(409).json({
                    success: false,
                    status: 'deleted_exists',
                    id_camion: existe.id_camion,
                    camionInfo: existe,
                    message: `La placa ${placaNorm} pertenece a un camión que fue eliminado anteriormente`
                });
            }
        }

        const id = await CamionModel.registrarCamion({ 
            nombre: nombre.trim(), 
            placa: placaNorm, 
            tipo_documento, 
            numero_documento, 
            conductor: conductor.trim(), 
            direccion: direccion ? direccion.trim() : null, 
            telefono: telefono.trim() 
        });
        return res.status(201).json({ success: true, message: 'Camión registrado exitosamente', id });

    } catch (error) {
        console.error('Error en registrar camión:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const actualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, tipo_documento, numero_documento, conductor, direccion, telefono } = req.body;

        if (!nombre || !tipo_documento || !numero_documento || !conductor || !telefono) {
            return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios (excepto dirección)' });
        }

        const camion = await CamionModel.obtenerCamionPorId(id);
        if (!camion) {
            return res.status(404).json({ success: false, message: 'Camión no encontrado' });
        }

        if (nombre.trim().length < 3 || nombre.trim().length > 50) {
            return res.status(400).json({ success: false, message: 'El nombre/unidad debe tener entre 3 y 50 caracteres' });
        }
        if (direccion && direccion.trim().length > 150) {
            return res.status(400).json({ success: false, message: 'La dirección no puede exceder los 150 caracteres' });
        }
        const telfRegex = /^9\d{8}$/;
        if (!telfRegex.test(telefono.trim())) {
            return res.status(400).json({ success: false, message: 'El teléfono debe tener 9 dígitos y empezar con 9' });
        }

        await CamionModel.actualizarCamion(id, { 
            nombre: nombre.trim(), 
            tipo_documento, 
            numero_documento, 
            conductor: conductor.trim(), 
            direccion: direccion ? direccion.trim() : null, 
            telefono: telefono.trim() 
        });
        return res.status(200).json({ success: true, message: 'Camión actualizado exitosamente' });

    } catch (error) {
        console.error('Error en actualizar camión:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const reactivar = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, tipo_documento, numero_documento, conductor, direccion, telefono } = req.body;

        const camion = await CamionModel.obtenerCamionPorId(id);
        if (!camion) {
            return res.status(404).json({ success: false, message: 'Camión no encontrado' });
        }

        if (camion.estado !== 2) {
            return res.status(400).json({ success: false, message: 'Solo se pueden reactivar camiones eliminados' });
        }

        await CamionModel.reactivarCamion(id, {
            nombre: nombre ? nombre.trim() : camion.nombre,
            tipo_documento: tipo_documento || camion.tipo_documento,
            numero_documento: numero_documento || camion.numero_documento,
            conductor: conductor ? conductor.trim() : camion.conductor,
            direccion: direccion ? direccion.trim() : camion.direccion,
            telefono: telefono ? telefono.trim() : camion.telefono
        });

        return res.status(200).json({ success: true, message: 'Camión reactivado exitosamente' });

    } catch (error) {
        console.error('Error en reactivar camión:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const camion = await CamionModel.obtenerCamionPorId(id);
        if (!camion) {
            return res.status(404).json({ success: false, message: 'Camión no encontrado' });
        }

        if (estado === 0 || estado === 2) {
            const tieneActivos = await CamionModel.tieneViajesActivos(id);
            if (tieneActivos) {
                return res.status(400).json({ 
                    success: false, 
                    status: 'active_trips',
                    message: 'No se puede realizar esta acción porque el camión se encuentra en medio de un viaje activo.' 
                });
            }
        }

        const afectados = await CamionModel.cambiarEstadoCamion(id, estado);

        if (afectados > 0) {
            const mensaje =
                estado === 2 ? 'Camión eliminado del sistema' :
                estado === 1 ? 'Camión activado exitosamente' :
                'Camión desactivado exitosamente';
            return res.status(200).json({ success: true, message: mensaje });
        } else {
            return res.status(404).json({ success: false, message: 'No se pudo cambiar el estado' });
        }

    } catch (error) {
        console.error('Error en cambiarEstado camión:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const consultarDocumento = async (req, res) => {
    try {
        const { tipo, numero } = req.params;

        if (!tipo || !numero) {
            return res.status(400).json({ success: false, message: 'Tipo y número de documento requeridos' });
        }

        const tipoMin = tipo.toLowerCase();
        if (tipoMin !== 'dni' && tipoMin !== 'ruc') {
            return res.status(400).json({ success: false, message: 'Tipo de documento inválido. Use dni o ruc.' });
        }

        const url = `https://miapi.cloud/v1/${tipoMin}/${numero}`;
        const token = process.env.MIAPICLOUD_TOKEN;

        if (!token || token === 'coloca_tu_token_aqui_antes_de_usarlo') {
            return res.status(500).json({ success: false, message: 'El token de MiApiCloud no está configurado.' });
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok && data && data.success && data.datos) {
            const datos = data.datos;
            let nombreCompleto = '';
            let direccionCompleta = '';

            if (tipoMin === 'ruc') {
                nombreCompleto = datos.razon_social || '';
            } else {
                nombreCompleto = `${datos.nombres || ''} ${datos.ape_paterno || ''} ${datos.ape_materno || ''}`.trim();
            }

            if (datos.domiciliado) {
                const dom = datos.domiciliado;
                let dirParts = [dom.direccion, dom.distrito, dom.provincia, dom.departamento].filter(Boolean);
                direccionCompleta = dirParts.join(', ');
            }

            if (!nombreCompleto) {
                return res.status(404).json({ success: false, message: 'Documento no encontrado o formato desconocido' });
            }

            return res.status(200).json({ success: true, nombre: nombreCompleto, direccion: direccionCompleta });
        } else {
            return res.status(404).json({ success: false, message: 'Documento no encontrado en la base de datos externa' });
        }

    } catch (error) {
        console.error('Error en consultarDocumento:', error);
        return res.status(500).json({ success: false, message: 'Error interno de comunicación externa' });
    }
};

const obtenerIncidenciasPendientesPorCamion = async (req, res) => {
    try {
        const { id } = req.params;
        const db = require('../config/db'); // Necesitamos db directamente para consultas complejas o podemos usar un modelo
        
        const sql = `
            SELECT 
                iv.id_incidencia,
                iv.tipo_incidencia,
                iv.monto_descuento_chofer,
                iv.monto_cobrado,
                v.id_viaje,
                (iv.monto_descuento_chofer - iv.monto_cobrado) AS saldo_deuda
            FROM incidencia_viaje iv
            JOIN viaje v ON iv.id_viaje = v.id_viaje
            JOIN camiones c ON v.id_camion = c.id_camion
            WHERE c.numero_documento = (SELECT numero_documento FROM camiones WHERE id_camion = ?)
              AND iv.estado = 1
              AND iv.monto_descuento_chofer IS NOT NULL
              AND iv.estado_cobro_penalidad IN ('Pendiente', 'Cobrado Parcial')
              AND (iv.monto_descuento_chofer - iv.monto_cobrado) > 0
        `;
        
        const [rows] = await db.query(sql, [id]);
        
        return res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error('Error en obtenerIncidenciasPendientesPorCamion:', error);
        return res.status(500).json({ success: false, message: 'Error interno al obtener incidencias pendientes' });
    }
};

module.exports = {
    listarCamiones,
    listarCamionesDisponibles,
    registrar,
    actualizar,
    reactivar,
    cambiarEstado,
    consultarDocumento,
    obtenerIncidenciasPendientesPorCamion
};
