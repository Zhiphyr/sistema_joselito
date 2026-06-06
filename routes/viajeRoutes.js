const express = require('express');
const router = express.Router();
const viajeController = require('../controllers/viajeController');

router.post('/', viajeController.registrarViaje);
router.get('/', viajeController.obtenerHistorialViajes);
router.get('/recepcion/activos', viajeController.obtenerViajesRecepcion);
router.put('/:id/llegada', viajeController.marcarLlegadaViaje);
router.put('/cargas/:id/entregar', viajeController.entregarCarga);
router.get('/:id/cargas', viajeController.obtenerCargasPorViaje);

module.exports = router;
