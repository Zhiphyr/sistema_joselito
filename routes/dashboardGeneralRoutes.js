const express = require('express');
const router = express.Router();
const dashboardGeneralController = require('../controllers/dashboardGeneralController');
const { verificarAuth } = require('../middlewares/verificarPermisos');

router.get('/resumen', verificarAuth, dashboardGeneralController.getResumenGeneral);
router.get('/distribucion-cargas', verificarAuth, dashboardGeneralController.getDistribucionCargas);
router.get('/volumen-viajes', verificarAuth, dashboardGeneralController.getVolumenViajes);
router.get('/top-incidencias', verificarAuth, dashboardGeneralController.getTopIncidencias);
router.get('/top-rutas', verificarAuth, dashboardGeneralController.getTopRutas);

module.exports = router;
