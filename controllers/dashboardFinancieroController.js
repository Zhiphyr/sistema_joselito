const db = require('../config/db');

const obtenerResumen = async (req, res) => {
    try {
        const query = `
            SELECT
                IFNULL(SUM(CASE WHEN tipo_movimiento = 'INGRESO' THEN monto ELSE 0 END), 0) AS total_ingresos,
                IFNULL(SUM(CASE WHEN tipo_movimiento = 'EGRESO' THEN monto ELSE 0 END), 0) AS total_egresos,
                IFNULL(SUM(CASE WHEN tipo_movimiento = 'INGRESO' AND MONTH(fecha_movimiento) = MONTH(CURDATE()) AND YEAR(fecha_movimiento) = YEAR(CURDATE()) THEN monto ELSE 0 END), 0) AS ingresos_mes,
                IFNULL(SUM(CASE WHEN tipo_movimiento = 'EGRESO' AND MONTH(fecha_movimiento) = MONTH(CURDATE()) AND YEAR(fecha_movimiento) = YEAR(CURDATE()) THEN monto ELSE 0 END), 0) AS egresos_mes
            FROM movimiento_caja
            WHERE estado = 1
        `;

        const [rows] = await db.query(query);
        const { total_ingresos, total_egresos, ingresos_mes, egresos_mes } = rows[0];

        const saldoTotalDisponible = Number(total_ingresos) - Number(total_egresos);
        const ingresosMes = Number(ingresos_mes);
        const egresosMes = Number(egresos_mes);

        res.json({
            success: true,
            data: {
                saldo_total_disponible: saldoTotalDisponible,
                ingresos_mes: ingresosMes,
                egresos_mes: egresosMes,
                rentabilidad: ingresosMes - egresosMes
            }
        });
    } catch (error) {
        console.error('Error en obtenerResumen (dashboardFinanciero):', error);
        res.status(500).json({ success: false, message: 'Error al obtener el resumen financiero' });
    }
};

