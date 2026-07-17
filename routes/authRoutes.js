const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const loginRateLimiter = require('../middlewares/loginRateLimiter');

// Endpoint POST para el login
router.post('/login', loginRateLimiter, authController.login);

module.exports = router;
