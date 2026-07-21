const express = require('express');
const router = express.Router();
const perfilController = require('../controllers/perfilController');
const { verificarAdmin } = require('../middlewares/verificarPermisos');

// Rutas base
router.get('/', perfilController.listarPerfiles);
router.post('/', verificarAdmin, perfilController.crear);
router.put('/:id', verificarAdmin, perfilController.actualizar);
router.patch('/:id/estado', verificarAdmin, perfilController.cambiarEstado);
router.get('/:id/usuarios-count', verificarAdmin, perfilController.contarUsuariosAsignados);

// Rutas para opciones y permisos
router.get('/opciones', perfilController.listarOpciones);
router.get('/:id/permisos', perfilController.listarPermisosDePerfil);
router.post('/:id/permisos', verificarAdmin, perfilController.asignarPermisos);

module.exports = router;