const obtenerResumenCuentas = async (req, res) => {
    try {
        // Mapa billetera -> cuenta vinculada (independiente de si el vínculo está activo hoy),
        // usado para resolver a qué "pool" de dinero pertenece cada movimiento.
        const [billeterasTodas] = await db.query('SELECT id_billetera, id_cuenta_vinculada FROM billetera_digital');
        const cuentaVinculadaPorBilletera = new Map();
        billeterasTodas.forEach(b => cuentaVinculadaPorBilletera.set(b.id_billetera, b.id_cuenta_vinculada));

        const [movimientos] = await db.query(`
            SELECT monto, id_cuenta_origen, id_cuenta_destino, id_billetera_origen, id_billetera_destino
            FROM movimiento_caja
            WHERE estado = 1
        `);

        // Algunos movimientos registran a la vez la cuenta y su billetera vinculada en el mismo lado
        // (mismo pool de dinero): se resuelve una única entidad por lado para no contar el monto dos veces.
        const resolverEntidad = (idCuenta, idBilletera) => {
            if (idCuenta) return `cuenta:${idCuenta}`;
            if (idBilletera) {
                const cuentaVinculada = cuentaVinculadaPorBilletera.get(idBilletera);
                return cuentaVinculada ? `cuenta:${cuentaVinculada}` : `billetera:${idBilletera}`;
            }
            return null;
        };

        const saldoPorEntidad = new Map();
        movimientos.forEach(m => {
            const monto = Number(m.monto);
            const entidadDestino = resolverEntidad(m.id_cuenta_destino, m.id_billetera_destino);
            const entidadOrigen = resolverEntidad(m.id_cuenta_origen, m.id_billetera_origen);

            if (entidadDestino) saldoPorEntidad.set(entidadDestino, (saldoPorEntidad.get(entidadDestino) || 0) + monto);
            if (entidadOrigen) saldoPorEntidad.set(entidadOrigen, (saldoPorEntidad.get(entidadOrigen) || 0) - monto);
        });

        const saldoCuenta = (idCuenta) => saldoPorEntidad.get(`cuenta:${idCuenta}`) || 0;
        const saldoBilletera = (idBilletera) => saldoPorEntidad.get(`billetera:${idBilletera}`) || 0;

        const [cuentas] = await db.query(`
            SELECT c.id_cuenta, c.tipo_cuenta, c.nro_cuenta, c.titular, c.es_sistema,
                   e.nombre AS entidad_financiera, e.color_primario, e.color_fondo,
                   b.id_billetera, pb.nombre AS billetera_proveedor, b.numero_celular AS billetera_numero, b.titular AS billetera_titular
            FROM cuenta_bancaria c
            LEFT JOIN entidad_financiera e ON c.id_entidad = e.id_entidad
            LEFT JOIN billetera_digital b ON b.active_cuenta_vinculada = c.id_cuenta
            LEFT JOIN proveedor_billetera pb ON b.id_proveedor = pb.id_proveedor
            WHERE c.estado = 1
            ORDER BY c.es_sistema DESC, e.nombre ASC
        `);

        const [billeterasIndependientes] = await db.query(`
            SELECT b.id_billetera, b.numero_celular, b.titular,
                   pb.nombre AS proveedor, pb.color_primario, pb.color_fondo
            FROM billetera_digital b
            JOIN proveedor_billetera pb ON b.id_proveedor = pb.id_proveedor
            WHERE b.estado = 1 AND b.id_cuenta_vinculada IS NULL
            ORDER BY pb.nombre ASC
        `);

        const mapearCuenta = (c) => ({
            id_cuenta: c.id_cuenta,
            tipo_cuenta: c.tipo_cuenta,
            nro_cuenta: c.nro_cuenta,
            titular: c.titular,
            es_sistema: c.es_sistema,
            entidad_financiera: c.entidad_financiera,
            color_primario: c.color_primario,
            color_fondo: c.color_fondo,
            saldo: saldoCuenta(c.id_cuenta),
            billetera_vinculada: c.id_billetera ? {
                id_billetera: c.id_billetera,
                proveedor: c.billetera_proveedor,
                numero_celular: c.billetera_numero,
                titular: c.billetera_titular
            } : null
        });

        const cajaFisica = cuentas.filter(c => c.es_sistema === 1).map(mapearCuenta)[0] || null;
        const cuentasBancarias = cuentas.filter(c => c.es_sistema !== 1).map(mapearCuenta);

        const billeteras = billeterasIndependientes.map(b => ({
            id_billetera: b.id_billetera,
            numero_celular: b.numero_celular,
            titular: b.titular,
            proveedor: b.proveedor,
            color_primario: b.color_primario,
            color_fondo: b.color_fondo,
            saldo: saldoBilletera(b.id_billetera)
        }));

        res.json({
            success: true,
            data: {
                caja_fisica: cajaFisica,
                cuentas_bancarias: cuentasBancarias,
                billeteras_independientes: billeteras
            }
        });
    } catch (error) {
        console.error('Error en obtenerResumenCuentas (dashboardFinanciero):', error);
        res.status(500).json({ success: false, message: 'Error al obtener el resumen de cuentas' });
    }
};

const obtenerMovimientosCuenta = async (req, res) => {
    try {
        const idCuenta = Number(req.params.id);

        const [billRows] = await db.query('SELECT id_billetera FROM billetera_digital WHERE active_cuenta_vinculada = ?', [idCuenta]);
        const idBilletera = billRows.length > 0 ? billRows[0].id_billetera : null;

        let query = `
            SELECT concepto, monto, metodo_pago, modulo_origen, numero_operacion, fecha_movimiento,
                   id_cuenta_origen, id_cuenta_destino, id_billetera_origen, id_billetera_destino
            FROM movimiento_caja
            WHERE estado = 1 AND (id_cuenta_destino = ? OR id_cuenta_origen = ?
        `;
        const params = [idCuenta, idCuenta];
        if (idBilletera) {
            query += ` OR id_billetera_destino = ? OR id_billetera_origen = ?`;
            params.push(idBilletera, idBilletera);
        }
        query += `) ORDER BY fecha_movimiento DESC`;

        const [rows] = await db.query(query, params);

        const ingresos = [];
        const egresos = [];

        rows.forEach(r => {
            const esViaBilletera = Boolean(idBilletera) && (r.id_billetera_destino === idBilletera || r.id_billetera_origen === idBilletera);
            const item = {
                concepto: r.concepto,
                monto: Number(r.monto),
                metodo_pago: r.metodo_pago,
                modulo_origen: r.modulo_origen,
                numero_operacion: r.numero_operacion,
                fecha_movimiento: r.fecha_movimiento,
                canal: esViaBilletera ? 'Billetera Vinculada' : 'Directo'
            };

            const esIngreso = r.id_cuenta_destino === idCuenta || (esViaBilletera && r.id_billetera_destino === idBilletera);
            if (esIngreso) {
                ingresos.push(item);
            } else {
                egresos.push(item);
            }
        });

        res.json({ success: true, data: { ingresos, egresos } });
    } catch (error) {
        console.error('Error en obtenerMovimientosCuenta (dashboardFinanciero):', error);
        res.status(500).json({ success: false, message: 'Error al obtener los movimientos de la cuenta' });
    }
};

