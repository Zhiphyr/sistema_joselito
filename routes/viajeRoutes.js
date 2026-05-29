const express = require('express');
const router = express.Router();
const viajeController = require('../controllers/viajeController');

router.post('/', viajeController.registrarViaje);
router.get('/', viajeController.obtenerHistorialViajes);

module.exports = router;
