const express = require('express');
const router = express.Router();
const viajeController = require('../controllers/viajeController');

router.post('/', viajeController.registrarViaje);

module.exports = router;
