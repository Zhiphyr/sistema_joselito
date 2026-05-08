const express = require('express');
const router = express.Router();
const opcionController = require('../controllers/opcionController');
const { verificarDeveloper } = require('../middlewares/verificarPermisos');

// TODAS las rutas de opciones son exclusivamente para el Desarrollador
router.get('/', verificarDeveloper, opcionController.listar);
router.post('/', verificarDeveloper, opcionController.registrar);
router.put('/:id', verificarDeveloper, opcionController.actualizar);
router.patch('/:id/estado', verificarDeveloper, opcionController.cambiarEstado);

module.exports = router;
