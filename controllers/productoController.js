const ProductoModel = require('../models/ProductoModel');

const listarProductos = async (req, res) => {
    try {
        const productos = await ProductoModel.obtenerProductos();
        return res.status(200).json({ success: true, data: productos });
    } catch (error) {
        console.error('Error en listarProductos:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
const registrar = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;

        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({ success: false, message: 'El nombre del producto es obligatorio' });
        }

        const nombreNorm = nombre.trim().toUpperCase();
        const regexNombre = /^[A-Z0-9ÁÉÍÓÚÑ\s\-,.]+$/;
        if (!regexNombre.test(nombreNorm) || nombreNorm.length < 3 || nombreNorm.length > 60) {
            return res.status(400).json({ success: false, message: 'El nombre contiene caracteres inválidos o longitud incorrecta' });
        }

        if (descripcion) {
            const regexDesc = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s,.\n-]*$/;
            if (!regexDesc.test(descripcion.trim()) || descripcion.trim().length > 250) {
                return res.status(400).json({ success: false, message: 'La descripción contiene caracteres inválidos o supera los 250 caracteres' });
            }
        }

        const existe = await ProductoModel.findByNombre(nombreNorm);

        if (existe) {
            if (existe.estado === 0 || existe.estado === 2) {
                return res.status(409).json({
                    success: false,
                    reactivar: true,
                    productoInfo: existe,
                    message: 'El producto ya existe pero está inactivo o eliminado'
                });
            } else {
                return res.status(400).json({ success: false, message: 'Ya existe un producto activo con ese nombre' });
            }
        }

        const id = await ProductoModel.registrarProducto({
            nombre: nombreNorm,
            descripcion: descripcion ? descripcion.trim() : null
        });

        return res.status(201).json({ success: true, message: 'Producto registrado exitosamente', id });
    } catch (error) {
        console.error('Error en registrar producto:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const actualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const { descripcion } = req.body;

        const productoActual = await ProductoModel.obtenerProductoPorId(id);
        if (!productoActual) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado' });
        }

        if (descripcion) {
            const regexDesc = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s,.\n-]*$/;
            if (!regexDesc.test(descripcion.trim()) || descripcion.trim().length > 250) {
                return res.status(400).json({ success: false, message: 'La descripción contiene caracteres inválidos o supera los 250 caracteres' });
            }
        }

        // Se bloquea la edición del nombre del producto (ya que req.body.nombre se ignora)
        await ProductoModel.actualizarProducto(id, { 
            nombre: productoActual.nombre, // Mantenemos el nombre original
            descripcion: descripcion ? descripcion.trim() : null 
        });

        return res.status(200).json({ success: true, message: 'Producto actualizado exitosamente' });

    } catch (error) {
        console.error('Error en actualizar producto:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};


const cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const producto = await ProductoModel.obtenerProductoPorId(id);
        if (!producto) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado' });
        }

        // Si se va a desactivar (0) o eliminar (2), validar viajes activos
        if (estado === 0 || estado === 2) {
            const tieneViajes = await ProductoModel.tieneViajesActivos(id);
            if (tieneViajes) {
                return res.status(409).json({ 
                    success: false, 
                    status: 'active_trips',
                    message: 'No se puede desactivar o eliminar el producto porque está siendo usado en uno o más viajes activos.' 
                });
            }
        }

        const afectados = await ProductoModel.cambiarEstadoProducto(id, estado);

        if (afectados > 0) {
            let mensaje = estado === 2 ? 'Producto eliminado lógicamente' : (estado === 1 ? 'Producto activado/reactivado exitosamente' : 'Producto desactivado');
            return res.status(200).json({ success: true, message: mensaje });
        } else {
            return res.status(404).json({ success: false, message: 'No se pudo cambiar el estado' });
        }
    } catch (error) {
        console.error('Error en cambiarEstado producto:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

module.exports = {
    listarProductos,
    registrar,
    actualizar,
    cambiarEstado
};
