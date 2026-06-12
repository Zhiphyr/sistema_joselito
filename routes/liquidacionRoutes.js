const express = require('express');
const router = express.Router();
const liquidacionController = require('../controllers/liquidacionController');
const { verificarAuth } = require('../middlewares/verificarPermisos');

router.use(verificarAuth);

router.get('/viajes-pendientes', verificarAuth, liquidacionController.obtenerViajesPendientes);
router.get('/historial', verificarAuth, liquidacionController.obtenerHistorial);
router.get('/kpis', verificarAuth, liquidacionController.obtenerKPIs);
router.get('/incidencias-pendientes/:chofer_dni', verificarAuth, liquidacionController.obtenerIncidenciasPendientes);
router.post('/registrar', verificarAuth, liquidacionController.registrarLiquidacion);

module.exports = router;