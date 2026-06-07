const express = require('express');
const router = express.Router();
const liquidacionController = require('../controllers/liquidacionController');
const { verificarAuth } = require('../middlewares/verificarPermisos');

router.use(verificarAuth);

router.get('/liquidables', liquidacionController.listarViajesLiquidables);
router.get('/', liquidacionController.listarLiquidaciones);
router.post('/generar', liquidacionController.generar);
router.get('/:id/pagos', liquidacionController.listarPagosDeLiquidacion); // :id = id_liquidacion
router.post('/pagos', liquidacionController.registrarPago);

module.exports = router;
