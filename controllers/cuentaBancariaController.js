const db = require('../config/db');

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

const registrarCuenta = async (req, res) => {
    try {
        const { id_entidad, tipo_cuenta, nro_cuenta, nro_cci, titular } = req.body;
        const id_usuario_registro = req.usuario?.id_usuario || req.headers['x-user-profile'] || 1; // Ajustar según el sistema de auth

        if (!id_entidad || !tipo_cuenta || !titular) {
            return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
        }

        // Validación estricta del titular
        const regexTitular = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s.']+$/;
        if (!regexTitular.test(titular)) {
            return res.status(400).json({ success: false, message: 'El titular contiene caracteres no permitidos.' });
        }

        const [result] = await db.query(`
            INSERT INTO cuenta_bancaria (id_entidad, tipo_cuenta, nro_cuenta, nro_cci, titular, id_usuario_registro)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id_entidad, tipo_cuenta, nro_cuenta, nro_cci || null, titular, id_usuario_registro]);

        res.json({ success: true, message: 'Cuenta registrada exitosamente', id_cuenta: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.sqlMessage.includes('unique_nro_cci')) {
                return res.status(400).json({ success: false, message: 'Este número de CCI ya se encuentra registrado en otra cuenta.' });
            }
            return res.status(400).json({ success: false, message: 'Este número de cuenta ya se encuentra registrado.' });
        }
        console.error('Error al registrar cuenta:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const registrarBilletera = async (req, res) => {
    try {
        const { id_proveedor, numero_celular, titular, id_cuenta_vinculada } = req.body;
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

        const [result] = await db.query(`
            INSERT INTO billetera_digital (id_proveedor, numero_celular, titular, id_cuenta_vinculada, ruta_qr, id_usuario_registro)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id_proveedor, numero_celular, titular, cuentaVinculada, ruta_qr, id_usuario_registro]);

        res.json({ success: true, message: 'Billetera registrada exitosamente', id_billetera: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Este número de celular ya está registrado para esa billetera.' });
        }
        console.error('Error al registrar billetera:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
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
    cambiarEstadoBilletera
};