const obtenerMovimientosBilletera = async (req, res) => {
    try {
        const idBilletera = Number(req.params.id);

        const query = `
            SELECT concepto, monto, metodo_pago, modulo_origen, numero_operacion, fecha_movimiento,
                   id_billetera_origen, id_billetera_destino
            FROM movimiento_caja
            WHERE estado = 1 AND (id_billetera_destino = ? OR id_billetera_origen = ?)
            ORDER BY fecha_movimiento DESC
        `;

        const [rows] = await db.query(query, [idBilletera, idBilletera]);

        const ingresos = [];
        const egresos = [];

        rows.forEach(r => {
            const item = {
                concepto: r.concepto,
                monto: Number(r.monto),
                metodo_pago: r.metodo_pago,
                modulo_origen: r.modulo_origen,
                numero_operacion: r.numero_operacion,
                fecha_movimiento: r.fecha_movimiento
            };

            if (r.id_billetera_destino === idBilletera) {
                ingresos.push(item);
            } else {
                egresos.push(item);
            }
        });

        res.json({ success: true, data: { ingresos, egresos } });
    } catch (error) {
        console.error('Error en obtenerMovimientosBilletera (dashboardFinanciero):', error);
        res.status(500).json({ success: false, message: 'Error al obtener los movimientos de la billetera' });
    }
};

const DIAS_FLUJO_PERMITIDOS = [7, 15, 30];

