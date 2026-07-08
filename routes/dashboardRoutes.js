const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verificarAuth } = require('../middlewares/verificarPermisos');

router.use(verificarAuth);

router.get('/stats', dashboardController.obtenerEstadisticas);

module.exports = router;
