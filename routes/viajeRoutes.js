const express = require('express');
const router = express.Router();
const viajeController = require('../controllers/viajeController');
const { upload } = require('../config/cloudinary');

router.post('/', viajeController.registrarViaje);
router.get('/liquidaciones/pendientes', viajeController.obtenerLiquidacionesPendientes);
router.get('/liquidaciones/historial', viajeController.obtenerHistorialLiquidaciones);
router.get('/', viajeController.obtenerHistorialViajes);
router.get('/recepcion/activos', viajeController.obtenerViajesRecepcion);
router.get('/:id', viajeController.obtenerViajePorId);
router.put('/:id/llegada', viajeController.marcarLlegadaViaje);
router.put('/cargas/:id/entregar', viajeController.entregarCarga);
router.put('/cargas/:id/rechazar', viajeController.rechazarCarga);
router.post('/cargas/:id/entrega-parcial', viajeController.entregaParcialCarga);
router.get('/:id/cargas', viajeController.obtenerCargasPorViaje);
router.post('/transbordo', viajeController.confirmarTransbordo);
router.get('/:id/incidencias', viajeController.obtenerIncidenciasViaje);
router.post('/:id/incidencias', viajeController.registrarIncidenciaViaje);
router.get('/:id/adelantos', viajeController.obtenerAdelantosViaje);

router.post('/:id/liquidar', upload.single('evidencia'), viajeController.liquidarViaje);

module.exports = router;