const formatearFechaLocal = (fecha) => {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const obtenerFlujoDiario = async (req, res) => {
    try {
        let dias = parseInt(req.query.dias, 10);
        if (!DIAS_FLUJO_PERMITIDOS.includes(dias)) dias = 15;

        const query = `
            SELECT DATE_FORMAT(fecha_movimiento, '%Y-%m-%d') AS fecha,
                   SUM(CASE WHEN tipo_movimiento = 'INGRESO' THEN monto ELSE 0 END) AS ingresos,
                   SUM(CASE WHEN tipo_movimiento = 'EGRESO' THEN monto ELSE 0 END) AS egresos
            FROM movimiento_caja
            WHERE estado = 1 AND fecha_movimiento >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE_FORMAT(fecha_movimiento, '%Y-%m-%d')
        `;
        const [rows] = await db.query(query, [dias - 1]);

        const mapaPorFecha = new Map(rows.map(r => [r.fecha, { ingresos: Number(r.ingresos), egresos: Number(r.egresos) }]));

        // Se rellenan con cero los días sin movimientos para que el gráfico
        // muestre un rango continuo (sin huecos) en vez de solo los días con datos.
        const resultado = [];
        for (let i = dias - 1; i >= 0; i--) {
            const fecha = new Date();
            fecha.setDate(fecha.getDate() - i);
            const fechaStr = formatearFechaLocal(fecha);
            const valores = mapaPorFecha.get(fechaStr) || { ingresos: 0, egresos: 0 };
            resultado.push({ fecha: fechaStr, ingresos: valores.ingresos, egresos: valores.egresos });
        }

        res.json({ success: true, data: resultado });
    } catch (error) {
        console.error('Error en obtenerFlujoDiario (dashboardFinanciero):', error);
        res.status(500).json({ success: false, message: 'Error al obtener el flujo diario' });
    }
};

const obtenerDistribucionGastos = async (req, res) => {
    try {
        const query = `
            SELECT modulo_origen, SUM(monto) AS total
            FROM movimiento_caja
            WHERE estado = 1 AND tipo_movimiento = 'EGRESO'
              AND MONTH(fecha_movimiento) = MONTH(CURDATE()) AND YEAR(fecha_movimiento) = YEAR(CURDATE())
            GROUP BY modulo_origen
            ORDER BY total DESC
        `;
        const [rows] = await db.query(query);

        const data = rows.map(r => ({ modulo_origen: r.modulo_origen, total: Number(r.total) }));

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error en obtenerDistribucionGastos (dashboardFinanciero):', error);
        res.status(500).json({ success: false, message: 'Error al obtener la distribución de gastos' });
    }
};

// Query base de movimientos con toda la resolución de cuenta/billetera de origen y
// destino (incluida la cuenta vinculada de cada billetera). Compartida entre el
// listado "Top 10" del dashboard y el historial completo — solo cambia el LIMIT.
const MOVIMIENTOS_QUERY_BASE = `
    SELECT
        m.id_movimiento, m.tipo_movimiento, m.concepto, m.monto, m.metodo_pago, m.modulo_origen, m.numero_operacion, m.fecha_movimiento, m.estado,
        m.id_cuenta_origen, m.id_cuenta_destino, m.id_billetera_origen, m.id_billetera_destino,
        u.nombre AS usuario_nombre,
        co.nro_cuenta AS cuenta_origen_nro, eo.nombre AS entidad_origen,
        cd.nro_cuenta AS cuenta_destino_nro, ed.nombre AS entidad_destino,
        bo.numero_celular AS billetera_origen_nro, po.nombre AS proveedor_origen,
        bd.numero_celular AS billetera_destino_nro, pd.nombre AS proveedor_destino,
        cob.nro_cuenta AS cuenta_origen_vinculada, eob.nombre AS entidad_origen_vinculada,
        cdb.nro_cuenta AS cuenta_destino_vinculada, edb.nombre AS entidad_destino_vinculada,
        aa.motivo AS motivo_anulacion, aa.fecha_anulacion AS fecha_anulacion,
        ua.nombre AS usuario_anulacion_nombre
    FROM movimiento_caja m
    LEFT JOIN usuarios u ON m.id_usuario = u.id_usuario
    LEFT JOIN cuenta_bancaria co ON m.id_cuenta_origen = co.id_cuenta
    LEFT JOIN entidad_financiera eo ON co.id_entidad = eo.id_entidad
    LEFT JOIN cuenta_bancaria cd ON m.id_cuenta_destino = cd.id_cuenta
    LEFT JOIN entidad_financiera ed ON cd.id_entidad = ed.id_entidad
    LEFT JOIN billetera_digital bo ON m.id_billetera_origen = bo.id_billetera
    LEFT JOIN proveedor_billetera po ON bo.id_proveedor = po.id_proveedor
    LEFT JOIN cuenta_bancaria cob ON bo.active_cuenta_vinculada = cob.id_cuenta
    LEFT JOIN entidad_financiera eob ON cob.id_entidad = eob.id_entidad
    LEFT JOIN billetera_digital bd ON m.id_billetera_destino = bd.id_billetera
    LEFT JOIN proveedor_billetera pd ON bd.id_proveedor = pd.id_proveedor
    LEFT JOIN cuenta_bancaria cdb ON bd.active_cuenta_vinculada = cdb.id_cuenta
    LEFT JOIN entidad_financiera edb ON cdb.id_entidad = edb.id_entidad
    LEFT JOIN auditoria_anulacion aa ON aa.modulo = m.modulo_origen AND aa.id_registro = m.id_registro_origen
    LEFT JOIN usuarios ua ON aa.id_usuario = ua.id_usuario
    ORDER BY m.fecha_movimiento DESC
`;

// Resuelve la cuenta/billetera "afectada" a mostrar y da forma al objeto de
// movimiento devuelto al frontend, a partir de una fila cruda de MOVIMIENTOS_QUERY_BASE.
const mapearMovimiento = (r) => {
    let cuenta_afectada = 'Efectivo'; // Default

    if (r.tipo_movimiento === 'INGRESO' || r.tipo_movimiento === 'TRANSFERENCIA_INGRESO') {
        if (r.id_billetera_destino) {
            if (r.cuenta_destino_vinculada) {
                cuenta_afectada = `${r.entidad_destino_vinculada} - ${r.cuenta_destino_vinculada} (Vía ${r.proveedor_destino})`;
            } else {
                cuenta_afectada = `${r.proveedor_destino} - ${r.billetera_destino_nro}`;
            }
        } else if (r.id_cuenta_destino) {
            cuenta_afectada = `${r.entidad_destino} - ${r.cuenta_destino_nro}`;
        }
    } else { // EGRESO o TRANSFERENCIA_EGRESO
        if (r.id_billetera_origen) {
            if (r.cuenta_origen_vinculada) {
                cuenta_afectada = `${r.entidad_origen_vinculada} - ${r.cuenta_origen_vinculada} (Vía ${r.proveedor_origen})`;
            } else {
                cuenta_afectada = `${r.proveedor_origen} - ${r.billetera_origen_nro}`;
            }
        } else if (r.id_cuenta_origen) {
            cuenta_afectada = `${r.entidad_origen} - ${r.cuenta_origen_nro}`;
        }
    }

    return {
        id_movimiento: r.id_movimiento,
        tipo_movimiento: r.tipo_movimiento,
        concepto: r.concepto,
        monto: Number(r.monto),
        metodo_pago: r.metodo_pago,
        cuenta_afectada: cuenta_afectada,
        modulo_origen: r.modulo_origen,
        numero_operacion: r.numero_operacion,
        fecha_movimiento: r.fecha_movimiento,
        usuario: r.usuario_nombre ? `${r.usuario_nombre}` : 'Sistema',
        estado: r.estado,
        // Auditoría de anulación (solo presente cuando estado = 0 y el módulo del
        // movimiento registra motivo/usuario al anular — hoy Indemnizaciones y Deudas
        // por Cobrar, vía la tabla auditoria_anulacion).
        motivo_anulacion: r.motivo_anulacion,
        fecha_anulacion: r.fecha_anulacion,
        usuario_anulacion: r.usuario_anulacion_nombre
    };
};

const obtenerUltimosMovimientos = async (req, res) => {
    try {
        const [rows] = await db.query(MOVIMIENTOS_QUERY_BASE + ' LIMIT 10');
        res.json({ success: true, data: rows.map(mapearMovimiento) });
    } catch (error) {
        console.error('Error en obtenerUltimosMovimientos (dashboardFinanciero):', error);
        res.status(500).json({ success: false, message: 'Error al obtener últimos movimientos' });
    }
};

const obtenerTodosMovimientos = async (req, res) => {
    try {
        const [rows] = await db.query(MOVIMIENTOS_QUERY_BASE);
        res.json({ success: true, data: rows.map(mapearMovimiento) });
    } catch (error) {
        console.error('Error en obtenerTodosMovimientos (dashboardFinanciero):', error);
        res.status(500).json({ success: false, message: 'Error al obtener el historial de movimientos' });
    }
};

// DECIMAL(10,2): hasta 8 dígitos enteros y 2 decimales, sin negativos.
const REGEX_MONTO_DECIMAL = /^\d{1,8}(\.\d{1,2})?$/;
// Letras (con tildes/ñ), números, paréntesis, guiones y espacios; máx. 150 caracteres.
const REGEX_CONCEPTO = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9()\-\s]{1,150}$/;
const REGEX_NUMERO_OPERACION = /^[a-zA-Z0-9-]{1,100}$/;

