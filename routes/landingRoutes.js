const express = require('express');
const router = express.Router();
const landingController = require('../controllers/landingController');
const { crearRateLimiter } = require('../middlewares/loginRateLimiter');

const cotizarRateLimiter = crearRateLimiter({
    ventanaMs: 60 * 60 * 1000, // 1 hora
    maxPeticiones: 5,
    mensaje: 'Ha alcanzado el límite de cotizaciones por hora desde este origen. Intente de nuevo más tarde.'
});

router.get('/rutas', landingController.getRutas);
router.get('/productos', landingController.getProductosCatalogo);
router.post('/cotizar', cotizarRateLimiter, landingController.calcularCotizacion);

module.exports = router;
