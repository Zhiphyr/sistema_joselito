const db = require('../config/db');

// Saldo actual de una cuenta bancaria, incluyendo los movimientos de su billetera digital
// vinculada activa (si tiene una) — mismo pool de dinero. Evita el doble conteo cuando un
// movimiento trae poblada tanto la cuenta como la billetera en el mismo lado (se prioriza
// la cuenta, igual que en dashboardFinancieroController.obtenerResumenCuentas).
const calcularSaldoCuenta = async (idCuenta) => {
    const [billRows] = await db.query('SELECT id_billetera FROM billetera_digital WHERE active_cuenta_vinculada = ?', [idCuenta]);
    const idBilletera = billRows.length > 0 ? billRows[0].id_billetera : null;

    let query = `
        SELECT
            IFNULL(SUM(CASE WHEN id_cuenta_destino = ? THEN monto ELSE 0 END), 0) AS ingresos_cuenta,
            IFNULL(SUM(CASE WHEN id_cuenta_origen = ? THEN monto ELSE 0 END), 0) AS egresos_cuenta
    `;
    const params = [idCuenta, idCuenta];

    if (idBilletera) {
        query += `,
            IFNULL(SUM(CASE WHEN id_billetera_destino = ? AND id_cuenta_destino IS NULL THEN monto ELSE 0 END), 0) AS ingresos_billetera,
            IFNULL(SUM(CASE WHEN id_billetera_origen = ? AND id_cuenta_origen IS NULL THEN monto ELSE 0 END), 0) AS egresos_billetera
        `;
        params.push(idBilletera, idBilletera);
    }

    query += ' FROM movimiento_caja WHERE estado = 1';

    const [rows] = await db.query(query, params);
    const r = rows[0];

    let saldo = Number(r.ingresos_cuenta) - Number(r.egresos_cuenta);
    if (idBilletera) {
        saldo += Number(r.ingresos_billetera) - Number(r.egresos_billetera);
    }

    return Math.round(saldo * 100) / 100;
};

