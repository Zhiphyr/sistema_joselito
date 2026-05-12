const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const { verificarAuth } = require('../middlewares/verificarPermisos');

// Todas las rutas de productos requieren estar autenticado
router.use(verificarAuth);

router.get('/', productoController.listarProductos);
router.post('/', productoController.registrar);
router.put('/:id', productoController.actualizar);
router.patch('/:id/estado', productoController.cambiarEstado);

module.exports = router;
