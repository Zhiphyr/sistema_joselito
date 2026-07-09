const express = require('express');
const router = express.Router();
const deudaController = require('../controllers/deudaController');
const { upload } = require('../config/cloudinary');

router.get('/', deudaController.obtenerDeudas);
router.get('/resumen-diario', deudaController.obtenerResumenDiario);
router.get('/cuentas-bancarias', deudaController.obtenerCuentasBancarias);
router.get('/historial/:id_carga', deudaController.obtenerHistorialPagos);
router.get('/:id_carga/detalles', deudaController.obtenerDetallesCarga);
router.post('/cobrar', upload.any(), deudaController.registrarCobro);
router.post('/anular-pago', deudaController.anularPago);

module.exports = router;
