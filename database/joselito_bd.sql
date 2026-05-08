-- Creación de la base de datos
CREATE DATABASE IF NOT EXISTS JoselitoBD CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE JoselitoBD;

-- --------------------------------------------------------
-- ESTRUCTURA DE TABLAS
-- --------------------------------------------------------

-- Tabla de perfiles
CREATE TABLE IF NOT EXISTS perfiles (
    id_perfil INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    -- Campos de auditoría
    estado TINYINT NOT NULL DEFAULT 1 COMMENT '0=inactivo, 1=activo, 2=eliminado',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de opciones (menú adaptado a SPA)
CREATE TABLE IF NOT EXISTS opciones (
    id_opcion INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    ruta VARCHAR(100) NOT NULL COMMENT 'Identificador de la vista SPA para AJAX',
    icono VARCHAR(50),
    -- Campos de auditoría
    estado TINYINT NOT NULL DEFAULT 1 COMMENT '0=inactivo, 1=activo, 2=eliminado',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla pivote perfil_opcion
CREATE TABLE IF NOT EXISTS perfil_opcion (
    id_perfil INT NOT NULL,
    id_opcion INT NOT NULL,
    PRIMARY KEY (id_perfil, id_opcion),
    FOREIGN KEY (id_perfil) REFERENCES perfiles(id_perfil) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_opcion) REFERENCES opciones(id_opcion) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    id_perfil INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    clave VARCHAR(255) NOT NULL COMMENT 'Hash bcrypt',
    -- Campos de auditoría
    estado TINYINT NOT NULL DEFAULT 1 COMMENT '0=inactivo, 1=activo, 2=eliminado',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_perfil) REFERENCES perfiles(id_perfil) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- INSERCIÓN DE DATOS INICIALES (SEEDER)
-- --------------------------------------------------------

-- 1. Crear el perfil "Administrador"
INSERT INTO perfiles (nombre, descripcion) VALUES 
('Administrador', 'Perfil con acceso total a todas las opciones del sistema');

-- 2. Crear las opciones del menú básicas adaptadas a SPA
-- Nota: Las rutas representan el "view identifier" o componente a cargar dinámicamente, no una URL completa.
INSERT INTO opciones (nombre, ruta, icono) VALUES 
('Dashboard', 'dashboard', 'fas fa-home'),
('Gestión de Usuarios', 'usuarios', 'fas fa-users'),
('Gestión de Perfiles', 'perfiles', 'fas fa-id-card');

-- 3. Asociar las opciones al perfil de Administrador (id_perfil = 1)
INSERT INTO perfil_opcion (id_perfil, id_opcion) VALUES 
(1, 1), -- Administrador -> Dashboard
(1, 2), -- Administrador -> Gestión de Usuarios
(1, 3); -- Administrador -> Gestión de Perfiles

-- 4. Crear un usuario administrador
-- usuario: admin
-- clave: 123456 (Hash bcrypt para la clave 123456)
INSERT INTO usuarios (id_perfil, nombre, usuario, clave) VALUES 
(1, 'Administrador del Sistema', 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');
