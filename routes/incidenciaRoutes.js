const express = require('express');
const router = express.Router();
const incidenciaController = require('../controllers/incidenciaController');
const { verificarAuth } = require('../middlewares/verificarPermisos');

router.use(verificarAuth);

// Tipos de incidencia (catálogo)
router.get('/tipos', incidenciaController.listarTipos);
router.post('/tipos', incidenciaController.registrarTipo);
router.put('/tipos/:id', incidenciaController.actualizarTipo);
router.patch('/tipos/:id/estado', incidenciaController.cambiarEstadoTipo);

// Incidencias sobre cargas
router.get('/', incidenciaController.listar);
router.get('/viajes', incidenciaController.listarViajes);
router.get('/viajes/:id/cargas', incidenciaController.listarCargasDeViaje); // :id = id_viaje
router.post('/', incidenciaController.registrar);
router.post('/masiva', incidenciaController.registrarMasiva);
router.patch('/:id/anular', incidenciaController.anular);

module.exports = router;
