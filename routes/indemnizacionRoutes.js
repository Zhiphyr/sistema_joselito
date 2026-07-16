const express = require('express');
const router = express.Router();
const indemnizacionController = require('../controllers/indemnizacionController');
const { verificarAuth } = require('../middlewares/verificarPermisos');
const { upload } = require('../config/cloudinary');

router.use(verificarAuth);

router.get('/pendientes', indemnizacionController.getDeudasPendientes);
router.post('/pagar', upload.any(), indemnizacionController.registrarPago);
router.get('/historial', indemnizacionController.getHistorialPagos);
router.get('/verificar-operacion', indemnizacionController.verificarNumeroOperacion);
router.put('/anular/:id_pago', indemnizacionController.anularPago);

module.exports = router;
