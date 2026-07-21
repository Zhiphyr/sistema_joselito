-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Versión del servidor:         8.0.46 - MySQL Community Server - GPL
-- SO del servidor:              Win64
-- HeidiSQL Versión:             12.17.0.7270
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Volcando estructura para tabla joselitobd.adelantos_viaje
CREATE TABLE IF NOT EXISTS `adelantos_viaje` (
  `id_adelanto` int NOT NULL AUTO_INCREMENT,
  `id_viaje` int NOT NULL,
  `id_usuario` int NOT NULL COMMENT 'ID del usuario en sesión que registra el adelanto',
  `monto` decimal(10,2) NOT NULL,
  `metodo_entrega` varchar(50) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Efectivo, Billetera Digital, Transferencia',
  `numero_operacion` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `evidencia_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `motivo_referencial` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Ej: Viáticos iniciales, Peaje extra',
  `estado` tinyint DEFAULT '1' COMMENT '1: Activo, 0: Anulado',
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_adelanto`),
  UNIQUE KEY `numero_operacion` (`numero_operacion`),
  KEY `fk_adelanto_viaje` (`id_viaje`),
  KEY `fk_adelanto_usuario` (`id_usuario`),
  CONSTRAINT `fk_adelanto_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `fk_adelanto_viaje` FOREIGN KEY (`id_viaje`) REFERENCES `viaje` (`id_viaje`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.adelantos_viaje: ~4 rows (aproximadamente)
INSERT INTO `adelantos_viaje` (`id_adelanto`, `id_viaje`, `id_usuario`, `monto`, `metodo_entrega`, `numero_operacion`, `evidencia_url`, `motivo_referencial`, `estado`, `fecha_registro`, `fecha_actualizacion`) VALUES
	(1, 20, 2, 500.00, 'Billetera Digital', NULL, NULL, 'Viáticos iniciales', 1, '2026-06-23 15:27:45', '2026-06-23 15:34:16'),
	(2, 9, 2, 300.00, 'Billetera Digital', NULL, NULL, 'Viáticos iniciales', 1, '2026-06-26 15:27:36', '2026-06-26 15:28:01'),
	(3, 21, 2, 200.00, 'Transferencia', NULL, NULL, 'Se realizo una transferencia para los peajes', 1, '2026-06-26 17:29:12', '2026-06-26 17:29:12'),
	(4, 21, 2, 100.00, 'Billetera Digital', '68596325', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1782496515/sistema_joselito/comprobantes/voucher_1782496515631.jpg', 'Yapeo para combustible', 1, '2026-06-26 17:55:17', '2026-06-26 17:55:17'),
	(5, 29, 2, 500.00, 'Efectivo', NULL, NULL, 'Viáticos iniciales', 1, '2026-06-30 04:14:15', '2026-06-30 04:14:15'),
	(6, 31, 2, 500.00, 'Efectivo', NULL, NULL, 'Viáticos iniciales', 1, '2026-06-30 14:00:02', '2026-06-30 14:00:02'),
	(7, 32, 2, 500.00, 'Billetera Digital', '80202034', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1782831476/sistema_joselito/comprobantes/voucher_1782831476796.jpg', 'Viáticos iniciales', 1, '2026-06-30 14:57:58', '2026-06-30 14:57:58'),
	(8, 32, 2, 300.00, 'Efectivo', NULL, NULL, 'Peajes', 1, '2026-06-30 14:59:34', '2026-06-30 14:59:34');

-- Volcando estructura para tabla joselitobd.camiones
CREATE TABLE IF NOT EXISTS `camiones` (
  `id_camion` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Alias, marca o modelo del camión',
  `placa` varchar(20) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Placa de rodaje (única por unidad)',
  `tipo_documento` varchar(10) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'DNI o RUC',
  `numero_documento` varchar(20) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Número de documento del conductor',
  `conductor` varchar(150) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Nombre o Razón Social del conductor',
  `direccion` varchar(255) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Dirección del conductor',
  `telefono` varchar(20) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Teléfono asignado a la unidad',
  `estado` tinyint(1) NOT NULL DEFAULT '1' COMMENT '0=inactivo, 1=activo, 2=eliminado',
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_camion`),
  UNIQUE KEY `uq_placa` (`placa`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Registro de unidades de transporte de la flota';

-- Volcando datos para la tabla joselitobd.camiones: ~3 rows (aproximadamente)
INSERT INTO `camiones` (`id_camion`, `nombre`, `placa`, `tipo_documento`, `numero_documento`, `conductor`, `direccion`, `telefono`, `estado`, `fecha_creacion`, `fecha_actualizacion`) VALUES
	(1, 'Volvo F11 Azul', 'M8A-987', 'DNI', '75405436', 'LUIS ANGEL CASTILLO GUEVARA', 'CALLE SANTA MARTHA MZ. E LT. 06, JOSE LEONARDO ORTIZ, CHICLAYO, LAMBAYEQUE', '956487152', 1, '2026-05-20 06:13:20', '2026-05-20 06:13:20'),
	(2, 'Scania Azul', 'M7A-658', 'DNI', '75407777', 'JHON DEIVIS RODAS BUSTAMANTE', 'JR. GUEPI 790, MORALES, SAN MARTIN, SAN MARTIN', '963256325', 1, '2026-05-27 22:19:12', '2026-05-27 22:19:12'),
	(3, 'Fuso Azul', 'B9A-695', 'DNI', '75698452', 'NAHUM HONORATO PADILLA MANCILLA', 'C.POBLADO PICHARI BAJA, PICHARI, LA CONVENCION, CUSCO', '984554123', 1, '2026-05-28 05:25:19', '2026-05-28 05:25:19');

-- Volcando estructura para tabla joselitobd.carga
CREATE TABLE IF NOT EXISTS `carga` (
  `id_carga` int NOT NULL AUTO_INCREMENT,
  `id_viaje` int NOT NULL,
  `id_remitente` int NOT NULL,
  `id_destinatario` int NOT NULL,
  `flete_total` decimal(10,2) DEFAULT '0.00',
  `estado_cobro` enum('Pendiente','Completado','Parcial','Anulado') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Pendiente' COMMENT 'Estado de cobranza del flete',
  `estado_entrega` enum('En Almacen de Origen','En Almacen de Destino','En ruta','Entregado','Rechazado','Siniestrado','Transbordado','Siniestrado Parcialmente','Entregado Parcialmente','Rechazado Total') COLLATE utf8mb4_general_ci DEFAULT 'En Almacen de Origen',
  `id_usuario` int NOT NULL,
  `estado` tinyint(1) DEFAULT '1',
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_carga`),
  KEY `fk_carga_viaje` (`id_viaje`),
  KEY `fk_carga_remitente` (`id_remitente`),
  KEY `fk_carga_destinatario` (`id_destinatario`),
  KEY `fk_carga_usuario` (`id_usuario`),
  CONSTRAINT `fk_carga_destinatario` FOREIGN KEY (`id_destinatario`) REFERENCES `clientes` (`id_cliente`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_carga_remitente` FOREIGN KEY (`id_remitente`) REFERENCES `clientes` (`id_cliente`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_carga_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_carga_viaje` FOREIGN KEY (`id_viaje`) REFERENCES `viaje` (`id_viaje`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.carga: ~75 rows (aproximadamente)
INSERT INTO `carga` (`id_carga`, `id_viaje`, `id_remitente`, `id_destinatario`, `flete_total`, `estado_cobro`, `estado_entrega`, `id_usuario`, `estado`, `fecha_registro`, `fecha_actualizacion`) VALUES
	(1, 1, 3, 2, 108.00, 'Completado', 'Entregado', 2, 1, '2026-05-28 04:34:18', '2026-06-24 06:33:46'),
	(2, 1, 3, 4, 810.00, 'Pendiente', 'Entregado', 2, 1, '2026-05-28 04:34:18', '2026-06-05 23:21:54'),
	(3, 2, 4, 5, 832.00, 'Pendiente', 'Entregado', 2, 1, '2026-05-28 05:21:47', '2026-06-06 00:03:22'),
	(4, 2, 3, 1, 240.00, 'Pendiente', 'Entregado', 2, 1, '2026-05-28 05:21:47', '2026-06-06 00:03:26'),
	(5, 3, 1, 5, 392.40, 'Pendiente', 'Entregado', 2, 1, '2026-05-29 02:40:04', '2026-06-06 17:57:49'),
	(6, 3, 1, 3, 1740.00, 'Pendiente', 'Entregado', 2, 1, '2026-05-29 02:40:04', '2026-06-06 17:57:51'),
	(7, 3, 4, 2, 304.00, 'Pendiente', 'Entregado', 2, 1, '2026-05-29 02:40:04', '2026-06-06 17:57:54'),
	(8, 3, 1, 2, 3430.00, 'Pendiente', 'Entregado', 2, 1, '2026-05-29 02:40:04', '2026-06-06 17:57:57'),
	(9, 4, 1, 3, 150.00, 'Anulado', 'Rechazado', 2, 1, '2026-05-29 17:47:44', '2026-06-06 17:48:03'),
	(10, 4, 1, 3, 60.00, 'Pendiente', 'Entregado', 2, 1, '2026-05-29 17:47:44', '2026-06-06 17:57:01'),
	(11, 5, 1, 2, 2450.00, 'Pendiente', 'Entregado', 2, 1, '2026-06-05 23:49:37', '2026-06-05 23:49:57'),
	(12, 5, 3, 2, 825.00, 'Pendiente', 'Entregado', 2, 1, '2026-06-05 23:49:37', '2026-06-05 23:50:00'),
	(13, 5, 4, 5, 2125.00, 'Pendiente', 'Entregado', 2, 1, '2026-06-05 23:49:37', '2026-06-05 23:50:03'),
	(14, 4, 1, 3, 165.00, 'Pendiente', 'Entregado', 1, 1, '2026-06-06 17:48:03', '2026-06-06 17:48:03'),
	(15, 6, 1, 4, 63.00, 'Anulado', 'Rechazado', 2, 1, '2026-06-06 18:02:51', '2026-06-06 18:03:54'),
	(16, 6, 1, 2, 148.50, 'Anulado', 'Rechazado', 2, 1, '2026-06-06 18:02:51', '2026-06-06 18:03:16'),
	(17, 6, 1, 2, 184.50, 'Pendiente', 'Entregado', 1, 1, '2026-06-06 18:03:16', '2026-06-06 18:03:16'),
	(18, 6, 1, 4, 72.00, 'Pendiente', 'Entregado', 1, 1, '2026-06-06 18:03:54', '2026-06-06 18:03:54'),
	(19, 7, 1, 2, 532.50, 'Anulado', 'Rechazado', 2, 1, '2026-06-06 18:05:09', '2026-06-06 18:05:23'),
	(20, 7, 1, 2, 1065.00, 'Pendiente', 'Entregado', 1, 1, '2026-06-06 18:05:23', '2026-06-06 18:05:23'),
	(21, 8, 1, 2, 1000.00, 'Anulado', 'Rechazado', 2, 1, '2026-06-06 23:57:21', '2026-06-07 01:51:58'),
	(22, 8, 3, 5, 495.00, 'Anulado', 'Rechazado', 2, 1, '2026-06-06 23:57:21', '2026-06-07 00:49:17'),
	(23, 8, 4, 5, 750.00, 'Anulado', 'Rechazado', 2, 1, '2026-06-06 23:57:21', '2026-06-07 00:51:27'),
	(24, 8, 4, 5, 4800.00, 'Pendiente', 'Entregado', 1, 1, '2026-06-07 00:51:27', '2026-06-07 00:51:27'),
	(25, 9, 1, 2, 720.00, 'Anulado', 'Siniestrado', 2, 1, '2026-06-07 00:54:25', '2026-06-08 05:16:59'),
	(26, 8, 1, 2, 3200.00, 'Pendiente', 'Entregado', 1, 1, '2026-06-07 01:51:58', '2026-06-07 01:51:58'),
	(27, 10, 1, 2, 225.00, 'Anulado', 'Rechazado', 2, 1, '2026-06-07 01:53:59', '2026-06-07 01:54:58'),
	(28, 10, 3, 5, 8427.50, 'Pendiente', 'Entregado', 2, 1, '2026-06-07 01:53:59', '2026-06-09 04:45:34'),
	(29, 10, 1, 2, 525.00, 'Completado', 'Entregado', 1, 1, '2026-06-07 01:54:58', '2026-06-12 07:42:39'),
	(30, 11, 1, 2, 570.00, 'Anulado', 'Rechazado', 2, 1, '2026-06-07 02:07:16', '2026-06-07 05:23:06'),
	(31, 11, 1, 5, 7200.00, 'Pendiente', 'Entregado', 2, 1, '2026-06-07 02:07:16', '2026-06-07 05:23:23'),
	(32, 11, 3, 2, 1222.80, 'Parcial', 'Entregado', 2, 1, '2026-06-07 02:07:16', '2026-06-12 07:36:44'),
	(33, 11, 1, 2, 840.00, 'Completado', 'Entregado', 1, 1, '2026-06-07 05:23:06', '2026-06-24 06:32:09'),
	(34, 12, 1, 2, 3000.00, 'Anulado', 'Rechazado', 1, 1, '2026-06-08 05:16:59', '2026-06-10 07:06:10'),
	(35, 13, 1, 2, 2100.00, 'Anulado', 'Siniestrado', 2, 1, '2026-06-08 22:23:17', '2026-06-08 22:31:31'),
	(36, 13, 3, 5, 0.00, 'Anulado', 'Siniestrado', 2, 1, '2026-06-08 22:23:17', '2026-06-08 22:31:31'),
	(37, 14, 1, 2, 20.16, 'Anulado', 'Rechazado', 1, 1, '2026-06-08 22:31:31', '2026-06-27 01:07:36'),
	(38, 14, 3, 5, 591.60, 'Anulado', 'Entregado', 1, 1, '2026-06-08 22:31:31', '2026-06-12 15:52:10'),
	(39, 12, 1, 2, 2400.00, 'Completado', 'Entregado', 1, 1, '2026-06-10 07:06:10', '2026-06-12 00:26:42'),
	(40, 15, 1, 2, 0.00, 'Anulado', 'Siniestrado', 2, 1, '2026-06-11 21:25:57', '2026-06-11 21:38:00'),
	(41, 16, 1, 2, 900.00, 'Anulado', 'Transbordado', 1, 1, '2026-06-11 21:38:00', '2026-06-30 01:17:12'),
	(42, 17, 3, 2, 8910.00, 'Anulado', 'Siniestrado', 1, 1, '2026-06-12 17:32:50', '2026-06-29 20:43:08'),
	(43, 17, 3, 5, 1782.00, 'Anulado', 'Transbordado', 1, 1, '2026-06-12 17:32:50', '2026-06-29 20:43:08'),
	(44, 17, 4, 5, 630.00, 'Anulado', 'Transbordado', 1, 1, '2026-06-12 17:32:50', '2026-06-29 20:43:08'),
	(45, 17, 2, 3, 540.00, 'Anulado', 'Transbordado', 1, 1, '2026-06-12 17:32:50', '2026-06-29 20:43:08'),
	(46, 18, 1, 2, 1260.00, 'Anulado', 'Transbordado', 1, 1, '2026-06-12 17:50:12', '2026-06-29 18:50:40'),
	(48, 20, 2, 3, 0.00, 'Anulado', 'Siniestrado', 2, 1, '2026-06-23 15:27:45', '2026-06-26 07:48:49'),
	(49, 21, 2, 3, 3360.00, 'Pendiente', 'Entregado', 1, 1, '2026-06-26 07:48:49', '2026-06-26 18:09:35'),
	(50, 14, 1, 2, 3003.84, 'Parcial', 'Entregado', 1, 1, '2026-06-27 01:07:36', '2026-06-27 18:17:45'),
	(51, 22, 1, 2, 1260.00, 'Pendiente', 'Entregado', 1, 1, '2026-06-29 18:50:40', '2026-06-30 03:44:03'),
	(52, 23, 3, 5, 1663.20, 'Pendiente', 'Entregado Parcialmente', 1, 1, '2026-06-29 20:43:08', '2026-06-30 05:55:16'),
	(53, 23, 4, 5, 630.00, 'Pendiente', 'Entregado', 1, 1, '2026-06-29 20:43:08', '2026-06-30 05:55:31'),
	(54, 23, 2, 3, 540.00, 'Anulado', 'Rechazado Total', 1, 1, '2026-06-29 20:43:08', '2026-06-30 05:55:34'),
	(55, 24, 2, 3, 7650.00, 'Anulado', 'Siniestrado Parcialmente', 2, 1, '2026-06-30 01:09:10', '2026-06-30 01:45:10'),
	(56, 24, 3, 5, 10800.00, 'Anulado', 'Siniestrado Parcialmente', 2, 1, '2026-06-30 01:09:10', '2026-06-30 01:45:10'),
	(57, 25, 1, 2, 450.00, 'Anulado', 'Rechazado', 1, 1, '2026-06-30 01:17:12', '2026-06-30 05:00:35'),
	(58, 26, 3, 4, 5400.00, 'Anulado', 'Siniestrado Parcialmente', 2, 1, '2026-06-30 01:35:46', '2026-06-30 01:36:22'),
	(59, 27, 3, 4, 1350.00, 'Pendiente', 'Entregado Parcialmente', 1, 1, '2026-06-30 01:36:22', '2026-06-30 05:33:19'),
	(60, 28, 2, 3, 6300.00, 'Pendiente', 'Entregado', 1, 1, '2026-06-30 01:45:10', '2026-06-30 05:54:30'),
	(61, 28, 3, 5, 8460.00, 'Anulado', 'Rechazado Total', 1, 1, '2026-06-30 01:45:10', '2026-06-30 05:54:39'),
	(62, 29, 2, 3, 250.00, 'Anulado', 'Transbordado', 2, 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39'),
	(63, 29, 1, 4, 3000.00, 'Anulado', 'Siniestrado Parcialmente', 2, 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39'),
	(64, 29, 4, 5, 5250.00, 'Anulado', 'Siniestrado Parcialmente', 2, 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39'),
	(65, 29, 4, 3, 1450.00, 'Anulado', 'Siniestrado Parcialmente', 2, 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39'),
	(66, 29, 5, 1, 3125.00, 'Anulado', 'Siniestrado', 2, 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39'),
	(67, 29, 4, 1, 630.00, 'Anulado', 'Transbordado', 2, 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39'),
	(68, 30, 2, 3, 250.00, 'Pendiente', 'En ruta', 1, 1, '2026-06-30 04:16:39', '2026-06-30 04:16:39'),
	(69, 30, 1, 4, 1500.00, 'Pendiente', 'En ruta', 1, 1, '2026-06-30 04:16:39', '2026-06-30 04:16:39'),
	(70, 30, 4, 5, 5000.00, 'Pendiente', 'En ruta', 1, 1, '2026-06-30 04:16:39', '2026-06-30 04:16:39'),
	(71, 30, 4, 3, 1329.00, 'Pendiente', 'En ruta', 1, 1, '2026-06-30 04:16:39', '2026-06-30 04:16:39'),
	(72, 30, 4, 1, 630.00, 'Pendiente', 'En ruta', 1, 1, '2026-06-30 04:16:39', '2026-06-30 04:16:39'),
	(73, 25, 1, 2, 450.00, 'Pendiente', 'Entregado', 1, 1, '2026-06-30 05:00:35', '2026-06-30 05:00:35'),
	(74, 31, 5, 2, 300.00, 'Pendiente', 'Entregado', 2, 1, '2026-06-30 14:00:02', '2026-06-30 14:00:27'),
	(75, 31, 1, 2, 3087.20, 'Pendiente', 'Entregado Parcialmente', 2, 1, '2026-06-30 14:00:02', '2026-06-30 14:00:47'),
	(76, 31, 2, 3, 3577.60, 'Pendiente', 'Entregado Parcialmente', 2, 1, '2026-06-30 14:00:02', '2026-06-30 14:01:07'),
	(77, 32, 2, 5, 13500.00, 'Pendiente', 'En ruta', 2, 1, '2026-06-30 14:57:58', '2026-06-30 14:57:58');

-- Volcando estructura para tabla joselitobd.clientes
CREATE TABLE IF NOT EXISTS `clientes` (
  `id_cliente` int NOT NULL AUTO_INCREMENT,
  `tipo_documento` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'DNI o RUC',
  `numero_documento` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `nombre_razon_social` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `direccion` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `telefono` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `correo` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `estado` tinyint NOT NULL DEFAULT '1' COMMENT '0: Inactivo, 1: Activo, 2: Eliminado',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cliente`),
  UNIQUE KEY `numero_documento` (`numero_documento`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.clientes: ~4 rows (aproximadamente)
INSERT INTO `clientes` (`id_cliente`, `tipo_documento`, `numero_documento`, `nombre_razon_social`, `direccion`, `telefono`, `correo`, `estado`, `fecha_creacion`, `fecha_actualizacion`) VALUES
	(1, 'DNI', '75405436', 'LUIS ANGEL CASTILLO GUEVARA', 'Calle Santa Martha Mz E Lt 6', '947010376', 'luisgcastilllo@gmail.com', 1, '2026-05-12 14:17:56', '2026-05-12 14:18:38'),
	(2, 'RUC', '20337564373', 'TIENDAS POR DEPARTAMENTO RIPLEY S.A.C.', 'AV. LAS BEGONIAS NRO. 545 URB. JARDIN, SAN ISIDRO, LIMA, LIMA', '912934956', '', 1, '2026-05-12 15:59:30', '2026-05-12 15:59:30'),
	(3, 'DNI', '75406589', 'VALERY SOFIA QUINCHO BERRIOS', 'CALLE EL TUMI URB. SAN JUAN BAUTISTA DE VILLA MZ. G LT. 19B, CHORRILLOS, LIMA, LIMA', '958444123', '', 1, '2026-05-27 22:18:17', '2026-05-27 22:18:17'),
	(4, 'DNI', '75896325', 'DARIANA NOVOA MERCADO', 'CALLE ZEPITA 477, SAN PEDRO DE LLOC, PACASMAYO, LA LIBERTAD', '947555845', '', 1, '2026-05-28 04:33:25', '2026-05-28 04:33:25'),
	(5, 'RUC', '20608300393', 'COMPAÑIA FOOD RETAIL S.A.C.', 'CAL. CESAR MORELLI NRO. 181      SAN BORJA NORTE, SAN BORJA, LIMA, LIMA', '911563258', '', 1, '2026-05-28 05:10:57', '2026-05-28 05:10:57');

-- Volcando estructura para tabla joselitobd.configuracion_sistema
CREATE TABLE IF NOT EXISTS `configuracion_sistema` (
  `id_config` int NOT NULL AUTO_INCREMENT,
  `parametro` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `valor` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_general_ci,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_config`),
  UNIQUE KEY `parametro` (`parametro`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.configuracion_sistema: ~0 rows (aproximadamente)
INSERT INTO `configuracion_sistema` (`id_config`, `parametro`, `valor`, `descripcion`, `fecha_actualizacion`) VALUES
	(1, 'PIN_ANULACION_PAGOS', '$2b$10$JS9osLLm2f8yZdZQ8qJu0uWS3vHoocQfEAjPvdgUYuBvZLkFCfMLW', 'PIN numérico para autorizar anulación de pagos', '2026-06-12 09:18:16');

-- Volcando estructura para tabla joselitobd.cuenta_bancaria
CREATE TABLE IF NOT EXISTS `cuenta_bancaria` (
  `id_cuenta` int NOT NULL AUTO_INCREMENT,
  `entidad_financiera` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `tipo_cuenta` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `nro_cuenta` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `nro_cci` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `titular` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `ruta_qr` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `estado` tinyint DEFAULT '1',
  PRIMARY KEY (`id_cuenta`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.cuenta_bancaria: ~4 rows (aproximadamente)
INSERT INTO `cuenta_bancaria` (`id_cuenta`, `entidad_financiera`, `tipo_cuenta`, `nro_cuenta`, `nro_cci`, `titular`, `ruta_qr`, `estado`) VALUES
	(1, 'Yape', 'Celular', '999888777', NULL, 'Transporte Joselito', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1781247118/qr_yape1_llvstg.jpg', 1),
	(2, 'Plin', 'Celular', '999888777', NULL, 'Transporte Joselito', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1781247118/qr_plin_pgyta3.jpg', 1),
	(3, 'BCP', 'Corriente', '191-0000000-0-00', '002191000000000012', 'Transporte Joselito S.A.C.', NULL, 1),
	(4, 'Interbank', 'Ahorros', '200-300000000', NULL, 'Teofila Inca', NULL, 1);

-- Volcando estructura para tabla joselitobd.detalle_carga
CREATE TABLE IF NOT EXISTS `detalle_carga` (
  `id_detalle` int NOT NULL AUTO_INCREMENT,
  `id_carga` int NOT NULL,
  `id_producto` int NOT NULL,
  `marca_visual` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Marca distintiva o descripción visual en el empaque o producto',
  `cantidad_sacos` int NOT NULL,
  `peso_unitario` decimal(10,2) DEFAULT NULL COMMENT 'Peso por unidad de saco en Kg',
  `peso_total` decimal(10,2) DEFAULT NULL COMMENT 'Peso total (cantidad_sacos * peso_unitario)',
  `precio_peso` decimal(10,2) DEFAULT NULL COMMENT 'Tarifa o precio aplicado por cada Kg de la carga',
  `flete_subtotal` decimal(10,2) DEFAULT NULL COMMENT 'Subtotal calculado por el peso (peso_total * precio_peso)',
  `estado_operativo` enum('Normal','Siniestrado','Transbordado','Entregado','Rechazado') COLLATE utf8mb4_general_ci DEFAULT 'Normal',
  `estado` tinyint(1) DEFAULT '1',
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_detalle`),
  KEY `fk_detalle_carga` (`id_carga`),
  KEY `fk_detalle_producto` (`id_producto`),
  CONSTRAINT `fk_detalle_carga` FOREIGN KEY (`id_carga`) REFERENCES `carga` (`id_carga`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_detalle_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=137 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.detalle_carga: ~133 rows (aproximadamente)
INSERT INTO `detalle_carga` (`id_detalle`, `id_carga`, `id_producto`, `marca_visual`, `cantidad_sacos`, `peso_unitario`, `peso_total`, `precio_peso`, `flete_subtotal`, `estado_operativo`, `estado`, `fecha_registro`, `fecha_actualizacion`) VALUES
	(1, 1, 1, 'Marca Rojo', 2, 90.00, 180.00, 0.60, 108.00, 'Normal', 1, '2026-05-28 04:34:18', '2026-05-28 04:34:18'),
	(2, 2, 2, 'Marca Azul y Verde', 30, 30.00, 900.00, 0.60, 540.00, 'Normal', 1, '2026-05-28 04:34:18', '2026-05-28 04:34:18'),
	(3, 2, 3, 'Marca Azul y Verde', 15, 30.00, 450.00, 0.60, 270.00, 'Normal', 1, '2026-05-28 04:34:18', '2026-05-28 04:34:18'),
	(4, 3, 2, 'Marca Rojo', 30, 23.50, 705.00, 0.40, 282.00, 'Normal', 1, '2026-05-28 05:21:47', '2026-05-28 05:21:47'),
	(5, 3, 3, 'Marca Roja', 50, 25.70, 1285.00, 0.40, 514.00, 'Normal', 1, '2026-05-28 05:21:47', '2026-05-28 05:21:47'),
	(6, 3, 1, 'Rafia Roja', 1, 120.00, 120.00, 0.30, 36.00, 'Normal', 1, '2026-05-28 05:21:47', '2026-05-28 05:21:47'),
	(7, 4, 1, 'Rafia Verde', 5, 120.00, 600.00, 0.40, 240.00, 'Normal', 1, '2026-05-28 05:21:47', '2026-05-28 05:21:47'),
	(8, 5, 2, 'Marca Verde', 30, 32.70, 981.00, 0.40, 392.40, 'Normal', 1, '2026-05-29 02:40:04', '2026-05-29 02:40:04'),
	(9, 6, 2, 'Marca Morada', 50, 30.00, 1500.00, 0.40, 600.00, 'Normal', 1, '2026-05-29 02:40:04', '2026-05-29 02:40:04'),
	(10, 6, 3, 'Marca Morada', 50, 35.00, 1750.00, 0.40, 700.00, 'Normal', 1, '2026-05-29 02:40:04', '2026-05-29 02:40:04'),
	(11, 6, 1, 'Rafia Morada', 10, 110.00, 1100.00, 0.40, 440.00, 'Normal', 1, '2026-05-29 02:40:04', '2026-05-29 02:40:04'),
	(12, 7, 1, 'Rafia Negra', 8, 95.00, 760.00, 0.40, 304.00, 'Normal', 1, '2026-05-29 02:40:04', '2026-05-29 02:40:04'),
	(13, 8, 2, 'Marca Negra', 100, 35.00, 3500.00, 0.50, 1750.00, 'Normal', 1, '2026-05-29 02:40:04', '2026-05-29 02:40:04'),
	(14, 8, 3, 'Marca Negra', 100, 33.60, 3360.00, 0.50, 1680.00, 'Normal', 1, '2026-05-29 02:40:04', '2026-05-29 02:40:04'),
	(15, 9, 1, 'Marca Azul', 2, 90.00, 180.00, 0.50, 90.00, 'Normal', 2, '2026-05-29 17:47:44', '2026-06-06 17:48:03'),
	(16, 9, 2, 'Marca Azul', 10, 30.00, 300.00, 0.50, 150.00, 'Normal', 1, '2026-05-29 17:47:44', '2026-06-06 17:48:03'),
	(17, 10, 2, 'Marca verde', 2, 60.00, 120.00, 0.50, 60.00, 'Normal', 1, '2026-05-29 17:47:44', '2026-05-29 17:47:44'),
	(18, 11, 1, 'Rafia Morada', 10, 90.00, 900.00, 0.50, 450.00, 'Normal', 1, '2026-06-05 23:49:37', '2026-06-05 23:49:37'),
	(19, 11, 2, 'Marca Morada', 50, 30.00, 1500.00, 0.50, 750.00, 'Normal', 1, '2026-06-05 23:49:37', '2026-06-05 23:49:37'),
	(20, 11, 2, 'Marca Morada', 100, 25.00, 2500.00, 0.50, 1250.00, 'Normal', 1, '2026-06-05 23:49:37', '2026-06-05 23:49:37'),
	(21, 12, 1, 'Rafia Azul y Verde', 15, 110.00, 1650.00, 0.50, 825.00, 'Normal', 1, '2026-06-05 23:49:37', '2026-06-05 23:49:37'),
	(22, 13, 2, 'Marca Rojo y Azul', 50, 35.00, 1750.00, 0.50, 875.00, 'Normal', 1, '2026-06-05 23:49:37', '2026-06-05 23:49:37'),
	(23, 13, 3, 'Marca Rojo y Azul', 50, 50.00, 2500.00, 0.50, 1250.00, 'Normal', 1, '2026-06-05 23:49:37', '2026-06-05 23:49:37'),
	(24, 14, 1, 'Marca Azul', 2, 90.00, 180.00, 0.50, 90.00, 'Normal', 1, '2026-06-06 17:48:03', '2026-06-06 17:48:03'),
	(25, 14, 2, 'Marca Azul', 5, 30.00, 150.00, 0.50, 75.00, 'Normal', 1, '2026-06-06 17:48:03', '2026-06-06 17:48:03'),
	(26, 15, 1, 'Marca Verde', 7, 30.00, 210.00, 0.30, 63.00, 'Normal', 1, '2026-06-06 18:02:51', '2026-06-06 18:03:54'),
	(27, 16, 3, 'Marca Azul', 15, 30.00, 450.00, 0.30, 135.00, 'Normal', 2, '2026-06-06 18:02:51', '2026-06-06 18:03:16'),
	(28, 16, 2, 'Marca Azul con Negro', 15, 33.00, 495.00, 0.30, 148.50, 'Normal', 1, '2026-06-06 18:02:51', '2026-06-06 18:03:16'),
	(29, 17, 3, 'Marca Azul', 15, 30.00, 450.00, 0.30, 135.00, 'Normal', 1, '2026-06-06 18:03:16', '2026-06-06 18:03:16'),
	(30, 17, 2, 'Marca Azul con Negro', 5, 33.00, 165.00, 0.30, 49.50, 'Normal', 1, '2026-06-06 18:03:16', '2026-06-06 18:03:16'),
	(31, 18, 1, 'Marca Verde', 8, 30.00, 240.00, 0.30, 72.00, 'Normal', 1, '2026-06-06 18:03:54', '2026-06-06 18:03:54'),
	(32, 19, 3, 'Marca Verde', 50, 35.50, 1775.00, 0.30, 532.50, 'Normal', 1, '2026-06-06 18:05:09', '2026-06-06 18:05:23'),
	(33, 20, 3, 'Marca Verde', 100, 35.50, 3550.00, 0.30, 1065.00, 'Normal', 1, '2026-06-06 18:05:23', '2026-06-06 18:05:23'),
	(34, 21, 1, 'Marca Verde', 10, 90.00, 900.00, 0.50, 450.00, 'Normal', 2, '2026-06-06 23:57:21', '2026-06-07 01:51:58'),
	(35, 21, 2, 'Marca Verde', 100, 35.00, 3500.00, 0.50, 1750.00, 'Normal', 2, '2026-06-06 23:57:21', '2026-06-07 01:51:58'),
	(36, 21, 3, 'Marca Verde', 100, 20.00, 2000.00, 0.50, 1000.00, 'Normal', 1, '2026-06-06 23:57:21', '2026-06-07 01:51:58'),
	(37, 22, 1, 'Marca Roja con Amarillo', 10, 99.00, 990.00, 0.50, 495.00, 'Normal', 1, '2026-06-06 23:57:21', '2026-06-06 23:57:21'),
	(38, 23, 2, 'Marca Negra', 80, 45.00, 3600.00, 0.50, 1800.00, 'Normal', 2, '2026-06-06 23:57:21', '2026-06-07 00:51:27'),
	(39, 23, 3, 'Marca Negra', 50, 30.00, 1500.00, 0.50, 750.00, 'Normal', 1, '2026-06-06 23:57:21', '2026-06-07 00:51:27'),
	(40, 24, 2, 'Marca Negra', 80, 45.00, 3600.00, 0.50, 1800.00, 'Normal', 1, '2026-06-07 00:51:27', '2026-06-07 00:51:27'),
	(41, 24, 3, 'Marca Negra', 200, 30.00, 6000.00, 0.50, 3000.00, 'Normal', 1, '2026-06-07 00:51:27', '2026-06-07 00:51:27'),
	(42, 25, 1, 'Marca Negra', 20, 90.00, 1800.00, 0.40, 720.00, 'Normal', 1, '2026-06-07 00:54:25', '2026-06-07 00:54:25'),
	(43, 25, 3, 'Marca Negra', 0, 30.00, 0.00, 0.40, 0.00, 'Normal', 1, '2026-06-07 00:54:25', '2026-06-08 05:16:59'),
	(44, 26, 2, 'Marca Verde', 100, 35.00, 3500.00, 0.50, 1750.00, 'Normal', 1, '2026-06-07 01:51:58', '2026-06-07 01:51:58'),
	(45, 26, 3, 'Marca Verde', 100, 20.00, 2000.00, 0.50, 1000.00, 'Normal', 1, '2026-06-07 01:51:58', '2026-06-07 01:51:58'),
	(46, 26, 1, 'Marca Verde', 10, 90.00, 900.00, 0.50, 450.00, 'Normal', 1, '2026-06-07 01:51:58', '2026-06-07 01:51:58'),
	(47, 27, 2, 'Marca Verde', 15, 30.00, 450.00, 0.50, 225.00, 'Normal', 1, '2026-06-07 01:53:59', '2026-06-07 01:53:59'),
	(48, 27, 1, 'Rafia Verde', 10, 105.00, 1050.00, 0.50, 525.00, 'Normal', 2, '2026-06-07 01:53:59', '2026-06-07 01:54:58'),
	(49, 28, 3, 'Marca Roja', 150, 45.70, 6855.00, 0.50, 3427.50, 'Normal', 1, '2026-06-07 01:53:59', '2026-06-07 01:53:59'),
	(50, 28, 2, 'Marca Roja', 200, 50.00, 10000.00, 0.50, 5000.00, 'Normal', 1, '2026-06-07 01:53:59', '2026-06-07 01:53:59'),
	(51, 29, 1, 'Rafia Verde', 10, 105.00, 1050.00, 0.50, 525.00, 'Normal', 1, '2026-06-07 01:54:58', '2026-06-07 01:54:58'),
	(52, 30, 1, 'Marca Verde', 5, 90.00, 450.00, 0.60, 270.00, 'Normal', 1, '2026-06-07 02:07:16', '2026-06-07 05:23:06'),
	(53, 30, 2, 'Marca Rosa', 10, 50.00, 500.00, 0.60, 300.00, 'Normal', 1, '2026-06-07 02:07:16', '2026-06-07 05:23:06'),
	(54, 31, 2, 'Marca Negra', 100, 30.00, 3000.00, 0.60, 1800.00, 'Normal', 1, '2026-06-07 02:07:16', '2026-06-07 02:07:16'),
	(55, 31, 3, 'Marca Negra', 200, 45.00, 9000.00, 0.60, 5400.00, 'Normal', 1, '2026-06-07 02:07:16', '2026-06-07 02:07:16'),
	(56, 32, 1, 'Rafia Azul', 5, 107.60, 538.00, 0.60, 322.80, 'Normal', 1, '2026-06-07 02:07:16', '2026-06-07 02:07:16'),
	(57, 32, 2, 'Marca Azul', 50, 30.00, 1500.00, 0.60, 900.00, 'Normal', 1, '2026-06-07 02:07:16', '2026-06-07 02:07:16'),
	(58, 33, 1, 'Marca Verde', 10, 90.00, 900.00, 0.60, 540.00, 'Normal', 1, '2026-06-07 05:23:06', '2026-06-07 05:23:06'),
	(59, 33, 2, 'Marca Rosa', 10, 50.00, 500.00, 0.60, 300.00, 'Normal', 1, '2026-06-07 05:23:06', '2026-06-07 05:23:06'),
	(60, 34, 3, 'Marca Negra', 250, 30.00, 7500.00, 0.40, 3000.00, 'Normal', 1, '2026-06-08 05:16:59', '2026-06-10 07:06:10'),
	(61, 35, 2, 'Marca Verde', 100, 35.00, 3500.00, 0.60, 2100.00, 'Normal', 1, '2026-06-08 22:23:17', '2026-06-08 22:23:17'),
	(62, 35, 3, 'Marca Azul', 0, 33.60, 0.00, 0.60, 0.00, 'Normal', 1, '2026-06-08 22:23:17', '2026-06-08 22:31:31'),
	(63, 36, 1, 'Rafia Morada', 0, 98.60, 0.00, 0.60, 0.00, 'Normal', 1, '2026-06-08 22:23:17', '2026-06-08 22:31:31'),
	(64, 37, 3, 'Marca Azul', 1, 33.60, 33.60, 0.60, 20.16, 'Normal', 1, '2026-06-08 22:31:31', '2026-06-27 01:07:36'),
	(65, 38, 1, 'Rafia Morada', 10, 98.60, 986.00, 0.60, 591.60, 'Normal', 1, '2026-06-08 22:31:31', '2026-06-08 22:31:31'),
	(66, 39, 3, 'Marca Negra', 200, 30.00, 6000.00, 0.40, 2400.00, 'Normal', 1, '2026-06-10 07:06:10', '2026-06-10 07:06:10'),
	(67, 40, 1, 'Marca Azul', 0, 30.00, 0.00, 0.50, 0.00, 'Normal', 1, '2026-06-11 21:25:57', '2026-06-11 21:38:00'),
	(68, 41, 1, 'Marca Azul', 120, 30.00, 3600.00, 0.50, 1800.00, 'Transbordado', 1, '2026-06-11 21:38:00', '2026-06-30 01:17:12'),
	(69, 42, 1, 'Rafia Azul', 15, 90.00, 1350.00, 0.60, 810.00, 'Siniestrado', 1, '2026-06-12 17:32:50', '2026-06-29 20:43:08'),
	(70, 42, 2, 'Marca Azul', 150, 50.00, 7500.00, 0.60, 4500.00, 'Siniestrado', 1, '2026-06-12 17:32:50', '2026-06-29 20:43:08'),
	(71, 42, 3, 'Marca Verde', 200, 30.00, 6000.00, 0.60, 3600.00, 'Siniestrado', 1, '2026-06-12 17:32:50', '2026-06-29 20:43:08'),
	(72, 43, 1, 'Rafia Morada', 30, 99.00, 2970.00, 0.60, 1782.00, 'Transbordado', 1, '2026-06-12 17:32:50', '2026-06-29 20:43:08'),
	(73, 44, 1, 'Marca Verde', 15, 105.00, 1575.00, 0.40, 630.00, 'Transbordado', 1, '2026-06-12 17:32:50', '2026-06-29 20:43:08'),
	(74, 45, 1, 'Rafia Morada', 15, 90.00, 1350.00, 0.60, 810.00, 'Transbordado', 1, '2026-06-12 17:32:50', '2026-06-29 20:43:08'),
	(75, 46, 1, 'Marca Verde', 15, 90.00, 1350.00, 0.80, 1080.00, 'Transbordado', 1, '2026-06-12 17:50:12', '2026-06-29 18:50:40'),
	(76, 46, 2, 'Marca Verde', 20, 30.00, 600.00, 0.40, 240.00, 'Transbordado', 1, '2026-06-12 17:50:12', '2026-06-29 18:50:40'),
	(79, 48, 1, 'Marca Negra', 0, 80.00, 0.00, 0.60, 0.00, 'Normal', 1, '2026-06-23 15:27:45', '2026-06-26 07:48:49'),
	(80, 48, 2, 'Marca Negra', 0, 20.00, 0.00, 0.60, 0.00, 'Normal', 1, '2026-06-23 15:27:45', '2026-06-26 07:48:49'),
	(81, 49, 1, 'Marca Negra', 50, 80.00, 4000.00, 0.60, 2400.00, 'Normal', 1, '2026-06-26 07:48:49', '2026-06-26 07:48:49'),
	(82, 49, 2, 'Marca Negra', 80, 20.00, 1600.00, 0.60, 960.00, 'Normal', 1, '2026-06-26 07:48:49', '2026-06-26 07:48:49'),
	(83, 50, 3, 'Marca Azul', 149, 33.60, 5006.40, 0.60, 3003.84, 'Normal', 1, '2026-06-27 01:07:36', '2026-06-27 01:07:36'),
	(84, 51, 1, 'Marca Verde', 15, 90.00, 1350.00, 0.80, 1080.00, 'Normal', 1, '2026-06-29 18:50:40', '2026-06-29 18:50:40'),
	(85, 51, 2, 'Marca Verde', 15, 30.00, 450.00, 0.40, 180.00, 'Normal', 1, '2026-06-29 18:50:40', '2026-06-29 18:50:40'),
	(86, 52, 1, 'Rafia Morada', 28, 99.00, 2772.00, 0.60, 1663.20, 'Entregado', 1, '2026-06-29 20:43:08', '2026-06-30 05:55:16'),
	(87, 53, 1, 'Marca Verde', 15, 105.00, 1575.00, 0.40, 630.00, 'Entregado', 1, '2026-06-29 20:43:08', '2026-06-30 05:55:31'),
	(88, 54, 1, 'Rafia Morada', 10, 90.00, 900.00, 0.60, 540.00, 'Rechazado', 1, '2026-06-29 20:43:08', '2026-06-30 05:55:34'),
	(89, 55, 1, 'Marca Azul', 50, 45.00, 2250.00, 0.60, 1350.00, 'Siniestrado', 1, '2026-06-30 01:09:10', '2026-06-30 01:45:10'),
	(90, 55, 2, 'Marca Azul y Roja', 200, 30.00, 6000.00, 0.60, 3600.00, 'Transbordado', 1, '2026-06-30 01:09:10', '2026-06-30 01:45:10'),
	(91, 56, 1, 'Marca Negra', 5, 80.00, 400.00, 0.60, 240.00, 'Siniestrado', 1, '2026-06-30 01:09:10', '2026-06-30 01:45:10'),
	(92, 56, 3, 'Marca Negra', 70, 50.00, 3500.00, 0.60, 2100.00, 'Siniestrado', 1, '2026-06-30 01:09:10', '2026-06-30 01:45:10'),
	(93, 57, 1, 'Marca Azul', 30, 30.00, 900.00, 0.50, 450.00, 'Normal', 1, '2026-06-30 01:17:12', '2026-06-30 05:00:35'),
	(94, 58, 1, 'Marca Verde', 60, 90.00, 5400.00, 0.50, 2700.00, 'Siniestrado', 1, '2026-06-30 01:35:46', '2026-06-30 01:36:22'),
	(95, 59, 1, 'Marca Verde', 30, 90.00, 2700.00, 0.50, 1350.00, 'Entregado', 1, '2026-06-30 01:36:22', '2026-06-30 05:33:19'),
	(96, 58, 1, 'Marca Verde', 60, 90.00, 5400.00, 0.50, 2700.00, 'Transbordado', 1, '2026-06-30 01:36:22', '2026-06-30 01:36:22'),
	(97, 60, 1, 'Marca Azul', 100, 45.00, 4500.00, 0.60, 2700.00, 'Entregado', 1, '2026-06-30 01:45:10', '2026-06-30 05:54:30'),
	(98, 55, 1, 'Marca Azul', 100, 45.00, 4500.00, 0.60, 2700.00, 'Transbordado', 1, '2026-06-30 01:45:10', '2026-06-30 01:45:10'),
	(99, 60, 2, 'Marca Azul y Roja', 200, 30.00, 6000.00, 0.60, 3600.00, 'Entregado', 1, '2026-06-30 01:45:10', '2026-06-30 05:54:30'),
	(100, 61, 1, 'Marca Negra', 95, 80.00, 7600.00, 0.60, 4560.00, 'Rechazado', 1, '2026-06-30 01:45:10', '2026-06-30 05:54:39'),
	(101, 56, 1, 'Marca Negra', 95, 80.00, 7600.00, 0.60, 4560.00, 'Transbordado', 1, '2026-06-30 01:45:10', '2026-06-30 01:45:10'),
	(102, 61, 3, 'Marca Negra', 130, 50.00, 6500.00, 0.60, 3900.00, 'Rechazado', 1, '2026-06-30 01:45:10', '2026-06-30 05:54:39'),
	(103, 56, 3, 'Marca Negra', 130, 50.00, 6500.00, 0.60, 3900.00, 'Transbordado', 1, '2026-06-30 01:45:10', '2026-06-30 01:45:10'),
	(104, 62, 1, 'Marca Negra', 10, 50.00, 500.00, 0.50, 250.00, 'Transbordado', 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39'),
	(105, 63, 2, 'Marca Roja', 100, 30.00, 3000.00, 0.50, 1500.00, 'Siniestrado', 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39'),
	(106, 64, 2, 'Marca Morada', 20, 25.00, 500.00, 0.50, 250.00, 'Siniestrado', 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39'),
	(107, 64, 3, 'Marca Morada', 100, 30.00, 3000.00, 0.50, 1500.00, 'Transbordado', 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39'),
	(108, 65, 5, 'Marca Amarilla', 2, 10.00, 20.00, 0.80, 16.00, 'Siniestrado', 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39'),
	(109, 65, 4, 'Marca Amarilla', 10, 15.00, 150.00, 0.70, 105.00, 'Siniestrado', 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39'),
	(110, 66, 8, 'Marca Verde', 15, 150.00, 2250.00, 0.50, 1125.00, 'Siniestrado', 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39'),
	(111, 66, 7, 'Marca Negra', 100, 40.00, 4000.00, 0.50, 2000.00, 'Siniestrado', 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39'),
	(112, 67, 9, 'Color Rojo con Negro', 1, 300.00, 300.00, 1.00, 300.00, 'Transbordado', 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39'),
	(113, 67, 9, 'Color Verde con Blanco', 1, 330.00, 330.00, 1.00, 330.00, 'Transbordado', 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39'),
	(114, 68, 1, 'Marca Negra', 10, 50.00, 500.00, 0.50, 250.00, 'Normal', 1, '2026-06-30 04:16:39', '2026-06-30 04:16:39'),
	(115, 69, 2, 'Marca Roja', 100, 30.00, 3000.00, 0.50, 1500.00, 'Normal', 1, '2026-06-30 04:16:39', '2026-06-30 04:16:39'),
	(116, 63, 2, 'Marca Roja', 100, 30.00, 3000.00, 0.50, 1500.00, 'Transbordado', 1, '2026-06-30 04:16:39', '2026-06-30 04:16:39'),
	(117, 70, 2, 'Marca Morada', 280, 25.00, 7000.00, 0.50, 3500.00, 'Normal', 1, '2026-06-30 04:16:39', '2026-06-30 04:16:39'),
	(118, 64, 2, 'Marca Morada', 280, 25.00, 7000.00, 0.50, 3500.00, 'Transbordado', 1, '2026-06-30 04:16:39', '2026-06-30 04:16:39'),
	(119, 70, 3, 'Marca Morada', 100, 30.00, 3000.00, 0.50, 1500.00, 'Normal', 1, '2026-06-30 04:16:39', '2026-06-30 04:16:39'),
	(120, 71, 5, 'Marca Amarilla', 48, 10.00, 480.00, 0.80, 384.00, 'Normal', 1, '2026-06-30 04:16:39', '2026-06-30 04:16:39'),
	(121, 65, 5, 'Marca Amarilla', 48, 10.00, 480.00, 0.80, 384.00, 'Transbordado', 1, '2026-06-30 04:16:39', '2026-06-30 04:16:39'),
	(122, 71, 4, 'Marca Amarilla', 90, 15.00, 1350.00, 0.70, 945.00, 'Normal', 1, '2026-06-30 04:16:39', '2026-06-30 04:16:39'),
	(123, 65, 4, 'Marca Amarilla', 90, 15.00, 1350.00, 0.70, 945.00, 'Transbordado', 1, '2026-06-30 04:16:39', '2026-06-30 04:16:39'),
	(124, 72, 9, 'Color Rojo con Negro', 1, 300.00, 300.00, 1.00, 300.00, 'Normal', 1, '2026-06-30 04:16:39', '2026-06-30 04:16:39'),
	(125, 72, 9, 'Color Verde con Blanco', 1, 330.00, 330.00, 1.00, 330.00, 'Normal', 1, '2026-06-30 04:16:39', '2026-06-30 04:16:39'),
	(126, 73, 1, 'Marca Azul', 30, 30.00, 900.00, 0.50, 450.00, 'Normal', 1, '2026-06-30 05:00:35', '2026-06-30 05:00:35'),
	(127, 59, 1, 'Marca Verde', 30, 90.00, 2700.00, 0.50, 1350.00, 'Rechazado', 1, '2026-06-30 05:33:19', '2026-06-30 05:33:19'),
	(128, 52, 1, 'Rafia Morada', 2, 99.00, 198.00, 0.60, 118.80, 'Rechazado', 1, '2026-06-30 05:55:16', '2026-06-30 05:55:16'),
	(129, 74, 9, 'Color Negra', 1, 300.00, 300.00, 1.00, 300.00, 'Entregado', 1, '2026-06-30 14:00:02', '2026-06-30 14:00:27'),
	(130, 75, 7, 'Marca Verde', 85, 45.40, 3859.00, 0.80, 3087.20, 'Entregado', 1, '2026-06-30 14:00:02', '2026-06-30 14:00:47'),
	(131, 76, 4, 'Marca Amarilla', 96, 18.00, 1728.00, 0.80, 1382.40, 'Entregado', 1, '2026-06-30 14:00:02', '2026-06-30 14:01:07'),
	(132, 76, 5, 'Marca Amarilla', 98, 28.00, 2744.00, 0.80, 2195.20, 'Entregado', 1, '2026-06-30 14:00:02', '2026-06-30 14:01:07'),
	(133, 75, 7, 'Marca Verde', 15, 45.40, 681.00, 0.80, 544.80, 'Rechazado', 1, '2026-06-30 14:00:47', '2026-06-30 14:00:47'),
	(134, 76, 4, 'Marca Amarilla', 4, 18.00, 72.00, 0.80, 57.60, 'Rechazado', 1, '2026-06-30 14:01:07', '2026-06-30 14:01:07'),
	(135, 76, 5, 'Marca Amarilla', 2, 28.00, 56.00, 0.80, 44.80, 'Rechazado', 1, '2026-06-30 14:01:07', '2026-06-30 14:01:07'),
	(136, 77, 6, 'Embalados', 1, 15000.00, 15000.00, 0.90, 13500.00, 'Normal', 1, '2026-06-30 14:57:58', '2026-06-30 14:57:58');

-- Volcando estructura para tabla joselitobd.detalle_liquidacion_penalidad
CREATE TABLE IF NOT EXISTS `detalle_liquidacion_penalidad` (
  `id_detalle_liq` int NOT NULL AUTO_INCREMENT,
  `id_liquidacion` int NOT NULL,
  `id_incidencia` int NOT NULL COMMENT 'La deuda de incidencia que se está cobrando',
  `monto_descontado` decimal(10,2) NOT NULL COMMENT 'Cuánto se le descontó de su deuda en esta liquidación',
  PRIMARY KEY (`id_detalle_liq`),
  KEY `fk_detalle_liq` (`id_liquidacion`),
  KEY `fk_detalle_incidencia` (`id_incidencia`),
  CONSTRAINT `fk_detalle_incidencia` FOREIGN KEY (`id_incidencia`) REFERENCES `incidencia_viaje` (`id_incidencia`) ON DELETE RESTRICT,
  CONSTRAINT `fk_detalle_liq` FOREIGN KEY (`id_liquidacion`) REFERENCES `liquidacion_viaje` (`id_liquidacion`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.detalle_liquidacion_penalidad: ~3 rows (aproximadamente)
INSERT INTO `detalle_liquidacion_penalidad` (`id_detalle_liq`, `id_liquidacion`, `id_incidencia`, `monto_descontado`) VALUES
	(2, 2, 5, 300.00),
	(3, 4, 1, 271.00),
	(4, 5, 1, 225.00);

-- Volcando estructura para tabla joselitobd.incidencia_viaje
CREATE TABLE IF NOT EXISTS `incidencia_viaje` (
  `id_incidencia` int NOT NULL AUTO_INCREMENT,
  `id_viaje` int NOT NULL,
  `tipo_incidencia` enum('Falla Mecánica','Retraso en Ruta','Daño/Mala Estiba','Faltante / Pérdida','Accidente','Otro') COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Categoría estadística de la causa raíz',
  `descripcion_detallada` text COLLATE utf8mb4_general_ci NOT NULL,
  `valor_total_perdida` decimal(10,2) DEFAULT '0.00' COMMENT 'Calculado por el sistema: Fletes perdidos',
  `gastos_adicionales` decimal(10,2) DEFAULT '0.00' COMMENT 'Gastos extra por siniestro (grúa, cochera, transbordo)',
  `adelanto_recuperar` decimal(10,2) DEFAULT '0.00' COMMENT 'Adelanto a recuperar en caso de anulación',
  `monto_asumido_empresa` decimal(10,2) DEFAULT NULL COMMENT 'NULL hasta que administración decida',
  `monto_descuento_chofer` decimal(10,2) DEFAULT NULL COMMENT 'NULL hasta que administración decida',
  `monto_cobrado` decimal(10,2) DEFAULT '0.00' COMMENT 'Acumulador de cobros parciales realizados al chofer',
  `estado_cobro_penalidad` enum('Pendiente','Cobrado Parcial','Cobrado','Anulado') COLLATE utf8mb4_general_ci DEFAULT 'Pendiente' COMMENT 'Control del pago de la deuda del transportista',
  `id_usuario` int NOT NULL COMMENT 'Administrador que registró o resolvió la incidencia',
  `estado` tinyint(1) DEFAULT '1' COMMENT '1: Activo, 0: Eliminado lógico por error de registro',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_incidencia`),
  KEY `fk_incidencia_viaje` (`id_viaje`),
  KEY `fk_incidencia_usuario` (`id_usuario`),
  CONSTRAINT `fk_incidencia_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_incidencia_viaje` FOREIGN KEY (`id_viaje`) REFERENCES `viaje` (`id_viaje`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.incidencia_viaje: ~8 rows (aproximadamente)
INSERT INTO `incidencia_viaje` (`id_incidencia`, `id_viaje`, `tipo_incidencia`, `descripcion_detallada`, `valor_total_perdida`, `gastos_adicionales`, `adelanto_recuperar`, `monto_asumido_empresa`, `monto_descuento_chofer`, `monto_cobrado`, `estado_cobro_penalidad`, `id_usuario`, `estado`, `fecha_creacion`, `fecha_actualizacion`) VALUES
	(1, 13, 'Falla Mecánica', 'Rotura de motor a la altura de Huarmey. El camión quedó inoperativo. Se contrató un camión externo de emergencia para hacer el transbordo de la mercadería y cumplir con el cliente. Las cargas de este viaje original se anulan, y se genera el gasto extra del remolque/transbordo.', 2100.00, 500.00, 0.00, 500.00, 2100.00, 496.00, 'Cobrado Parcial', 2, 1, '2026-06-10 04:06:21', '2026-06-24 06:54:25'),
	(2, 13, 'Otro', 'Pago de cochera temporal en la ciudad de Huarmey por resguardo del camión accidentado mientras se realizaba el transbordo.', 0.00, 150.00, 0.00, 150.00, 0.00, 0.00, 'Pendiente', 2, 1, '2026-06-10 04:22:10', '2026-06-10 04:22:10'),
	(3, 8, 'Daño/Mala Estiba', 'El chofer frenó bruscamente cerca a Trujillo, provocando la caída y daño total de los productos de la Carga 1 y Carga 2. El chofer asume la responsabilidad de esta mercadería.', 1495.00, 0.00, 0.00, 0.00, 1495.00, 0.00, 'Pendiente', 2, 1, '2026-06-10 04:31:24', '2026-06-10 04:31:24'),
	(4, 8, 'Daño/Mala Estiba', 'La Carga 3 llegó aplastada. Tras revisar las cámaras de Lima, se determinó que los estibadores de la empresa colocaron pallets muy pesados sobre mercadería frágil. Error de almacén.', 750.00, 0.00, 0.00, 750.00, 0.00, 0.00, 'Pendiente', 2, 1, '2026-06-10 04:32:05', '2026-06-10 04:32:05'),
	(5, 15, 'Falla Mecánica', 'Llantas malogradas', 0.00, 300.00, 0.00, 0.00, 300.00, 300.00, 'Cobrado', 2, 1, '2026-06-24 05:40:49', '2026-06-24 05:57:29'),
	(6, 13, 'Falla Mecánica', 'prueba as', 0.00, 13.00, 0.00, 13.00, 0.00, 0.00, 'Pendiente', 2, 1, '2026-06-26 06:30:17', '2026-06-26 06:30:17'),
	(7, 9, 'Falla Mecánica', 'El camión tuvo un accidente en Casma, el chofer se durmió en la ruta causando la volcadura de la unidad', 720.00, 200.00, 300.00, 120.00, 1100.00, 0.00, 'Pendiente', 2, 1, '2026-06-26 15:31:20', '2026-06-26 15:31:20'),
	(8, 20, 'Falla Mecánica', 'El camión tuvo un problema con el motor que lo dejo varado en Huarmey, las gastos adicionales es por el precio de transbordar los productos y se esta recuperando parte del adelanto dado al transportista.', 0.00, 100.00, 500.00, 300.00, 300.00, 0.00, 'Pendiente', 2, 1, '2026-06-26 15:37:57', '2026-06-26 15:37:57');

-- Volcando estructura para tabla joselitobd.liquidacion_viaje
CREATE TABLE IF NOT EXISTS `liquidacion_viaje` (
  `id_liquidacion` int NOT NULL AUTO_INCREMENT,
  `id_viaje` int NOT NULL COMMENT 'Un viaje solo se liquida una vez',
  `id_usuario` int NOT NULL COMMENT 'Usuario administrador que procesó el pago',
  `monto_bruto` decimal(10,2) NOT NULL,
  `total_adelantos` decimal(10,2) DEFAULT '0.00' COMMENT 'Suma de adelantos descontados',
  `total_penalidades` decimal(10,2) DEFAULT '0.00' COMMENT 'Suma de penalidades descontadas en este pago',
  `monto_neto_pagado` decimal(10,2) NOT NULL COMMENT 'Lo que el chofer recibe en mano/banco',
  `metodo_pago` varchar(50) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Efectivo, Transferencia, Yape, etc.',
  `numero_operacion` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `evidencia_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_general_ci,
  `estado` tinyint(1) DEFAULT '1' COMMENT '1: Activa, 0: Anulada',
  `fecha_liquidacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_liquidacion`),
  UNIQUE KEY `id_viaje` (`id_viaje`),
  KEY `fk_liquidacion_usuario` (`id_usuario`),
  CONSTRAINT `fk_liquidacion_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_liquidacion_viaje` FOREIGN KEY (`id_viaje`) REFERENCES `viaje` (`id_viaje`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.liquidacion_viaje: ~4 rows (aproximadamente)
INSERT INTO `liquidacion_viaje` (`id_liquidacion`, `id_viaje`, `id_usuario`, `monto_bruto`, `total_adelantos`, `total_penalidades`, `monto_neto_pagado`, `metodo_pago`, `numero_operacion`, `evidencia_url`, `observaciones`, `estado`, `fecha_liquidacion`) VALUES
	(2, 1, 2, 306.00, 0.00, 300.00, 6.00, 'Efectivo', NULL, NULL, 'Se le realizo el descuento de 300 soles por la penalidad del viaje numero 15', 1, '2026-06-24 05:57:29'),
	(3, 12, 2, 4050.00, 0.00, 0.00, 4050.00, 'Billetera Digital', NULL, NULL, 'Se yapeo los 4050 soles', 1, '2026-06-24 06:16:18'),
	(4, 2, 2, 271.00, 0.00, 271.00, 0.00, 'Efectivo', NULL, NULL, '', 1, '2026-06-24 06:53:36'),
	(5, 4, 2, 225.00, 0.00, 225.00, 0.00, 'Efectivo', NULL, NULL, '', 1, '2026-06-24 06:54:25'),
	(6, 3, 2, 2590.20, 0.00, 0.00, 2590.20, 'Billetera Digital', '15263589', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1782446526/sistema_joselito/comprobantes/voucher_1782446525867.jpg', 'Se realizo un yapeo del monto total', 1, '2026-06-26 04:02:07');

-- Volcando estructura para tabla joselitobd.opciones
CREATE TABLE IF NOT EXISTS `opciones` (
  `id_opcion` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `ruta` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Identificador de la vista SPA para AJAX',
  `icono` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `estado` tinyint NOT NULL DEFAULT '1' COMMENT '0=inactivo, 1=activo, 2=eliminado',
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_opcion`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.opciones: ~13 rows (aproximadamente)
INSERT INTO `opciones` (`id_opcion`, `nombre`, `ruta`, `icono`, `estado`, `fecha_creacion`, `fecha_actualizacion`) VALUES
	(1, 'Dashboard', 'dashboard', 'fas fa-home', 1, '2026-05-08 05:04:23', '2026-05-08 05:04:23'),
	(2, 'Gestión de Usuarios', 'usuarios', 'fas fa-users', 1, '2026-05-08 05:04:23', '2026-05-08 05:04:23'),
	(3, 'Gestión de Perfiles', 'perfiles', 'fas fa-id-card', 1, '2026-05-08 05:04:23', '2026-05-08 05:04:23'),
	(4, 'Gestión de Opciones', 'opciones', 'fas fa-cogs', 1, '2026-05-08 06:39:25', '2026-05-08 06:39:25'),
	(5, 'Gestión de Clientes', 'clientes', 'fas fa-users', 1, '2026-05-12 13:40:07', '2026-05-12 13:40:07'),
	(6, 'Gestión de Productos', 'productos', 'fas fa-box', 1, '2026-05-12 13:40:07', '2026-05-12 13:40:07'),
	(7, 'Gestión de Rutas', 'rutas', 'fas fa-route', 1, '2026-05-20 06:03:24', '2026-05-20 06:03:24'),
	(8, 'Gestión de Camiones', 'camiones', 'fas fa-truck', 1, '2026-05-20 06:12:11', '2026-05-20 06:12:11'),
	(9, 'Registro de Viajes', 'registro_viajes', 'fas fa-truck-loading', 1, '2026-05-25 15:56:14', '2026-05-25 15:56:14'),
	(10, 'Historial de Viajes', 'historial_viajes', 'fas fa-history', 1, '2026-05-29 02:11:22', '2026-05-29 02:11:22'),
	(11, 'Recepción y Entregas', 'recepcion_entregas', 'fas fa-dolly', 1, '2026-06-05 17:47:04', '2026-06-05 17:47:04'),
	(12, 'Deudas por Cobrar', 'deudas_cobrar', 'fas fa-hand-holding-usd', 1, '2026-06-11 01:04:19', '2026-06-11 01:04:19'),
	(13, 'Liquidación Choferes', 'liquidacion', 'fa-solid fa-money-bill', 1, '2026-06-12 17:06:40', '2026-06-12 17:06:40');

-- Volcando estructura para tabla joselitobd.pago_carga
CREATE TABLE IF NOT EXISTS `pago_carga` (
  `id_pago` int NOT NULL AUTO_INCREMENT,
  `id_carga` int NOT NULL,
  `id_cuenta` int DEFAULT NULL,
  `monto_pagado` decimal(10,2) NOT NULL,
  `tipo_pago` enum('Efectivo','Transferencia','Deposito','Billetera Digital') COLLATE utf8mb4_general_ci NOT NULL,
  `nro_operacion` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ruta_comprobante` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `observacion` text COLLATE utf8mb4_general_ci,
  `estado` tinyint DEFAULT '1',
  `id_usuario` int NOT NULL,
  `fecha_pago` datetime NOT NULL,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_pago`),
  KEY `id_carga` (`id_carga`),
  KEY `id_cuenta` (`id_cuenta`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `pago_carga_ibfk_1` FOREIGN KEY (`id_carga`) REFERENCES `carga` (`id_carga`),
  CONSTRAINT `pago_carga_ibfk_2` FOREIGN KEY (`id_cuenta`) REFERENCES `cuenta_bancaria` (`id_cuenta`),
  CONSTRAINT `pago_carga_ibfk_3` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.pago_carga: ~8 rows (aproximadamente)
INSERT INTO `pago_carga` (`id_pago`, `id_carga`, `id_cuenta`, `monto_pagado`, `tipo_pago`, `nro_operacion`, `ruta_comprobante`, `observacion`, `estado`, `id_usuario`, `fecha_pago`, `fecha_actualizacion`) VALUES
	(1, 39, 3, 2400.00, 'Transferencia', 'OP-998877', NULL, NULL, 1, 1, '2026-06-11 10:30:00', '2026-06-12 00:26:42'),
	(2, 33, NULL, 300.00, 'Efectivo', NULL, NULL, NULL, 0, 1, '2026-06-11 09:15:00', '2026-06-12 09:47:24'),
	(3, 32, 1, 12.00, 'Billetera Digital', '1756799', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1781249804/sistema_joselito/comprobantes/voucher_1781249802792.jpg', 'Pago de 12 soles como prueba', 1, 1, '2026-06-12 02:35:00', '2026-06-12 07:36:44'),
	(4, 32, 2, 50.00, 'Billetera Digital', '26561558', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1781250091/sistema_joselito/comprobantes/voucher_1781250090161.jpg', 'Pago de 50 soles de prueba', 1, 1, '2026-06-12 02:40:00', '2026-06-12 07:41:31'),
	(5, 29, NULL, 525.00, 'Efectivo', NULL, NULL, NULL, 1, 1, '2026-06-12 02:42:00', '2026-06-12 07:42:39'),
	(6, 33, 3, 500.00, 'Deposito', 'OP-965214', NULL, 'Prueba sin voucher', 1, 1, '2026-06-12 05:49:00', '2026-06-12 10:49:48'),
	(7, 37, 2, 1500.00, 'Billetera Digital', '57896585', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1781282986/sistema_joselito/comprobantes/voucher_1781282984557.jpg', 'Pagamos', 1, 1, '2026-06-12 11:49:00', '2026-06-12 16:49:46'),
	(8, 37, 3, 500.00, 'Transferencia', '655955', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1781284937/sistema_joselito/comprobantes/voucher_1781284936404.jpg', 'ksdkfksdkfsd', 0, 1, '2026-06-12 12:21:00', '2026-06-12 17:23:19'),
	(9, 33, NULL, 120.00, 'Efectivo', NULL, NULL, NULL, 1, 1, '2026-06-22 23:04:00', '2026-06-23 04:04:48'),
	(10, 33, 3, 100.00, 'Transferencia', '1536258963', NULL, NULL, 1, 1, '2026-06-22 23:04:00', '2026-06-23 04:05:07'),
	(11, 33, NULL, 120.00, 'Efectivo', NULL, NULL, NULL, 1, 1, '2026-06-24 01:32:00', '2026-06-24 06:32:09'),
	(12, 1, NULL, 108.00, 'Efectivo', NULL, NULL, NULL, 1, 1, '2026-06-24 01:33:00', '2026-06-24 06:33:46'),
	(13, 50, NULL, 1500.00, 'Efectivo', NULL, NULL, NULL, 1, 1, '2026-06-27 13:17:00', '2026-06-27 18:17:45');

-- Volcando estructura para tabla joselitobd.perfil_opcion
CREATE TABLE IF NOT EXISTS `perfil_opcion` (
  `id_perfil` int NOT NULL,
  `id_opcion` int NOT NULL,
  PRIMARY KEY (`id_perfil`,`id_opcion`),
  KEY `id_opcion` (`id_opcion`),
  CONSTRAINT `perfil_opcion_ibfk_1` FOREIGN KEY (`id_perfil`) REFERENCES `perfiles` (`id_perfil`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `perfil_opcion_ibfk_2` FOREIGN KEY (`id_opcion`) REFERENCES `opciones` (`id_opcion`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.perfil_opcion: ~27 rows (aproximadamente)
INSERT INTO `perfil_opcion` (`id_perfil`, `id_opcion`) VALUES
	(1, 1),
	(1, 2),
	(1, 3),
	(1, 4),
	(1, 5),
	(1, 6),
	(1, 7),
	(1, 8),
	(1, 9),
	(1, 10),
	(1, 11),
	(1, 12),
	(2, 1),
	(2, 2),
	(2, 3),
	(2, 5),
	(2, 6),
	(2, 7),
	(2, 8),
	(2, 9),
	(2, 10),
	(2, 11),
	(2, 12),
	(2, 13),
	(3, 1),
	(4, 1),
	(5, 1);

-- Volcando estructura para tabla joselitobd.perfiles
CREATE TABLE IF NOT EXISTS `perfiles` (
  `id_perfil` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `estado` tinyint NOT NULL DEFAULT '1' COMMENT '0=inactivo, 1=activo, 2=eliminado',
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_perfil`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.perfiles: ~5 rows (aproximadamente)
INSERT INTO `perfiles` (`id_perfil`, `nombre`, `descripcion`, `estado`, `fecha_creacion`, `fecha_actualizacion`) VALUES
	(1, 'Desarrollador', 'Perfil Oculto de Arquitectura', 1, '2026-05-08 06:46:26', '2026-05-08 14:42:28'),
	(2, 'Administrador', 'Perfil con acceso total a todas las opciones del sistema', 1, '2026-05-08 05:04:23', '2026-05-08 14:42:56'),
	(3, 'Administrador Sede', 'Administrador de la Sede de Chiclayo', 1, '2026-05-08 06:24:39', '2026-05-08 14:42:56'),
	(4, 'Dashboard', 'Solo acceso al dashboard', 1, '2026-05-08 14:39:10', '2026-05-08 15:27:54'),
	(5, 'Contabilidad', 'Acceso a los módulos de cobro y liquidaciones', 1, '2026-05-08 16:16:48', '2026-05-08 16:16:58');

-- Volcando estructura para tabla joselitobd.productos
CREATE TABLE IF NOT EXISTS `productos` (
  `id_producto` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `estado` tinyint NOT NULL DEFAULT '1' COMMENT '0: Inactivo, 1: Activo, 2: Eliminado',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_producto`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.productos: ~3 rows (aproximadamente)
INSERT INTO `productos` (`id_producto`, `nombre`, `descripcion`, `estado`, `fecha_creacion`, `fecha_actualizacion`) VALUES
	(1, 'Saco de kion', NULL, 1, '2026-05-12 14:56:59', '2026-05-12 15:12:39'),
	(2, 'Ajo Cajamarquino', 'Ajo para pelar y desgranar', 1, '2026-05-12 15:11:39', '2026-05-12 17:17:52'),
	(3, 'Ajo Chino', NULL, 1, '2026-05-12 15:33:51', '2026-05-12 15:33:51'),
	(4, 'Caja de Manzana', 'Caja de cartón', 1, '2026-06-30 04:01:12', '2026-06-30 04:01:12'),
	(5, 'Caja de Piña Golden', 'Cajas o javas de madera', 1, '2026-06-30 04:02:26', '2026-06-30 04:02:26'),
	(6, 'Servicio de Mudanza', 'Transporte ya sea en conjunto o unitario de muebles, cocinas, etc...', 1, '2026-06-30 04:03:15', '2026-06-30 04:03:15'),
	(7, 'Sacos de Papa Blanca', NULL, 1, '2026-06-30 04:05:55', '2026-06-30 04:05:55'),
	(8, 'Malla de Alverja', NULL, 1, '2026-06-30 04:09:03', '2026-06-30 04:09:03'),
	(9, 'Transporte de Motos', 'Servicio de transporte de motos lineales o mototaxi', 1, '2026-06-30 04:11:42', '2026-06-30 04:11:42');

-- Volcando estructura para tabla joselitobd.rutas
CREATE TABLE IF NOT EXISTS `rutas` (
  `id_ruta` int NOT NULL AUTO_INCREMENT,
  `ciudad_origen` varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Ciudad de origen de la ruta',
  `ciudad_destino` varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Ciudad de destino de la ruta',
  `descripcion` text COLLATE utf8mb4_general_ci COMMENT 'Detalles adicionales o puntos intermedios',
  `estado` tinyint(1) NOT NULL DEFAULT '1' COMMENT '0=inactivo, 1=activo, 2=eliminado',
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_ruta`),
  UNIQUE KEY `uq_origen_destino` (`ciudad_origen`,`ciudad_destino`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Registro de rutas lógicas cubiertas por la empresa';

-- Volcando datos para la tabla joselitobd.rutas: ~0 rows (aproximadamente)
INSERT INTO `rutas` (`id_ruta`, `ciudad_origen`, `ciudad_destino`, `descripcion`, `estado`, `fecha_creacion`, `fecha_actualizacion`) VALUES
	(1, 'LIMA', 'CHICLAYO', 'Paradas en Chepén', 1, '2026-05-20 06:13:44', '2026-05-20 06:13:44'),
	(2, 'CHICLAYO', 'LIMA', NULL, 1, '2026-05-27 22:18:29', '2026-05-27 22:18:29');

-- Volcando estructura para tabla joselitobd.usuarios
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `id_perfil` int NOT NULL,
  `nombre` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `usuario` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `clave` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Hash bcrypt',
  `estado` tinyint NOT NULL DEFAULT '1' COMMENT '0=inactivo, 1=activo, 2=eliminado',
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `usuario` (`usuario`),
  KEY `id_perfil` (`id_perfil`),
  CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`id_perfil`) REFERENCES `perfiles` (`id_perfil`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.usuarios: ~4 rows (aproximadamente)
INSERT INTO `usuarios` (`id_usuario`, `id_perfil`, `nombre`, `usuario`, `clave`, `estado`, `fecha_creacion`, `fecha_actualizacion`) VALUES
	(1, 1, 'Desarrollador', 'developer', '$2b$10$PIFX4ryhDbYs4bfi3jfOV.KqqhQollcGprSxZuOIDEPZupaHqcGb6', 1, '2026-05-08 06:46:26', '2026-05-08 15:26:35'),
	(2, 2, 'Administrador', 'admin', '$2b$10$3Fc2uSgrvHJylWpRoMbOdeS9Oa7y4RxmeymeiDwEkcYzfCEwmPNqW', 1, '2026-05-08 05:04:23', '2026-05-08 14:52:54'),
	(3, 3, 'Luis Castillo', 'Luis', '$2b$10$TLKzDd5VRGuYOw4TTItvmupn3Vks33SCrGSwLmfxRx5ZZe6HPyNoS', 1, '2026-05-08 06:25:33', '2026-05-08 14:43:07'),
	(4, 4, 'admin2', 'admin2', '$2b$10$Ow3achrtouLsK4kXI7CyW.R6aLVy3dNHDr8A5cCqUTXh1kDwOgcRm', 1, '2026-05-08 14:54:45', '2026-05-08 15:27:24');

-- Volcando estructura para tabla joselitobd.viaje
CREATE TABLE IF NOT EXISTS `viaje` (
  `id_viaje` int NOT NULL AUTO_INCREMENT,
  `id_camion` int NOT NULL,
  `id_ruta` int NOT NULL,
  `tarifa_transportista` decimal(10,2) NOT NULL COMMENT 'Tarifa acordada para pagar al transportista por kg',
  `fecha_salida` datetime DEFAULT NULL,
  `fecha_llegada` datetime DEFAULT NULL,
  `estado_pagos` enum('Pendiente','Liquidado','Anulado') COLLATE utf8mb4_general_ci DEFAULT 'Pendiente' COMMENT 'Controla si el chofer ya cobró su viaje',
  `estado_operativo` enum('En Ruta','Llegó a Destino','Finalizado','Incidencia') COLLATE utf8mb4_general_ci DEFAULT 'En Ruta' COMMENT 'Estado físico del viaje',
  `id_usuario` int NOT NULL,
  `estado` tinyint(1) DEFAULT '1',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `id_viaje_origen` int DEFAULT NULL COMMENT 'ID del viaje accidentado si este es un camión de rescate',
  PRIMARY KEY (`id_viaje`),
  KEY `fk_viaje_camion` (`id_camion`),
  KEY `fk_viaje_usuario` (`id_usuario`),
  KEY `fk_viaje_ruta` (`id_ruta`),
  KEY `fk_viaje_origen` (`id_viaje_origen`),
  CONSTRAINT `fk_viaje_camion` FOREIGN KEY (`id_camion`) REFERENCES `camiones` (`id_camion`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_viaje_origen` FOREIGN KEY (`id_viaje_origen`) REFERENCES `viaje` (`id_viaje`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_viaje_ruta` FOREIGN KEY (`id_ruta`) REFERENCES `rutas` (`id_ruta`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_viaje_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.viaje: ~20 rows (aproximadamente)
INSERT INTO `viaje` (`id_viaje`, `id_camion`, `id_ruta`, `tarifa_transportista`, `fecha_salida`, `fecha_llegada`, `estado_pagos`, `estado_operativo`, `id_usuario`, `estado`, `fecha_creacion`, `fecha_actualizacion`, `id_viaje_origen`) VALUES
	(1, 1, 1, 0.20, '2026-05-05 00:00:00', '2026-05-06 14:44:04', 'Liquidado', 'Finalizado', 2, 1, '2026-05-28 04:34:18', '2026-06-24 05:57:29', NULL),
	(2, 2, 1, 0.10, '2026-05-28 00:00:00', '2026-05-29 11:05:36', 'Liquidado', 'Finalizado', 2, 1, '2026-05-28 05:21:47', '2026-06-24 06:53:36', NULL),
	(3, 3, 1, 0.20, '2026-05-28 21:37:00', '2026-06-06 12:57:40', 'Liquidado', 'Finalizado', 2, 1, '2026-05-29 02:40:04', '2026-06-26 04:02:07', NULL),
	(4, 2, 1, 0.30, '2026-05-29 12:40:00', '2026-06-05 21:12:01', 'Liquidado', 'Finalizado', 2, 1, '2026-05-29 17:47:44', '2026-06-24 06:54:25', NULL),
	(5, 3, 1, 0.20, '2026-06-04 18:47:00', '2026-06-05 18:49:48', 'Pendiente', 'Finalizado', 2, 1, '2026-06-05 23:49:37', '2026-06-23 16:03:52', NULL),
	(6, 3, 1, 0.10, '2026-06-06 13:02:00', '2026-06-06 13:03:00', 'Pendiente', 'Finalizado', 2, 1, '2026-06-06 18:02:51', '2026-06-23 16:03:54', NULL),
	(7, 2, 1, 0.10, '2026-06-06 13:05:00', '2026-06-06 13:05:15', 'Pendiente', 'Finalizado', 2, 1, '2026-06-06 18:05:09', '2026-06-23 16:03:56', NULL),
	(8, 2, 1, 0.20, '2026-06-06 18:54:00', '2026-06-06 18:58:13', 'Pendiente', 'Finalizado', 2, 1, '2026-06-06 23:57:21', '2026-06-23 16:04:02', NULL),
	(9, 3, 1, 0.25, '2026-06-06 19:53:00', NULL, 'Anulado', 'Incidencia', 2, 1, '2026-06-07 00:54:25', '2026-06-26 07:59:12', NULL),
	(10, 1, 1, 0.10, '2026-06-06 20:52:00', '2026-06-06 20:54:37', 'Pendiente', 'Finalizado', 2, 1, '2026-06-07 01:53:59', '2026-06-23 16:04:05', NULL),
	(11, 3, 1, 0.30, '2026-06-06 21:05:00', '2026-06-07 00:22:41', 'Pendiente', 'Finalizado', 2, 1, '2026-06-07 02:07:16', '2026-06-23 16:04:07', NULL),
	(12, 1, 1, 0.30, '2026-06-08 00:16:00', '2026-06-08 18:34:24', 'Liquidado', 'Finalizado', 1, 1, '2026-06-08 05:16:59', '2026-06-24 06:16:18', 9),
	(13, 2, 1, 0.30, '2026-06-08 17:22:00', NULL, 'Anulado', 'Incidencia', 2, 1, '2026-06-08 22:23:17', '2026-06-26 07:59:08', NULL),
	(14, 1, 1, 0.30, '2026-06-08 17:28:00', '2026-06-11 13:09:44', 'Pendiente', 'Finalizado', 1, 1, '2026-06-08 22:31:31', '2026-06-27 01:07:36', 13),
	(15, 1, 1, 0.20, '2026-06-11 16:25:00', NULL, 'Anulado', 'Incidencia', 2, 1, '2026-06-11 21:25:57', '2026-06-26 07:59:03', NULL),
	(16, 2, 1, 0.30, '2026-06-11 16:37:00', NULL, 'Anulado', 'Incidencia', 1, 1, '2026-06-11 21:38:00', '2026-06-30 01:17:12', 15),
	(17, 1, 1, 0.20, '2026-06-12 12:18:00', NULL, 'Anulado', 'Incidencia', 1, 1, '2026-06-12 17:32:50', '2026-06-29 20:43:08', NULL),
	(18, 1, 1, 0.30, '2026-06-12 12:46:00', NULL, 'Anulado', 'Incidencia', 1, 1, '2026-06-12 17:50:12', '2026-06-29 18:50:40', NULL),
	(20, 1, 1, 0.30, '2026-06-23 10:20:00', NULL, 'Anulado', 'Incidencia', 2, 1, '2026-06-23 15:27:45', '2026-06-26 07:48:49', NULL),
	(21, 2, 1, 0.30, '2026-06-26 02:48:00', '2026-06-26 13:09:11', 'Pendiente', 'Finalizado', 1, 1, '2026-06-26 07:48:49', '2026-06-26 18:09:35', 20),
	(22, 2, 1, 0.30, '2026-06-29 13:50:00', '2026-06-29 22:43:58', 'Pendiente', 'Finalizado', 1, 1, '2026-06-29 18:50:40', '2026-06-30 03:44:03', 18),
	(23, 2, 1, 0.25, '2026-06-29 15:41:00', '2026-06-29 20:09:15', 'Pendiente', 'Finalizado', 1, 1, '2026-06-29 20:43:08', '2026-06-30 05:55:34', 17),
	(24, 1, 1, 0.30, '2026-06-27 13:09:00', NULL, 'Anulado', 'Incidencia', 2, 1, '2026-06-30 01:09:10', '2026-06-30 01:45:10', NULL),
	(25, 1, 1, 0.30, '2026-06-29 20:09:00', '2026-06-29 22:43:51', 'Pendiente', 'Finalizado', 1, 1, '2026-06-30 01:17:12', '2026-06-30 05:00:35', 16),
	(26, 2, 2, 0.20, '2026-06-29 20:35:00', NULL, 'Anulado', 'Incidencia', 2, 1, '2026-06-30 01:35:46', '2026-06-30 01:36:22', NULL),
	(27, 1, 2, 0.25, '2026-06-29 20:35:00', '2026-06-29 22:43:48', 'Pendiente', 'Finalizado', 1, 1, '2026-06-30 01:36:22', '2026-06-30 05:33:19', 26),
	(28, 2, 1, 0.35, '2026-06-29 20:44:00', '2026-06-29 22:42:41', 'Pendiente', 'Finalizado', 1, 1, '2026-06-30 01:45:10', '2026-06-30 05:54:39', 24),
	(29, 1, 2, 0.20, '2026-06-29 23:14:00', NULL, 'Anulado', 'Incidencia', 2, 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39', NULL),
	(30, 3, 2, 0.25, '2026-06-29 23:14:00', NULL, 'Pendiente', 'En Ruta', 1, 1, '2026-06-30 04:16:39', '2026-06-30 04:16:39', 29),
	(31, 3, 2, 0.30, '2026-06-30 08:57:00', '2026-06-30 09:00:09', 'Pendiente', 'Finalizado', 2, 1, '2026-06-30 14:00:02', '2026-06-30 14:01:07', NULL),
	(32, 2, 2, 0.30, '2026-06-30 09:53:00', NULL, 'Pendiente', 'En Ruta', 2, 1, '2026-06-30 14:57:58', '2026-06-30 14:57:58', NULL);

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
