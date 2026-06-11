const express = require('express');
const router = express.Router();
const deudaController = require('../controllers/deudaController');

router.get('/', deudaController.obtenerDeudas);

module.exports = router;
