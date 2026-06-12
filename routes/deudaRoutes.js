const express = require('express');
const router = express.Router();
const deudaController = require('../controllers/deudaController');
const { upload } = require('../config/cloudinary');

router.get('/', deudaController.obtenerDeudas);
router.get('/cuentas-bancarias', deudaController.obtenerCuentasBancarias);
router.get('/historial/:id_carga', deudaController.obtenerHistorialPagos);
router.post('/cobrar', upload.single('evidencia'), deudaController.registrarCobro);
router.post('/anular-pago', deudaController.anularPago);

module.exports = router;
