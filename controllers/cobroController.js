const CobroModel = require('../models/CobroModel');

const listarCuentasPorCobrar = async (req, res) => {
    try {
        const data = await CobroModel.obtenerCuentasPorCobrar();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error en listarCuentasPorCobrar:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const listarMediosPago = async (req, res) => {
    try {
        const data = await CobroModel.obtenerMediosPago();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error en listarMediosPago:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener medios de pago' });
    }
};

const listarCobrosDeCarga = async (req, res) => {
    try {
        const { id } = req.params;
        const carga = await CobroModel.obtenerCargaPorId(id);
        if (!carga) {
            return res.status(404).json({ success: false, message: 'Carga no encontrada' });
        }
        const cobros = await CobroModel.obtenerCobrosPorCarga(id);
        return res.status(200).json({ success: true, data: { carga, cobros } });
    } catch (error) {
        console.error('Error en listarCobrosDeCarga:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener los cobros' });
    }
};

const registrar = async (req, res) => {
    try {
        const { id_carga, id_medio_pago, monto, fecha_cobro, referencia, observacion } = req.body;
        const id_usuario = req.headers['x-user-id'] || 1;

        if (!id_carga || !id_medio_pago || !monto || !fecha_cobro) {
            return res.status(400).json({ success: false, message: 'Carga, medio de pago, monto y fecha son obligatorios' });
        }

        const montoNum = Number(monto);
        if (isNaN(montoNum) || montoNum <= 0) {
            return res.status(400).json({ success: false, message: 'El monto debe ser mayor a cero' });
        }

        // Validar que no se cobre más del saldo pendiente
        const carga = await CobroModel.obtenerCargaPorId(id_carga);
        if (!carga) {
            return res.status(404).json({ success: false, message: 'Carga no encontrada' });
        }
        const saldo = Number(carga.flete_total) - Number(carga.cobrado);
        if (montoNum > saldo + 0.001) {
            return res.status(400).json({
                success: false,
                message: `El monto (S/ ${montoNum.toFixed(2)}) supera el saldo pendiente (S/ ${saldo.toFixed(2)})`
            });
        }

        const id = await CobroModel.registrarCobro({
            id_carga, id_medio_pago, monto: montoNum, fecha_cobro, referencia, observacion, id_usuario
        });

        return res.status(201).json({ success: true, message: 'Cobro registrado exitosamente', id });
    } catch (error) {
        console.error('Error en registrar cobro:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const anular = async (req, res) => {
    try {
        const { id } = req.params;       // id_cobro
        const { id_carga } = req.body;

        if (!id_carga) {
            return res.status(400).json({ success: false, message: 'Falta el id de la carga' });
        }

        await CobroModel.anularCobro(id, id_carga);
        return res.status(200).json({ success: true, message: 'Cobro anulado y saldo recalculado' });
    } catch (error) {
        console.error('Error en anular cobro:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

module.exports = {
    listarCuentasPorCobrar,
    listarMediosPago,
    listarCobrosDeCarga,
    registrar,
    anular
};
