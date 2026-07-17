const express = require('express');
const router = express.Router();
const dashboardGeneralController = require('../controllers/dashboardGeneralController');
const { verificarAuth } = require('../middlewares/verificarPermisos');

router.get('/resumen', verificarAuth, dashboardGeneralController.getResumenGeneral);

module.exports = router;
