-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1joselitobd
-- Tiempo de generación: 15-05-2026 a las 06:56:34
-- Versión del servidor: 8.0.43
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `joselitobd`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `id_cliente` int NOT NULL,
  `tipo_documento` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'DNI o RUC',
  `numero_documento` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_razon_social` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `direccion` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `correo` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` tinyint NOT NULL DEFAULT '1' COMMENT '0: Inactivo, 1: Activo, 2: Eliminado',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `clientes`
--

INSERT INTO `clientes` (`id_cliente`, `tipo_documento`, `numero_documento`, `nombre_razon_social`, `direccion`, `telefono`, `correo`, `estado`, `fecha_creacion`, `fecha_actualizacion`) VALUES
(1, 'DNI', '75405436', 'LUIS ANGEL CASTILLO GUEVARA', 'Calle Santa Martha Mz E Lt 6', '947010376', 'luisgcastilllo@gmail.com', 1, '2026-05-12 14:17:56', '2026-05-12 14:18:38'),
(2, 'RUC', '20337564373', 'TIENDAS POR DEPARTAMENTO RIPLEY S.A.C.', 'AV. LAS BEGONIAS NRO. 545 URB. JARDIN, SAN ISIDRO, LIMA, LIMA', '912934956', '', 1, '2026-05-12 15:59:30', '2026-05-12 15:59:30');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `opciones`
--

