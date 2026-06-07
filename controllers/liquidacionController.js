const LiquidacionModel = require('../models/LiquidacionModel');

const listarViajesLiquidables = async (req, res) => {
    try {
        const data = await LiquidacionModel.obtenerViajesLiquidables();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error en listarViajesLiquidables:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const listarLiquidaciones = async (req, res) => {
    try {
        const data = await LiquidacionModel.obtenerLiquidaciones();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error en listarLiquidaciones:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const generar = async (req, res) => {
    try {
        const { id_viaje } = req.body;
        const id_usuario = req.headers['x-user-id'] || 1;

        if (!id_viaje) {
            return res.status(400).json({ success: false, message: 'El id del viaje es obligatorio' });
        }

        const existe = await LiquidacionModel.existeLiquidacionDeViaje(id_viaje);
        if (existe) {
            return res.status(400).json({ success: false, message: 'Este viaje ya tiene una liquidación generada' });
        }

        const id = await LiquidacionModel.generarLiquidacion(id_viaje, id_usuario);
        return res.status(201).json({ success: true, message: 'Liquidación generada exitosamente', id });
    } catch (error) {
        console.error('Error en generar liquidación:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const listarPagosDeLiquidacion = async (req, res) => {
    try {
        const { id } = req.params;
        const liquidacion = await LiquidacionModel.obtenerLiquidacionPorId(id);
        if (!liquidacion) {
            return res.status(404).json({ success: false, message: 'Liquidación no encontrada' });
        }
        const pagos = await LiquidacionModel.obtenerPagosPorLiquidacion(id);
        return res.status(200).json({ success: true, data: { liquidacion, pagos } });
    } catch (error) {
        console.error('Error en listarPagosDeLiquidacion:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener los pagos' });
    }
};

const registrarPago = async (req, res) => {
    try {
        const { id_liquidacion, id_medio_pago, monto, es_adelanto, fecha_pago, referencia, observacion } = req.body;
        const id_usuario = req.headers['x-user-id'] || 1;

        if (!id_liquidacion || !id_medio_pago || !monto || !fecha_pago) {
            return res.status(400).json({ success: false, message: 'Liquidación, medio de pago, monto y fecha son obligatorios' });
        }

        const montoNum = Number(monto);
        if (isNaN(montoNum) || montoNum <= 0) {
            return res.status(400).json({ success: false, message: 'El monto debe ser mayor a cero' });
        }

        const liquidacion = await LiquidacionModel.obtenerLiquidacionPorId(id_liquidacion);
        if (!liquidacion) {
            return res.status(404).json({ success: false, message: 'Liquidación no encontrada' });
        }

        const saldo = Number(liquidacion.monto_total) - Number(liquidacion.pagado);
        if (montoNum > saldo + 0.001) {
            return res.status(400).json({
                success: false,
                message: `El pago (S/ ${montoNum.toFixed(2)}) supera el saldo pendiente (S/ ${saldo.toFixed(2)})`
            });
        }

        const id = await LiquidacionModel.registrarPago({
            id_liquidacion, id_medio_pago, monto: montoNum, es_adelanto, fecha_pago, referencia, observacion, id_usuario
        });

        return res.status(201).json({ success: true, message: 'Pago registrado exitosamente', id });
    } catch (error) {
        console.error('Error en registrarPago:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

module.exports = {
    listarViajesLiquidables,
    listarLiquidaciones,
    generar,
    listarPagosDeLiquidacion,
    registrarPago
};