// Valida y resuelve una cuenta bancaria o billetera digital seleccionada en un formulario
// (Nuevo Ingreso / Nuevo Egreso / Transferencia Interna) a sus columnas reales de
// movimiento_caja + el método de pago que le corresponde. Devuelve null si no existe o
// está inactiva. Efectivo siempre es la Caja Física (es_sistema=1); una billetera arrastra
// su cuenta vinculada (si tiene) igual que en viajeController/deudaController.
const resolverEntidadPago = async (connection, tipo, id) => {
    if (tipo === 'cuenta') {
        const [rows] = await connection.query('SELECT id_cuenta, es_sistema, estado FROM cuenta_bancaria WHERE id_cuenta = ?', [id]);
        if (!rows.length || rows[0].estado !== 1) return null;
        return {
            id_cuenta: rows[0].id_cuenta,
            id_billetera: null,
            metodo_pago: rows[0].es_sistema === 1 ? 'Efectivo' : 'Transferencia'
        };
    }
    if (tipo === 'billetera') {
        const [rows] = await connection.query('SELECT id_billetera, id_cuenta_vinculada, estado FROM billetera_digital WHERE id_billetera = ?', [id]);
        if (!rows.length || rows[0].estado !== 1) return null;
        return {
            id_cuenta: rows[0].id_cuenta_vinculada || null,
            id_billetera: rows[0].id_billetera,
            metodo_pago: 'Billetera Digital'
        };
    }
    return null;
};

