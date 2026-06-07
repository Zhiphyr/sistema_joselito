const express = require('express');
const router = express.Router();
const cobroController = require('../controllers/cobroController');
const { verificarAuth } = require('../middlewares/verificarPermisos');

router.use(verificarAuth);

router.get('/medios-pago', cobroController.listarMediosPago);
router.get('/', cobroController.listarCuentasPorCobrar);
router.get('/:id/historial', cobroController.listarCobrosDeCarga); // :id = id_carga
router.post('/', cobroController.registrar);
router.patch('/:id/anular', cobroController.anular);               // :id = id_cobro

module.exports = router;
