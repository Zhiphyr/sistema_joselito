const express = require('express');
const router = express.Router();
const dashboardFinancieroController = require('../controllers/dashboardFinancieroController');
const { verificarAuth } = require('../middlewares/verificarPermisos');

router.use(verificarAuth);

router.get('/resumen', dashboardFinancieroController.obtenerResumen);
router.get('/cuentas-resumen', dashboardFinancieroController.obtenerResumenCuentas);
router.get('/cuentas/:id/movimientos', dashboardFinancieroController.obtenerMovimientosCuenta);
router.get('/billeteras/:id/movimientos', dashboardFinancieroController.obtenerMovimientosBilletera);
router.get('/flujo-diario', dashboardFinancieroController.obtenerFlujoDiario);
router.get('/distribucion-gastos', dashboardFinancieroController.obtenerDistribucionGastos);
router.get('/ultimos-movimientos', dashboardFinancieroController.obtenerUltimosMovimientos);
router.post('/ingreso-manual', dashboardFinancieroController.registrarIngresoManual);
router.post('/egreso-manual', dashboardFinancieroController.registrarEgresoManual);
router.post('/transferencia-interna', dashboardFinancieroController.registrarTransferenciaInterna);

module.exports = router;
