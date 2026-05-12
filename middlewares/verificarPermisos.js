const verificarAdmin = (req, res, next) => {
    const idPerfil = req.headers['x-user-profile'];

    if (!idPerfil) {
        return res.status(401).json({ success: false, message: 'No se proporcionó información de perfil (No autorizado)' });
    }

    // Permitir acceso si es Administrador (2) o Desarrollador (1)
    if (parseInt(idPerfil) !== 2 && parseInt(idPerfil) !== 1) {
        return res.status(403).json({ success: false, message: 'Acceso denegado: Se requieren privilegios de Administrador' });
    }

    next();
};

const verificarDeveloper = (req, res, next) => {
    const idPerfil = req.headers['x-user-profile'];

    if (!idPerfil) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    // Permitir acceso estricto SOLO al Desarrollador (1)
    if (parseInt(idPerfil) !== 1) {
        return res.status(403).json({ success: false, message: 'Acceso denegado: Área Restringida al Desarrollador' });
    }

    next();
};

const verificarAuth = (req, res, next) => {
    const idPerfil = req.headers['x-user-profile'];

    if (!idPerfil) {
        return res.status(401).json({ success: false, message: 'No autorizado: Falta información de perfil' });
    }

    next();
};

module.exports = {
    verificarAdmin,
    verificarDeveloper,
    verificarAuth
};
