const db = require('../config/db');

const obtenerDeudas = async (req, res) => {
    try {
        const { search, filtroEstado } = req.query;

        let query = `
            SELECT 
                c.id_carga,
                c.id_viaje,
                v.fecha_llegada,
                c.flete_total,
                c.estado_cobro,
                c.estado_entrega,
                cli.nombre_razon_social AS cliente_nombre
            FROM Carga c
            JOIN Viaje v ON c.id_viaje = v.id_viaje
            JOIN Clientes cli ON c.id_destinatario = cli.id_cliente
            WHERE c.estado = 1
            AND v.estado_operativo IN ('Llegó a Destino', 'Finalizado')
        `;
        
        let queryParams = [];

        if (filtroEstado === 'activas') {
            query += ` AND c.estado_cobro IN ('Pendiente', 'Parcial')`;
        } else if (filtroEstado === 'completadas') {
            query += ` AND c.estado_cobro = 'Completado'`;
        } else if (filtroEstado === 'todos') {
            query += ` AND c.estado_cobro IN ('Pendiente', 'Parcial', 'Completado')`;
        } else {
            // Default to activas
            query += ` AND c.estado_cobro IN ('Pendiente', 'Parcial')`;
        }

        if (search) {
            query += ` AND (c.id_carga LIKE ? OR cli.nombre_razon_social LIKE ?)`;
            const searchParam = `%${search}%`;
            queryParams.push(searchParam, searchParam);
        }

        query += ` ORDER BY c.id_carga DESC`;

        const [rows] = await db.query(query, queryParams);

        return res.status(200).json({ success: true, data: rows });

    } catch (error) {
        console.error('Error en obtenerDeudas:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener deudas por cobrar' });
    }
};

module.exports = {
    obtenerDeudas
};
