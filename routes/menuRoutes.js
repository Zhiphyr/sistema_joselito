const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');

// Endpoint GET para obtener el menú por perfil
router.get('/:id_perfil', menuController.obtenerMenu);

module.exports = router;
