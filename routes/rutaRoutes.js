const express = require('express');
const router = express.Router();
const rutaController = require('../controllers/rutaController');
const { verificarAuth } = require('../middlewares/verificarPermisos');

// Todas las rutas de Rutas requieren estar autenticado (operarios y admins)
router.use(verificarAuth);

router.get('/', rutaController.listarRutas);
router.post('/', rutaController.registrar);
router.put('/:id', rutaController.actualizar);
router.put('/:id/reactivar', rutaController.reactivar);
router.patch('/:id/estado', rutaController.cambiarEstado);

module.exports = router;