// Saldo actual de una entidad de pago ya resuelta (cuenta y/o billetera). Misma regla
// anti-doble-conteo usada en cuentaBancariaController.calcularSaldoCuenta y
// viajeController.calcularSaldoDisponible: si hay cuenta, esa es la entidad (arrastra su
// billetera vinculada); si solo hay billetera, es una independiente.
const calcularSaldoEntidad = async (connection, idCuenta, idBilletera) => {
    if (idCuenta) {
        const [billRows] = await connection.query('SELECT id_billetera FROM billetera_digital WHERE active_cuenta_vinculada = ?', [idCuenta]);
        const idBilleteraVinc = billRows.length > 0 ? billRows[0].id_billetera : null;

        let query = `
            SELECT
                IFNULL(SUM(CASE WHEN id_cuenta_destino = ? THEN monto ELSE 0 END), 0) AS ingresos_cuenta,
                IFNULL(SUM(CASE WHEN id_cuenta_origen = ? THEN monto ELSE 0 END), 0) AS egresos_cuenta
        `;
        const params = [idCuenta, idCuenta];

        if (idBilleteraVinc) {
            query += `,
                IFNULL(SUM(CASE WHEN id_billetera_destino = ? AND id_cuenta_destino IS NULL THEN monto ELSE 0 END), 0) AS ingresos_billetera,
                IFNULL(SUM(CASE WHEN id_billetera_origen = ? AND id_cuenta_origen IS NULL THEN monto ELSE 0 END), 0) AS egresos_billetera
            `;
            params.push(idBilleteraVinc, idBilleteraVinc);
        }

        query += ' FROM movimiento_caja WHERE estado = 1';

        const [rows] = await connection.query(query, params);
        const r = rows[0];
        let saldo = Number(r.ingresos_cuenta) - Number(r.egresos_cuenta);
        if (idBilleteraVinc) saldo += Number(r.ingresos_billetera) - Number(r.egresos_billetera);
        return Math.round(saldo * 100) / 100;
    }

    if (idBilletera) {
        const [rows] = await connection.query(`
            SELECT
                IFNULL(SUM(CASE WHEN id_billetera_destino = ? THEN monto ELSE 0 END), 0) AS ingresos,
                IFNULL(SUM(CASE WHEN id_billetera_origen = ? THEN monto ELSE 0 END), 0) AS egresos
            FROM movimiento_caja WHERE estado = 1
        `, [idBilletera, idBilletera]);
        const saldo = Number(rows[0].ingresos) - Number(rows[0].egresos);
        return Math.round(saldo * 100) / 100;
    }

    return 0;
};

const registrarIngresoManual = async (req, res) => {
    let connection;
    try {
        const { concepto, monto, tipo_destino, id_destino, numero_operacion } = req.body;
        const id_usuario = req.headers['x-user-profile'] || 1;

        if (!concepto || !REGEX_CONCEPTO.test(String(concepto).trim())) {
            return res.status(400).json({ success: false, message: 'El concepto es obligatorio: solo letras, números, paréntesis, guiones y espacios (máx. 150 caracteres).' });
        }
        if (!REGEX_MONTO_DECIMAL.test(String(monto || '').trim())) {
            return res.status(400).json({ success: false, message: 'El monto no es válido (máximo 2 decimales, sin negativos).' });
        }
        const montoNum = Number(monto);
        if (montoNum <= 0) {
            return res.status(400).json({ success: false, message: 'El monto debe ser mayor a 0.' });
        }
        if (!['cuenta', 'billetera'].includes(tipo_destino) || !id_destino) {
            return res.status(400).json({ success: false, message: 'Debes seleccionar una cuenta o billetera de destino.' });
        }
        if (numero_operacion && !REGEX_NUMERO_OPERACION.test(String(numero_operacion).trim())) {
            return res.status(400).json({ success: false, message: 'El número de operación solo puede contener letras, números y guiones.' });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const destino = await resolverEntidadPago(connection, tipo_destino, id_destino);
        if (!destino) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ success: false, message: 'La cuenta o billetera seleccionada no existe o está inactiva.' });
        }

        if (destino.metodo_pago !== 'Efectivo' && (!numero_operacion || !String(numero_operacion).trim())) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ success: false, message: 'El número de operación es obligatorio para este destino.' });
        }

        const [result] = await connection.query(`
            INSERT INTO movimiento_caja
            (tipo_movimiento, concepto, monto, metodo_pago, id_cuenta_origen, id_billetera_origen, id_cuenta_destino, id_billetera_destino, modulo_origen, id_registro_origen, numero_operacion, id_usuario)
            VALUES ('INGRESO', ?, ?, ?, NULL, NULL, ?, ?, 'MANUAL', NULL, ?, ?)
        `, [
            String(concepto).trim(),
            montoNum,
            destino.metodo_pago,
            destino.id_cuenta,
            destino.id_billetera,
            numero_operacion ? String(numero_operacion).trim() : null,
            id_usuario
        ]);

        await connection.commit();

        res.json({ success: true, message: 'Ingreso registrado correctamente', id_movimiento: result.insertId });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error en registrarIngresoManual (dashboardFinanciero):', error);
        res.status(500).json({ success: false, message: 'Error interno al registrar el ingreso' });
    } finally {
        if (connection) connection.release();
    }
};