const listarCuentasYBilleteras = async (req, res) => {
    try {
        // Obtener cuentas bancarias
        const [cuentas] = await db.query(`
            SELECT c.*, u.nombre as usuario_registro,
                   e.nombre as entidad_financiera, e.tipo_entidad, e.color_primario as color_banco, e.color_fondo as fondo_banco
            FROM cuenta_bancaria c
            LEFT JOIN entidad_financiera e ON c.id_entidad = e.id_entidad
            LEFT JOIN usuarios u ON c.id_usuario_registro = u.id_usuario
            ORDER BY e.nombre ASC
        `);

        // Obtener billeteras digitales
        const [billeteras] = await db.query(`
            SELECT b.*, u.nombre as usuario_registro,
                   p.nombre as tipo_billetera, p.color_primario as color_billetera, p.color_fondo as fondo_billetera,
                   e.nombre as banco_vinculado
            FROM billetera_digital b
            LEFT JOIN proveedor_billetera p ON b.id_proveedor = p.id_proveedor
            LEFT JOIN cuenta_bancaria c ON b.id_cuenta_vinculada = c.id_cuenta
            LEFT JOIN entidad_financiera e ON c.id_entidad = e.id_entidad
            LEFT JOIN usuarios u ON b.id_usuario_registro = u.id_usuario
            ORDER BY p.nombre ASC
        `);

        res.json({
            success: true,
            data: {
                cuentas,
                billeteras
            }
        });
    } catch (error) {
        console.error('Error al listar cuentas y billeteras:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// DECIMAL(10,2): hasta 8 dígitos enteros y 2 decimales, sin negativos.
const REGEX_MONTO_DECIMAL = /^\d{1,8}(\.\d{1,2})?$/;

const registrarCuenta = async (req, res) => {
    let connection;
    try {
        const { id_entidad, tipo_cuenta, nro_cuenta, nro_cci, titular, monto_inicial } = req.body;
        const id_usuario_registro = req.usuario?.id_usuario || req.headers['x-user-profile'] || 1; // Ajustar según el sistema de auth

        if (!id_entidad || !tipo_cuenta || !titular) {
            return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
        }

        // Validación estricta del titular
        const regexTitular = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s.']+$/;
        if (!regexTitular.test(titular)) {
            return res.status(400).json({ success: false, message: 'El titular contiene caracteres no permitidos.' });
        }

        let montoInicialNum = 0;
        if (monto_inicial !== undefined && monto_inicial !== null && String(monto_inicial).trim() !== '') {
            if (!REGEX_MONTO_DECIMAL.test(String(monto_inicial).trim())) {
                return res.status(400).json({ success: false, message: 'El monto inicial no es válido (máximo 2 decimales, sin negativos).' });
            }
            montoInicialNum = Number(monto_inicial);
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [result] = await connection.query(`
            INSERT INTO cuenta_bancaria (id_entidad, tipo_cuenta, nro_cuenta, nro_cci, titular, id_usuario_registro)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id_entidad, tipo_cuenta, nro_cuenta, nro_cci || null, titular, id_usuario_registro]);

        const idCuentaNueva = result.insertId;

        if (montoInicialNum > 0) {
            await connection.query(`
                INSERT INTO movimiento_caja
                (tipo_movimiento, concepto, monto, metodo_pago, id_cuenta_origen, id_billetera_origen, id_cuenta_destino, id_billetera_destino, modulo_origen, id_registro_origen, numero_operacion, id_usuario)
                VALUES ('INGRESO', 'Saldo de Apertura de Cuenta', ?, 'Transferencia', NULL, NULL, ?, NULL, 'MANUAL', ?, NULL, ?)
            `, [montoInicialNum, idCuentaNueva, idCuentaNueva, id_usuario_registro]);
        }

        await connection.commit();

        res.json({ success: true, message: 'Cuenta registrada exitosamente', id_cuenta: idCuentaNueva });
    } catch (error) {
        if (connection) await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.sqlMessage.includes('unique_nro_cci')) {
                return res.status(400).json({ success: false, message: 'Este número de CCI ya se encuentra registrado en otra cuenta.' });
            }
            return res.status(400).json({ success: false, message: 'Este número de cuenta ya se encuentra registrado.' });
        }
        console.error('Error al registrar cuenta:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    } finally {
        if (connection) connection.release();
    }
};

const registrarBilletera = async (req, res) => {
    let connection;
    try {
        const { id_proveedor, numero_celular, titular, id_cuenta_vinculada, monto_inicial } = req.body;
        const id_usuario_registro = req.usuario?.id_usuario || req.headers['x-user-profile'] || 1;

        if (!id_proveedor || !numero_celular || !titular) {
            return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
        }

        // Validación estricta del titular
        const regexTitular = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s.']+$/;
        if (!regexTitular.test(titular)) {
            return res.status(400).json({ success: false, message: 'El titular contiene caracteres no permitidos.' });
        }

        const cuentaVinculada = id_cuenta_vinculada ? parseInt(id_cuenta_vinculada) : null;
        const ruta_qr = req.file ? req.file.path : null;

        if (cuentaVinculada) {
            const [padre] = await db.query('SELECT estado FROM cuenta_bancaria WHERE id_cuenta = ?', [cuentaVinculada]);
            if (!padre.length || padre[0].estado === 0) {
                return res.status(400).json({ success: false, message: 'La cuenta bancaria seleccionada no existe o está inactiva.' });
            }
        }

        // El monto inicial solo aplica a billeteras independientes: si está vinculada a una
        // cuenta, su saldo de apertura ya se declara (o se declaró) al registrar esa cuenta.
        let montoInicialNum = 0;
        if (!cuentaVinculada && monto_inicial !== undefined && monto_inicial !== null && String(monto_inicial).trim() !== '') {
            if (!REGEX_MONTO_DECIMAL.test(String(monto_inicial).trim())) {
                return res.status(400).json({ success: false, message: 'El monto inicial no es válido (máximo 2 decimales, sin negativos).' });
            }
            montoInicialNum = Number(monto_inicial);
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [result] = await connection.query(`
            INSERT INTO billetera_digital (id_proveedor, numero_celular, titular, id_cuenta_vinculada, ruta_qr, id_usuario_registro)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id_proveedor, numero_celular, titular, cuentaVinculada, ruta_qr, id_usuario_registro]);

        const idBilleteraNueva = result.insertId;

        if (montoInicialNum > 0) {
            await connection.query(`
                INSERT INTO movimiento_caja
                (tipo_movimiento, concepto, monto, metodo_pago, id_cuenta_origen, id_billetera_origen, id_cuenta_destino, id_billetera_destino, modulo_origen, id_registro_origen, numero_operacion, id_usuario)
                VALUES ('INGRESO', 'Saldo de Apertura de Cuenta', ?, 'Transferencia', NULL, NULL, NULL, ?, 'MANUAL', ?, NULL, ?)
            `, [montoInicialNum, idBilleteraNueva, idBilleteraNueva, id_usuario_registro]);
        }

        await connection.commit();

        res.json({ success: true, message: 'Billetera registrada exitosamente', id_billetera: idBilleteraNueva });
    } catch (error) {
        if (connection) await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Este número de celular ya está registrado para esa billetera.' });
        }
        console.error('Error al registrar billetera:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    } finally {
        if (connection) connection.release();
    }
};

const listarEntidades = async (req, res) => {
    try {
        const [entidades] = await db.query(`SELECT * FROM entidad_financiera WHERE estado = 1 ORDER BY nombre ASC`);
        res.json({ success: true, data: entidades });
    } catch (error) {
        console.error('Error al listar entidades:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const listarProveedores = async (req, res) => {
    try {
        const [proveedores] = await db.query(`SELECT * FROM proveedor_billetera WHERE estado = 1 ORDER BY nombre ASC`);
        res.json({ success: true, data: proveedores });
    } catch (error) {
        console.error('Error al listar proveedores:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const actualizarCuenta = async (req, res) => {
    const id_cuenta = req.params.id;
    const { id_entidad, tipo_cuenta, nro_cuenta, nro_cci, titular } = req.body;

    try {
        if (!id_entidad || !tipo_cuenta || !titular) {
            return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
        }

        const regexTitular = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s.']+$/;
        if (!regexTitular.test(titular)) {
            return res.status(400).json({ success: false, message: 'El titular contiene caracteres no permitidos.' });
        }

        await db.query(`
            UPDATE cuenta_bancaria 
            SET id_entidad = ?, tipo_cuenta = ?, nro_cuenta = ?, nro_cci = ?, titular = ?
            WHERE id_cuenta = ?
        `, [id_entidad, tipo_cuenta, nro_cuenta || null, nro_cci || null, titular, id_cuenta]);

        res.json({ success: true, message: 'Cuenta actualizada exitosamente' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.sqlMessage.includes('unique_nro_cci')) {
                return res.status(400).json({ success: false, message: 'Este número de CCI ya se encuentra registrado en otra cuenta.' });
            }
            return res.status(400).json({ success: false, message: 'Este número de cuenta ya se encuentra registrado.' });
        }
        console.error('Error al actualizar cuenta:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const actualizarBilletera = async (req, res) => {
    const id_billetera = req.params.id;
    const { id_proveedor, numero_celular, titular, id_cuenta_vinculada } = req.body;

    try {
        if (!id_proveedor || !numero_celular || !titular) {
            return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
        }

        const regexTitular = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s.']+$/;
        if (!regexTitular.test(titular)) {
            return res.status(400).json({ success: false, message: 'El titular contiene caracteres no permitidos.' });
        }

        const cuentaVinculada = id_cuenta_vinculada ? parseInt(id_cuenta_vinculada) : null;
        
        if (cuentaVinculada) {
            const [padre] = await db.query('SELECT estado FROM cuenta_bancaria WHERE id_cuenta = ?', [cuentaVinculada]);
            if (!padre.length || padre[0].estado === 0) {
                return res.status(400).json({ success: false, message: 'La cuenta bancaria seleccionada no existe o está inactiva.' });
            }
        }

        let queryParams = [id_proveedor, numero_celular, titular, cuentaVinculada];
        let setQuery = 'id_proveedor = ?, numero_celular = ?, titular = ?, id_cuenta_vinculada = ?';
        
        if (req.file) {
            setQuery += ', ruta_qr = ?';
            queryParams.push(req.file.path);
        }
        
        queryParams.push(id_billetera);

        await db.query(`
            UPDATE billetera_digital 
            SET ${setQuery}
            WHERE id_billetera = ?
        `, queryParams);

        res.json({ success: true, message: 'Billetera actualizada exitosamente' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Esta billetera ya está registrada con ese número.' });
        }
        console.error('Error al actualizar billetera:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const cambiarEstadoCuenta = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (estado === 0) {
            const saldo = await calcularSaldoCuenta(id);
            if (saldo > 0) {
                return res.status(409).json({
                    success: false,
                    requiereVaciado: true,
                    saldo,
                    message: `Esta cuenta tiene fondos. Para inactivarla, debes vaciar el saldo de S/ ${saldo.toFixed(2)}. ¿A dónde deseas enviar este dinero?`
                });
            }
        }

        await db.query('UPDATE cuenta_bancaria SET estado = ? WHERE id_cuenta = ?', [estado, id]);
        if (estado === 0) {
            await db.query('UPDATE billetera_digital SET estado = 0 WHERE id_cuenta_vinculada = ?', [id]);
        }
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Error interno al cambiar estado' });
    }
};

const transferirYVaciarCuenta = async (req, res) => {
    let connection;
    try {
        const idCuentaVieja = Number(req.params.id);
        const idCuentaDestino = Number(req.body.id_cuenta_destino);
        const id_usuario = req.usuario?.id_usuario || req.headers['x-user-profile'] || 1;

        if (!idCuentaDestino) {
            return res.status(400).json({ success: false, message: 'Debes seleccionar la cuenta destino.' });
        }
        if (idCuentaDestino === idCuentaVieja) {
            return res.status(400).json({ success: false, message: 'La cuenta destino debe ser distinta de la cuenta a inactivar.' });
        }

        const [destinoRows] = await db.query('SELECT estado FROM cuenta_bancaria WHERE id_cuenta = ?', [idCuentaDestino]);
        if (!destinoRows.length || destinoRows[0].estado !== 1) {
            return res.status(400).json({ success: false, message: 'La cuenta destino no existe o no está activa.' });
        }

        const saldo = await calcularSaldoCuenta(idCuentaVieja);
        if (saldo <= 0) {
            return res.status(400).json({ success: false, message: 'Esta cuenta ya no tiene fondos que transferir.' });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Egreso de la cuenta vieja
        await connection.query(`
            INSERT INTO movimiento_caja
            (tipo_movimiento, concepto, monto, metodo_pago, id_cuenta_origen, id_billetera_origen, id_cuenta_destino, id_billetera_destino, modulo_origen, id_registro_origen, numero_operacion, id_usuario)
            VALUES ('EGRESO', ?, ?, 'Transferencia', ?, NULL, NULL, NULL, 'TRANSFERENCIA_INTERNA', ?, NULL, ?)
        `, [`Traslado de saldo por inactivación - Cuenta #${idCuentaVieja}`, saldo, idCuentaVieja, idCuentaVieja, id_usuario]);

        // 2. Ingreso a la cuenta elegida
        await connection.query(`
            INSERT INTO movimiento_caja
            (tipo_movimiento, concepto, monto, metodo_pago, id_cuenta_origen, id_billetera_origen, id_cuenta_destino, id_billetera_destino, modulo_origen, id_registro_origen, numero_operacion, id_usuario)
            VALUES ('INGRESO', ?, ?, 'Transferencia', NULL, NULL, ?, NULL, 'TRANSFERENCIA_INTERNA', ?, NULL, ?)
        `, [`Traslado de saldo recibido por inactivación de cuenta #${idCuentaVieja}`, saldo, idCuentaDestino, idCuentaVieja, id_usuario]);

        // 3. Inactivar la cuenta vieja (y sus billeteras vinculadas, igual que cambiarEstadoCuenta)
        await connection.query('UPDATE cuenta_bancaria SET estado = 0 WHERE id_cuenta = ?', [idCuentaVieja]);
        await connection.query('UPDATE billetera_digital SET estado = 0 WHERE id_cuenta_vinculada = ?', [idCuentaVieja]);

        await connection.commit();

        res.json({ success: true, message: 'Saldo transferido y cuenta inactivada correctamente.', saldo_transferido: saldo });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error al transferir saldo e inactivar cuenta:', error);
        res.status(500).json({ success: false, message: 'Error interno al transferir el saldo' });
    } finally {
        if (connection) connection.release();
    }
};

const cambiarEstadoBilletera = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        if (estado === 1) {
            const [billetera] = await db.query('SELECT id_cuenta_vinculada FROM billetera_digital WHERE id_billetera = ?', [id]);
            if (billetera.length && billetera[0].id_cuenta_vinculada) {
                const [padre] = await db.query('SELECT estado FROM cuenta_bancaria WHERE id_cuenta = ?', [billetera[0].id_cuenta_vinculada]);
                if (!padre.length || padre[0].estado === 0) {
                    return res.status(400).json({ success: false, message: 'No se puede activar esta billetera porque su cuenta bancaria vinculada está inactiva.' });
                }
            }
        }
        await db.query('UPDATE billetera_digital SET estado = ? WHERE id_billetera = ?', [estado, id]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        if (e.code === 'ER_DUP_ENTRY' && e.sqlMessage && e.sqlMessage.includes('uq_active_wallet')) {
            return res.status(400).json({ success: false, message: 'Esta cuenta bancaria ya tiene una billetera vinculada activa. Inactiva la actual antes de activar otra.' });
        }
        res.status(500).json({ success: false, message: 'Error interno al cambiar estado' });
    }
};

module.exports = {
    listarCuentasYBilleteras,
    registrarCuenta,
    registrarBilletera,
    listarEntidades,
    listarProveedores,
    actualizarCuenta,
    actualizarBilletera,
    cambiarEstadoCuenta,
    cambiarEstadoBilletera,
    transferirYVaciarCuenta
};
