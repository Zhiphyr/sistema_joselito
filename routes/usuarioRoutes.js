const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { verificarAdmin } = require('../middlewares/verificarPermisos');

// Rutas de lectura (abiertas para usuarios con acceso al módulo, según RBAC del frontend)
// Podría protegerse más a nivel general, pero el requerimiento se centra en mutaciones.
router.get('/', usuarioController.listarUsuarios);
router.get('/perfiles', usuarioController.listarPerfilesActivos);

// Rutas de mutación (protegidas por verificarAdmin)
router.post('/', verificarAdmin, usuarioController.registrar);
router.put('/:id', verificarAdmin, usuarioController.actualizar);
router.patch('/:id/estado', verificarAdmin, usuarioController.cambiarEstado);

module.exports = router;
