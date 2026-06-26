const express = require('express');
const router = express.Router();
const camionController = require('../controllers/camionController');
const { verificarAuth } = require('../middlewares/verificarPermisos');

router.use(verificarAuth);

router.get('/', camionController.listarCamiones);
router.post('/', camionController.registrar);
router.put('/:id', camionController.actualizar);
router.put('/:id/reactivar', camionController.reactivar);
router.patch('/:id/estado', camionController.cambiarEstado);
router.get('/consultar-documento/:tipo/:numero', camionController.consultarDocumento);
router.get('/:id/incidencias_pendientes', camionController.obtenerIncidenciasPendientesPorCamion);

module.exports = router;