const registrarEgresoManual = async (req, res) => {
    let connection;
    try {
        const { concepto, monto, tipo_origen, id_origen, numero_operacion } = req.body;
        const id_usuario = req.headers['x-user-profile'] || 1;

        if (!concepto || !REGEX_CONCEPTO.test(String(concepto).trim())) {
            return res.status(400).json({ success: false, message: 'El concepto es obligatorio: solo letras, números, paréntesis, guiones y espacios (máx. 150 caracteres).' });
        }
        if (!REGEX_MONTO_DECIMAL.test(String(monto || '').trim())) {
            return res.status(400).json({ success: false, message: 'El monto no es válido (máximo 2 decimales, sin negativos).' });
        }
        const montoNum = Number(monto);
        if (montoNum <= 0) {
            return res.status(400).json({ success: false, message: 'El monto debe ser mayor a 0.' });
        }
        if (!['cuenta', 'billetera'].includes(tipo_origen) || !id_origen) {
            return res.status(400).json({ success: false, message: 'Debes seleccionar una cuenta o billetera de origen.' });
        }
        if (numero_operacion && !REGEX_NUMERO_OPERACION.test(String(numero_operacion).trim())) {
            return res.status(400).json({ success: false, message: 'El número de operación solo puede contener letras, números y guiones.' });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const origen = await resolverEntidadPago(connection, tipo_origen, id_origen);
        if (!origen) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ success: false, message: 'La cuenta o billetera seleccionada no existe o está inactiva.' });
        }

        if (origen.metodo_pago !== 'Efectivo' && (!numero_operacion || !String(numero_operacion).trim())) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ success: false, message: 'El número de operación es obligatorio para este origen.' });
        }

        const saldoDisponible = await calcularSaldoEntidad(connection, origen.id_cuenta, origen.id_billetera);
        if (saldoDisponible < montoNum) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: `Fondos Insuficientes: el origen seleccionado solo tiene S/ ${saldoDisponible.toFixed(2)} disponible.`
            });
        }

        const [result] = await connection.query(`
            INSERT INTO movimiento_caja
            (tipo_movimiento, concepto, monto, metodo_pago, id_cuenta_origen, id_billetera_origen, id_cuenta_destino, id_billetera_destino, modulo_origen, id_registro_origen, numero_operacion, id_usuario)
            VALUES ('EGRESO', ?, ?, ?, ?, ?, NULL, NULL, 'MANUAL', NULL, ?, ?)
        `, [
            String(concepto).trim(),
            montoNum,
            origen.metodo_pago,
            origen.id_cuenta,
            origen.id_billetera,
            numero_operacion ? String(numero_operacion).trim() : null,
            id_usuario
        ]);

        await connection.commit();

        res.json({ success: true, message: 'Egreso registrado correctamente', id_movimiento: result.insertId });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error en registrarEgresoManual (dashboardFinanciero):', error);
        res.status(500).json({ success: false, message: 'Error interno al registrar el egreso' });
    } finally {
        if (connection) connection.release();
    }
};

