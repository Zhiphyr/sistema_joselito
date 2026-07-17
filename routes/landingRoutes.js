const express = require('express');
const router = express.Router();
const landingController = require('../controllers/landingController');

router.get('/rutas', landingController.getRutas);
router.post('/cotizar', landingController.calcularCotizacion);

module.exports = router;
