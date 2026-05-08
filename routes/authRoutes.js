const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Endpoint POST para el login
router.post('/login', authController.login);

module.exports = router;
