const LiquidacionModel = require('../models/LiquidacionModel');

// GET /api/liquidacion/viajes-pendientes
const obtenerViajesPendientes = async (req, res) => {
    try {
        const viajes = await LiquidacionModel.obtenerViajesPendientes();
        res.json({ success: true, data: viajes });
    } catch (error) {
        console.error('Error al obtener viajes pendientes:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// GET /api/liquidacion/historial
const obtenerHistorial = async (req, res) => {
    try {
        const historial = await LiquidacionModel.obtenerHistorial();
        res.json({ success: true, data: historial });
    } catch (error) {
        console.error('Error al obtener historial de liquidaciones:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// GET /api/liquidacion/kpis
const obtenerKPIs = async (req, res) => {
    try {
        const kpis = await LiquidacionModel.obtenerKPIs();
        res.json({ success: true, data: kpis });
    } catch (error) {
        console.error('Error al obtener KPIs de liquidación:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// GET /api/liquidacion/incidencias-pendientes/:chofer_dni
const obtenerIncidenciasPendientes = async (req, res) => {
    try {
        const { chofer_dni } = req.params;
        if (!chofer_dni) {
            return res.status(400).json({ success: false, message: 'Falta DNI de conductor' });
        }
        const incidencias = await LiquidacionModel.obtenerIncidenciasPendientesPorChofer(chofer_dni);
        res.json({ success: true, data: incidencias });
    } catch (error) {
        console.error('Error al obtener incidencias pendientes:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// POST /api/liquidacion/registrar
const registrarLiquidacion = async (req, res) => {
    try {
        const {
            id_viaje,
            peso_total_viaje,
            monto_bruto,
            descuento_adelanto,
            descuento_incidencias,
            monto_neto_pagado,
            incidencias_descuentos, // array de: { id_incidencia, monto_a_descontar }
            observaciones
        } = req.body;

        const id_usuario = req.headers['x-user-profile'] || req.body.id_usuario || 1;

        // Validaciones básicas
        if (!id_viaje || peso_total_viaje === undefined || monto_bruto === undefined || monto_neto_pagado === undefined) {
            return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
        }

        const resultado = await LiquidacionModel.registrarLiquidacion({
            id_viaje: Number(id_viaje),
            peso_total_viaje: Number(peso_total_viaje),
            monto_bruto: Number(monto_bruto),
            descuento_adelanto: Number(descuento_adelanto || 0),
            descuento_incidencias: Number(descuento_incidencias || 0),
            monto_neto_pagado: Number(monto_neto_pagado),
            incidencias_descuentos: incidencias_descuentos || [],
            observaciones: observaciones || '',
            id_usuario: Number(id_usuario)
        });

        res.status(201).json({
            success: true,
            message: 'Liquidación registrada exitosamente',
            data: resultado
        });
    } catch (error) {
        console.error('Error al registrar liquidación:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Este viaje ya tiene una liquidación registrada o se duplicó la entrada' });
        }
        res.status(500).json({ success: false, message: 'Error interno del servidor: ' + error.message });
    }
};

module.exports = {
    obtenerViajesPendientes,
    obtenerHistorial,
    obtenerKPIs,
    obtenerIncidenciasPendientes,
    registrarLiquidacion
};
