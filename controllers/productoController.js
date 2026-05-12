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

        // Validar unicidad y lógica de reactivación
        const existe = await ProductoModel.findByNombre(nombre.trim());
        
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
            nombre: nombre.trim(), 
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
        const { nombre, descripcion } = req.body;

        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({ success: false, message: 'El nombre del producto es obligatorio' });
        }

        const productoActual = await ProductoModel.obtenerProductoPorId(id);
        if (!productoActual) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado' });
        }

        // Validar que el nuevo nombre no choque con otro producto diferente
        const existe = await ProductoModel.findByNombre(nombre.trim());
        if (existe && existe.id_producto != id) {
            return res.status(400).json({ success: false, message: 'Ya existe otro producto con ese nombre' });
        }

        await ProductoModel.actualizarProducto(id, { 
            nombre: nombre.trim(), 
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