const registrarTransferenciaInterna = async (req, res) => {
    let connection;
    try {
        const { concepto, monto, tipo_origen, id_origen, tipo_destino, id_destino, numero_operacion } = req.body;
        const id_usuario = req.headers['x-user-profile'] || 1;

        if (!concepto || !REGEX_CONCEPTO.test(String(concepto).trim())) {
            return res.status(400).json({ success: false, message: 'El concepto es obligatorio: solo letras, números, paréntesis, guiones y espacios (máx. 150 caracteres).' });
        }
        if (!REGEX_MONTO_DECIMAL.test(String(monto || '').trim())) {
            return res.status(400).json({ success: false, message: 'El monto no es válido (máximo 2 decimales, sin negativos).' });
        }
        const montoNum = Number(monto);
        if (montoNum <= 0) {
            return res.status(400).json({ success: false, message: 'El monto debe ser mayor a 0.' });
        }
        if (!['cuenta', 'billetera'].includes(tipo_origen) || !id_origen) {
            return res.status(400).json({ success: false, message: 'Debes seleccionar la cuenta o billetera de origen.' });
        }
        if (!['cuenta', 'billetera'].includes(tipo_destino) || !id_destino) {
            return res.status(400).json({ success: false, message: 'Debes seleccionar la cuenta o billetera de destino.' });
        }
        if (numero_operacion && !REGEX_NUMERO_OPERACION.test(String(numero_operacion).trim())) {
            return res.status(400).json({ success: false, message: 'El número de operación solo puede contener letras, números y guiones.' });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const origen = await resolverEntidadPago(connection, tipo_origen, id_origen);
        if (!origen) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ success: false, message: 'El origen seleccionado no existe o está inactivo.' });
        }

        const destino = await resolverEntidadPago(connection, tipo_destino, id_destino);
        if (!destino) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ success: false, message: 'El destino seleccionado no existe o está inactivo.' });
        }

        const claveOrigen = origen.id_cuenta ? `cuenta:${origen.id_cuenta}` : `billetera:${origen.id_billetera}`;
        const claveDestino = destino.id_cuenta ? `cuenta:${destino.id_cuenta}` : `billetera:${destino.id_billetera}`;
        if (claveOrigen === claveDestino) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ success: false, message: 'El origen y el destino no pueden ser la misma cuenta.' });
        }

        const saldoDisponible = await calcularSaldoEntidad(connection, origen.id_cuenta, origen.id_billetera);
        if (saldoDisponible < montoNum) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: `Fondos Insuficientes: el origen seleccionado solo tiene S/ ${saldoDisponible.toFixed(2)} disponible.`
            });
        }

        const conceptoLimpio = String(concepto).trim();
        const numOp = numero_operacion ? String(numero_operacion).trim() : null;

        const [resultEgreso] = await connection.query(`
            INSERT INTO movimiento_caja
            (tipo_movimiento, concepto, monto, metodo_pago, id_cuenta_origen, id_billetera_origen, id_cuenta_destino, id_billetera_destino, modulo_origen, id_registro_origen, numero_operacion, id_usuario)
            VALUES ('EGRESO', ?, ?, ?, ?, ?, NULL, NULL, 'TRANSFERENCIA_INTERNA', NULL, ?, ?)
        `, [
            `Transferencia interna - ${conceptoLimpio}`,
            montoNum,
            origen.metodo_pago,
            origen.id_cuenta,
            origen.id_billetera,
            numOp,
            id_usuario
        ]);

        await connection.query(`
            INSERT INTO movimiento_caja
            (tipo_movimiento, concepto, monto, metodo_pago, id_cuenta_origen, id_billetera_origen, id_cuenta_destino, id_billetera_destino, modulo_origen, id_registro_origen, numero_operacion, id_usuario)
            VALUES ('INGRESO', ?, ?, ?, NULL, NULL, ?, ?, 'TRANSFERENCIA_INTERNA', ?, ?, ?)
        `, [
            `Transferencia interna recibida - ${conceptoLimpio}`,
            montoNum,
            destino.metodo_pago,
            destino.id_cuenta,
            destino.id_billetera,
            resultEgreso.insertId,
            numOp,
            id_usuario
        ]);

        await connection.commit();

        res.json({ success: true, message: 'Transferencia realizada correctamente' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error en registrarTransferenciaInterna (dashboardFinanciero):', error);
        res.status(500).json({ success: false, message: 'Error interno al realizar la transferencia' });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    obtenerResumen,
    obtenerResumenCuentas,
    obtenerMovimientosCuenta,
    obtenerMovimientosBilletera,
    obtenerFlujoDiario,
    obtenerDistribucionGastos,
    obtenerUltimosMovimientos,
    obtenerTodosMovimientos,
    registrarIngresoManual,
    registrarEgresoManual,
    registrarTransferenciaInterna
};
