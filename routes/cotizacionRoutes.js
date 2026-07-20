const express = require('express');
const router = express.Router();
const cotizacionController = require('../controllers/cotizacionController');
const { verificarAuth } = require('../middlewares/verificarPermisos');

router.use(verificarAuth);

router.get('/', cotizacionController.listarCotizacionesDataTable);
router.get('/:id', cotizacionController.obtenerCotizacionDetalle);
router.patch('/:id/rechazar', cotizacionController.rechazarCotizacion);
router.post('/:id/aprobar', cotizacionController.aprobarCotizacion);

module.exports = router;
