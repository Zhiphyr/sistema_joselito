const express = require('express');
const router = express.Router();
const cuentaBancariaController = require('../controllers/cuentaBancariaController');
const { verificarAuth } = require('../middlewares/verificarPermisos');
const { uploadQR } = require('../config/cloudinary');

// Todas las rutas requieren autenticación
router.use(verificarAuth);

router.get('/', cuentaBancariaController.listarCuentasYBilleteras);
router.get('/entidades', cuentaBancariaController.listarEntidades);
router.get('/proveedores', cuentaBancariaController.listarProveedores);
router.post('/cuenta', cuentaBancariaController.registrarCuenta);
router.put('/cuenta/:id', cuentaBancariaController.actualizarCuenta);
router.post('/billetera', uploadQR.single('regBillQR'), cuentaBancariaController.registrarBilletera);
router.put('/billetera/:id', uploadQR.single('regBillQR'), cuentaBancariaController.actualizarBilletera);

// Cambiar estado
router.put('/cuenta/:id/estado', verificarAuth, cuentaBancariaController.cambiarEstadoCuenta);
router.put('/billetera/:id/estado', verificarAuth, cuentaBancariaController.cambiarEstadoBilletera);

module.exports = router;
