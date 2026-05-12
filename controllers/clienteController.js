const ClienteModel = require('../models/ClienteModel');

const listarClientes = async (req, res) => {
    try {
        const clientes = await ClienteModel.obtenerClientes();
        return res.status(200).json({ success: true, data: clientes });
    } catch (error) {
        console.error('Error en listarClientes:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const registrar = async (req, res) => {
    try {
        const { tipo_documento, numero_documento, nombre_razon_social, direccion, telefono, correo } = req.body;

        if (!tipo_documento || !numero_documento || !nombre_razon_social || !direccion || !telefono) {
            return res.status(400).json({ success: false, message: 'Los campos marcados con * son obligatorios' });
        }

        // Validación estricta de documentos en backend
        if (tipo_documento === 'DNI' && numero_documento.length !== 8) {
            return res.status(400).json({ success: false, message: 'El DNI debe tener 8 dígitos' });
        }
        if (tipo_documento === 'RUC' && numero_documento.length !== 11) {
            return res.status(400).json({ success: false, message: 'El RUC debe tener 11 dígitos' });
        }

        // Validar unicidad
        const existe = await ClienteModel.findByDocumento(numero_documento);
        
        if (existe) {
            // Lógica de Reactivación
            if (existe.estado === 0 || existe.estado === 2) {
                return res.status(409).json({ 
                    success: false, 
                    reactivar: true, 
                    clienteInfo: existe,
                    message: 'El cliente ya se encuentra registrado pero está desactivado o eliminado' 
                });
            } else {
                return res.status(400).json({ success: false, message: 'Ya existe un cliente activo con ese número de documento' });
            }
        }

        const id = await ClienteModel.registrarCliente({
            tipo_documento, numero_documento, nombre_razon_social, direccion, telefono, correo
        });

        return res.status(201).json({ success: true, message: 'Cliente registrado exitosamente', id });
    } catch (error) {
        console.error('Error en registrar cliente:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const actualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_razon_social, direccion, telefono, correo } = req.body;

        if (!nombre_razon_social || !direccion || !telefono) {
            return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
        }

        const cliente = await ClienteModel.obtenerClientePorId(id);
        if (!cliente) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }

        // Actualizamos (los documentos son inmutables, no se actualizan)
        await ClienteModel.actualizarCliente(id, { nombre_razon_social, direccion, telefono, correo });
        return res.status(200).json({ success: true, message: 'Cliente actualizado exitosamente' });
    } catch (error) {
        console.error('Error en actualizar cliente:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body; 

        const cliente = await ClienteModel.obtenerClientePorId(id);
        if (!cliente) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }

        const afectados = await ClienteModel.cambiarEstadoCliente(id, estado);

        if (afectados > 0) {
            let mensaje = estado === 2 ? 'Cliente eliminado lógicamente' : (estado === 1 ? 'Cliente activado/reactivado exitosamente' : 'Cliente desactivado');
            return res.status(200).json({ success: true, message: mensaje });
        } else {
            return res.status(404).json({ success: false, message: 'No se pudo cambiar el estado' });
        }
    } catch (error) {
        console.error('Error en cambiarEstado cliente:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const consultarDocumento = async (req, res) => {
    try {
        const { tipo, numero } = req.params;

        if (!tipo || !numero) {
            return res.status(400).json({ success: false, message: 'Tipo y número de documento requeridos' });
        }

        // Validar tipos
        const tipoMin = tipo.toLowerCase();
        if (tipoMin !== 'dni' && tipoMin !== 'ruc') {
            return res.status(400).json({ success: false, message: 'Tipo de documento inválido. Use dni o ruc.' });
        }

        const url = `https://miapi.cloud/v1/${tipoMin}/${numero}`;
        const token = process.env.MIAPICLOUD_TOKEN;

        if (!token || token === 'coloca_tu_token_aqui_antes_de_usarlo') {
            return res.status(500).json({ success: false, message: 'El token de MiApiCloud no está configurado en el servidor.' });
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
                // Formatear dirección limpiando comas vacías
                let dirParts = [dom.direccion, dom.distrito, dom.provincia, dom.departamento].filter(Boolean);
                direccionCompleta = dirParts.join(', ');
            }

            if (!nombreCompleto) {
                return res.status(404).json({ success: false, message: 'Documento no encontrado o formato de respuesta desconocido' });
            }

            return res.status(200).json({ success: true, nombre: nombreCompleto, direccion: direccionCompleta });
        } else {
            return res.status(404).json({ success: false, message: 'Documento no encontrado en la base de datos externa' });
        }

    } catch (error) {
        console.error('Error en consultarDocumento:', error);
        return res.status(500).json({ success: false, message: 'Error interno de comunicación con el servicio externo' });
    }
};

module.exports = {
    listarClientes,
    registrar,
    actualizar,
    cambiarEstado,
    consultarDocumento
};
