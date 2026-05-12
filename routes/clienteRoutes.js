const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const { verificarAuth } = require('../middlewares/verificarPermisos');

// Todas las rutas de clientes requieren estar autenticado (operarios y admins)
router.use(verificarAuth);

router.get('/', clienteController.listarClientes);
router.post('/', clienteController.registrar);
router.put('/:id', clienteController.actualizar);
router.patch('/:id/estado', clienteController.cambiarEstado);
router.get('/consultar-documento/:tipo/:numero', clienteController.consultarDocumento);

module.exports = router;