CREATE TABLE `opciones` (
  `id_opcion` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ruta` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Identificador de la vista SPA para AJAX',
  `icono` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` tinyint NOT NULL DEFAULT '1' COMMENT '0=inactivo, 1=activo, 2=eliminado',
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `opciones`
--

INSERT INTO `opciones` (`id_opcion`, `nombre`, `ruta`, `icono`, `estado`, `fecha_creacion`, `fecha_actualizacion`) VALUES
(1, 'Dashboard', 'dashboard', 'fas fa-home', 1, '2026-05-08 05:04:23', '2026-05-08 05:04:23'),
(2, 'Gestión de Usuarios', 'usuarios', 'fas fa-users', 1, '2026-05-08 05:04:23', '2026-05-08 05:04:23'),
(3, 'Gestión de Perfiles', 'perfiles', 'fas fa-id-card', 1, '2026-05-08 05:04:23', '2026-05-08 05:04:23'),
(4, 'Gestión de Opciones', 'opciones', 'fas fa-cogs', 1, '2026-05-08 06:39:25', '2026-05-08 06:39:25'),
(5, 'Gestión de Clientes', 'clientes', 'fas fa-users', 1, '2026-05-12 13:40:07', '2026-05-12 13:40:07'),
(6, 'Gestión de Productos', 'productos', 'fas fa-box', 1, '2026-05-12 13:40:07', '2026-05-12 13:40:07'),
(7, 'Gestión de Rutas', 'rutas', 'fas fa-route', 1, '2026-05-20 00:58:00', '2026-05-20 00:58:00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `perfiles`
--

CREATE TABLE `perfiles` (
  `id_perfil` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `estado` tinyint NOT NULL DEFAULT '1' COMMENT '0=inactivo, 1=activo, 2=eliminado',
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `perfiles`
--

INSERT INTO `perfiles` (`id_perfil`, `nombre`, `descripcion`, `estado`, `fecha_creacion`, `fecha_actualizacion`) VALUES
(1, 'Desarrollador', 'Perfil Oculto de Arquitectura', 1, '2026-05-08 06:46:26', '2026-05-08 14:42:28'),
(2, 'Administrador', 'Perfil con acceso total a todas las opciones del sistema', 1, '2026-05-08 05:04:23', '2026-05-08 14:42:56'),
(3, 'Administrador Sede', 'Administrador de la Sede de Chiclayo', 1, '2026-05-08 06:24:39', '2026-05-08 14:42:56'),
(4, 'Dashboard', 'Solo acceso al dashboard', 1, '2026-05-08 14:39:10', '2026-05-08 15:27:54'),
(5, 'Contabilidad', 'Acceso a los módulos de cobro y liquidaciones', 1, '2026-05-08 16:16:48', '2026-05-08 16:16:58');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `perfil_opcion`
--

CREATE TABLE `perfil_opcion` (
  `id_perfil` int NOT NULL,
  `id_opcion` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `perfil_opcion`
--

INSERT INTO `perfil_opcion` (`id_perfil`, `id_opcion`) VALUES
(1, 1),
(2, 1),
(3, 1),
(4, 1),
(5, 1),
(1, 2),
(2, 2),
(1, 3),
(2, 3),
(1, 4),
(1, 5),
(2, 5),
(1, 6),
(2, 6),
(1, 7),
(2, 7);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id_producto` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `estado` tinyint NOT NULL DEFAULT '1' COMMENT '0: Inactivo, 1: Activo, 2: Eliminado',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id_producto`, `nombre`, `descripcion`, `estado`, `fecha_creacion`, `fecha_actualizacion`) VALUES
(1, 'Saco de kion', NULL, 1, '2026-05-12 14:56:59', '2026-05-12 15:12:39'),
(2, 'Ajo Cajamarquino', 'Ajo para pelar y desgranar', 1, '2026-05-12 15:11:39', '2026-05-12 17:17:52'),
(3, 'Ajo Chino', NULL, 1, '2026-05-12 15:33:51', '2026-05-12 15:33:51');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rutas`
--

CREATE TABLE `rutas` (
  `id_ruta` int NOT NULL,
  `ciudad_origen` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ciudad de origen de la ruta',
  `ciudad_destino` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ciudad de destino de la ruta',
  `descripcion` text COLLATE utf8mb4_unicode_ci COMMENT 'Detalles adicionales o puntos intermedios',
  `estado` tinyint(1) NOT NULL DEFAULT '1' COMMENT '0=inactivo, 1=activo, 2=eliminado',
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro de rutas lógicas cubiertas por la empresa';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id_usuario` int NOT NULL,
  `id_perfil` int NOT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clave` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Hash bcrypt',
  `estado` tinyint NOT NULL DEFAULT '1' COMMENT '0=inactivo, 1=activo, 2=eliminado',
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id_usuario`, `id_perfil`, `nombre`, `usuario`, `clave`, `estado`, `fecha_creacion`, `fecha_actualizacion`) VALUES
(1, 1, 'Desarrollador', 'developer', '$2b$10$PIFX4ryhDbYs4bfi3jfOV.KqqhQollcGprSxZuOIDEPZupaHqcGb6', 1, '2026-05-08 06:46:26', '2026-05-08 15:26:35'),
(2, 2, 'Administrador', 'admin', '$2b$10$3Fc2uSgrvHJylWpRoMbOdeS9Oa7y4RxmeymeiDwEkcYzfCEwmPNqW', 1, '2026-05-08 05:04:23', '2026-05-08 14:52:54'),
(3, 3, 'Luis Castillo', 'Luis', '$2b$10$TLKzDd5VRGuYOw4TTItvmupn3Vks33SCrGSwLmfxRx5ZZe6HPyNoS', 1, '2026-05-08 06:25:33', '2026-05-08 14:43:07'),
(4, 4, 'admin2', 'admin2', '$2b$10$Ow3achrtouLsK4kXI7CyW.R6aLVy3dNHDr8A5cCqUTXh1kDwOgcRm', 1, '2026-05-08 14:54:45', '2026-05-08 15:27:24');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id_cliente`),
  ADD UNIQUE KEY `numero_documento` (`numero_documento`);

--
-- Indices de la tabla `opciones`
--
ALTER TABLE `opciones`
  ADD PRIMARY KEY (`id_opcion`);

--
-- Indices de la tabla `perfiles`
--
ALTER TABLE `perfiles`
  ADD PRIMARY KEY (`id_perfil`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `perfil_opcion`
--
ALTER TABLE `perfil_opcion`
  ADD PRIMARY KEY (`id_perfil`,`id_opcion`),
  ADD KEY `id_opcion` (`id_opcion`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id_producto`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `rutas`
--
ALTER TABLE `rutas`
  ADD PRIMARY KEY (`id_ruta`),
  ADD UNIQUE KEY `uq_origen_destino` (`ciudad_origen`,`ciudad_destino`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `usuario` (`usuario`),
  ADD KEY `id_perfil` (`id_perfil`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id_cliente` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `opciones`
--
ALTER TABLE `opciones`
  MODIFY `id_opcion` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `perfiles`
--
ALTER TABLE `perfiles`
  MODIFY `id_perfil` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id_producto` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `rutas`
--
ALTER TABLE `rutas`
  MODIFY `id_ruta` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id_usuario` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `perfil_opcion`
--
ALTER TABLE `perfil_opcion`
  ADD CONSTRAINT `perfil_opcion_ibfk_1` FOREIGN KEY (`id_perfil`) REFERENCES `perfiles` (`id_perfil`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `perfil_opcion_ibfk_2` FOREIGN KEY (`id_opcion`) REFERENCES `opciones` (`id_opcion`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `usuarios`usuarios
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`id_perfil`) REFERENCES `perfiles` (`id_perfil`) ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
