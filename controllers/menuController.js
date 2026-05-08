const OpcionModel = require('../models/OpcionModel');

const obtenerMenu = async (req, res) => {
    try {
        const { id_perfil } = req.params;

        if (!id_perfil) {
            return res.status(400).json({ success: false, message: 'ID de perfil es requerido' });
        }

        const menu = await OpcionModel.obtenerMenuPorPerfil(id_perfil);

        return res.status(200).json({
            success: true,
            data: menu
        });

    } catch (error) {
        console.error('Error al obtener menú:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

module.exports = {
    obtenerMenu
};
