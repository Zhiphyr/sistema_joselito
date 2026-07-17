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


-- Volcando estructura de base de datos para joselitobd
CREATE DATABASE IF NOT EXISTS `joselitobd` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `joselitobd`;

-- Volcando estructura para tabla joselitobd.adelantos_viaje
CREATE TABLE IF NOT EXISTS `adelantos_viaje` (
  `id_adelanto` int NOT NULL AUTO_INCREMENT,
  `id_viaje` int NOT NULL,
  `id_usuario` int NOT NULL COMMENT 'ID del usuario en sesión que registra el adelanto',
  `monto` decimal(10,2) NOT NULL,
  `id_cuenta` int DEFAULT NULL,
  `id_billetera` int DEFAULT NULL,
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
  KEY `adelanto_fk_cuenta` (`id_cuenta`),
  KEY `adelanto_fk_billetera` (`id_billetera`),
  CONSTRAINT `adelanto_fk_billetera` FOREIGN KEY (`id_billetera`) REFERENCES `billetera_digital` (`id_billetera`),
  CONSTRAINT `adelanto_fk_cuenta` FOREIGN KEY (`id_cuenta`) REFERENCES `cuenta_bancaria` (`id_cuenta`),
  CONSTRAINT `fk_adelanto_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `fk_adelanto_viaje` FOREIGN KEY (`id_viaje`) REFERENCES `viaje` (`id_viaje`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.adelantos_viaje: ~13 rows (aproximadamente)
INSERT INTO `adelantos_viaje` (`id_adelanto`, `id_viaje`, `id_usuario`, `monto`, `id_cuenta`, `id_billetera`, `metodo_entrega`, `numero_operacion`, `evidencia_url`, `motivo_referencial`, `estado`, `fecha_registro`, `fecha_actualizacion`) VALUES
	(1, 20, 2, 500.00, NULL, NULL, 'Billetera Digital', NULL, NULL, 'Viáticos iniciales', 1, '2026-06-23 15:27:45', '2026-06-23 15:34:16'),
	(2, 9, 2, 300.00, NULL, NULL, 'Billetera Digital', NULL, NULL, 'Viáticos iniciales', 1, '2026-06-26 15:27:36', '2026-06-26 15:28:01'),
	(3, 21, 2, 200.00, NULL, NULL, 'Transferencia', NULL, NULL, 'Se realizo una transferencia para los peajes', 1, '2026-06-26 17:29:12', '2026-06-26 17:29:12'),
	(4, 21, 2, 100.00, NULL, NULL, 'Billetera Digital', '68596325', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1782496515/sistema_joselito/comprobantes/voucher_1782496515631.jpg', 'Yapeo para combustible', 1, '2026-06-26 17:55:17', '2026-06-26 17:55:17'),
	(5, 29, 2, 500.00, NULL, NULL, 'Efectivo', NULL, NULL, 'Viáticos iniciales', 1, '2026-06-30 04:14:15', '2026-06-30 04:14:15'),
	(6, 31, 2, 500.00, NULL, NULL, 'Efectivo', NULL, NULL, 'Viáticos iniciales', 1, '2026-06-30 14:00:02', '2026-06-30 14:00:02'),
	(7, 32, 2, 500.00, NULL, NULL, 'Billetera Digital', '80202034', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1782831476/sistema_joselito/comprobantes/voucher_1782831476796.jpg', 'Viáticos iniciales', 1, '2026-06-30 14:57:58', '2026-06-30 14:57:58'),
	(8, 32, 2, 300.00, NULL, NULL, 'Efectivo', NULL, NULL, 'Peajes', 1, '2026-06-30 14:59:34', '2026-06-30 14:59:34'),
	(9, 35, 2, 500.00, NULL, NULL, 'Efectivo', NULL, NULL, 'Viáticos iniciales', 1, '2026-07-07 03:21:24', '2026-07-07 03:21:24'),
	(10, 37, 2, 400.00, NULL, NULL, 'Efectivo', NULL, NULL, 'Viáticos iniciales', 1, '2026-07-09 02:07:50', '2026-07-09 02:07:50'),
	(11, 39, 2, 500.00, NULL, NULL, 'Efectivo', NULL, NULL, 'Viáticos iniciales', 1, '2026-07-09 07:29:03', '2026-07-09 07:29:03'),
	(12, 39, 2, 100.00, NULL, NULL, 'Transferencia', '81818181', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1783582203/sistema_joselito/comprobantes/voucher_1783582203093.jpg', 'Adelanto para Combustible', 1, '2026-07-09 07:30:04', '2026-07-09 07:30:04'),
	(14, 39, 2, 200.00, 3, NULL, 'Transferencia', '999111222333', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1784005061/sistema_joselito/comprobantes/voucher_1784005060067.png', 'Se realizo una transferencia para los peajes', 1, '2026-07-14 04:57:41', '2026-07-14 04:57:41');

-- Volcando estructura para tabla joselitobd.auditoria_anulacion
CREATE TABLE IF NOT EXISTS `auditoria_anulacion` (
  `id_auditoria` int NOT NULL AUTO_INCREMENT,
  `modulo` enum('SINIESTROS','COBRO_FLETE') NOT NULL,
  `id_registro` int NOT NULL,
  `motivo` varchar(300) NOT NULL,
  `id_usuario` int NOT NULL,
  `fecha_anulacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_auditoria`),
  KEY `fk_auditoria_anulacion_usuario` (`id_usuario`),
  CONSTRAINT `fk_auditoria_anulacion_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla joselitobd.auditoria_anulacion: ~3 rows (aproximadamente)
INSERT INTO `auditoria_anulacion` (`id_auditoria`, `modulo`, `id_registro`, `motivo`, `id_usuario`, `fecha_anulacion`) VALUES
	(1, 'SINIESTROS', 12, 'Se realizo el pago por transferencia pero se selecciono en efectivo', 2, '2026-07-16 23:35:07'),
	(2, 'SINIESTROS', 16, 'Se registro el cobro como efectivo cuando era otro medio de pago', 2, '2026-07-17 00:14:39'),
	(3, 'COBRO_FLETE', 18, 'Se registro mal el método de pago', 2, '2026-07-17 00:28:44');

-- Volcando estructura para tabla joselitobd.billetera_digital
CREATE TABLE IF NOT EXISTS `billetera_digital` (
  `id_billetera` int NOT NULL AUTO_INCREMENT,
  `id_proveedor` int DEFAULT NULL,
  `id_cuenta_vinculada` int DEFAULT NULL,
  `numero_celular` varchar(20) NOT NULL,
  `titular` varchar(150) NOT NULL,
  `ruta_qr` varchar(255) DEFAULT NULL,
  `estado` tinyint DEFAULT '1',
  `id_usuario_registro` int DEFAULT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `active_cuenta_vinculada` int GENERATED ALWAYS AS (if((`estado` = 1),`id_cuenta_vinculada`,NULL)) STORED,
  PRIMARY KEY (`id_billetera`),
  UNIQUE KEY `unique_billetera_numero` (`id_proveedor`,`numero_celular`),
  UNIQUE KEY `uq_active_wallet` (`active_cuenta_vinculada`),
  KEY `id_cuenta_vinculada` (`id_cuenta_vinculada`),
  KEY `fk_billetera_usuario` (`id_usuario_registro`),
  CONSTRAINT `billetera_digital_ibfk_1` FOREIGN KEY (`id_cuenta_vinculada`) REFERENCES `cuenta_bancaria` (`id_cuenta`),
  CONSTRAINT `fk_billetera_proveedor` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedor_billetera` (`id_proveedor`),
  CONSTRAINT `fk_billetera_usuario` FOREIGN KEY (`id_usuario_registro`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla joselitobd.billetera_digital: ~5 rows (aproximadamente)
INSERT INTO `billetera_digital` (`id_billetera`, `id_proveedor`, `id_cuenta_vinculada`, `numero_celular`, `titular`, `ruta_qr`, `estado`, `id_usuario_registro`, `fecha_registro`, `fecha_actualizacion`) VALUES
	(1, 1, NULL, '999888777', 'Transporte Joselito', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1781247118/qr_yape1_llvstg.jpg', 1, NULL, '2026-07-04 02:39:35', '2026-07-04 16:46:28'),
	(2, 2, NULL, '999888777', 'Transporte Joselito', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1781247118/qr_plin_pgyta3.jpg', 1, NULL, '2026-07-04 02:39:35', '2026-07-04 03:37:22'),
	(3, 3, 5, '989912312', 'Jose Huaman', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1783183680/sistema_joselito/codigos_qr/qr_1783183679868.jpg', 1, 2, '2026-07-04 04:35:18', '2026-07-04 17:05:18'),
	(4, 1, 5, '922111967', 'Luis Castillo', NULL, 0, 2, '2026-07-04 16:37:53', '2026-07-04 16:53:25'),
	(7, 3, NULL, '999888777', 'TestCopiaYapeMismoNumero', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1783185009/sistema_joselito/codigos_qr/qr_1783185008417.jpg', 1, 2, '2026-07-04 16:47:16', '2026-07-04 17:10:09');

-- Volcando estructura para tabla joselitobd.camiones
CREATE TABLE IF NOT EXISTS `camiones` (
  `id_camion` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Alias, marca o modelo del camión',
  `placa` varchar(20) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Placa de rodaje (única por unidad)',
  `tipo_documento` varchar(10) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'DNI o RUC',
  `numero_documento` varchar(20) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Número de documento del conductor',
  `conductor` varchar(150) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Nombre o Razón Social del conductor',
  `direccion` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Dirección del conductor',
  `telefono` varchar(20) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Teléfono asignado a la unidad',
  `estado` tinyint(1) NOT NULL DEFAULT '1' COMMENT '0=inactivo, 1=activo, 2=eliminado',
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_camion`),
  UNIQUE KEY `uq_placa` (`placa`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Registro de unidades de transporte de la flota';

-- Volcando datos para la tabla joselitobd.camiones: ~5 rows (aproximadamente)
INSERT INTO `camiones` (`id_camion`, `nombre`, `placa`, `tipo_documento`, `numero_documento`, `conductor`, `direccion`, `telefono`, `estado`, `fecha_creacion`, `fecha_actualizacion`) VALUES
	(1, 'Volvo F11 Azul', 'M8A-987', 'DNI', '75405436', 'LUIS ANGEL CASTILLO GUEVARA', 'CALLE SANTA MARTHA MZ. E LT. 06, JOSE LEONARDO ORTIZ, CHICLAYO, LAMBAYEQUE', '956487152', 1, '2026-05-20 06:13:20', '2026-05-20 06:13:20'),
	(2, 'Scania Azul', 'M7A-658', 'DNI', '75407777', 'JHON DEIVIS RODAS BUSTAMANTE', 'JR. GUEPI 790, MORALES, SAN MARTIN, SAN MARTIN', '963256325', 1, '2026-05-27 22:19:12', '2026-05-27 22:19:12'),
	(3, 'Fuso Azul', 'B9A-695', 'DNI', '75698452', 'NAHUM HONORATO PADILLA MANCILLA', 'C.POBLADO PICHARI BAJA, PICHARI, LA CONVENCION, CUSCO', '984554123', 1, '2026-05-28 05:25:19', '2026-07-10 13:08:01'),
	(4, 'Scania Rojo - Edu', 'J1L-121', 'DNI', '75405439', 'RUBEN GABRIEL FLORES ANTONIO', 'Av. La Agricultura', '999111000', 1, '2026-07-10 05:22:02', '2026-07-10 05:22:02'),
	(5, 'Kenworth Marcos', 'A2V-222', 'DNI', '75402214', 'BRAYAN STIVEN JULCA PELAEZ', NULL, '921333000', 1, '2026-07-10 05:54:55', '2026-07-10 05:54:55');

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
) ENGINE=InnoDB AUTO_INCREMENT=90 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.carga: ~66 rows (aproximadamente)
INSERT INTO `carga` (`id_carga`, `id_viaje`, `id_remitente`, `id_destinatario`, `flete_total`, `estado_cobro`, `estado_entrega`, `id_usuario`, `estado`, `fecha_registro`, `fecha_actualizacion`) VALUES
	(1, 1, 3, 2, 108.00, 'Completado', 'Entregado', 2, 1, '2026-05-28 04:34:18', '2026-06-24 06:33:46'),
	(2, 1, 3, 4, 810.00, 'Completado', 'Entregado', 2, 1, '2026-05-28 04:34:18', '2026-06-30 15:52:41'),
	(3, 2, 4, 5, 832.00, 'Completado', 'Entregado', 2, 1, '2026-05-28 05:21:47', '2026-07-14 15:52:14'),
	(4, 2, 3, 1, 240.00, 'Completado', 'Entregado', 2, 1, '2026-05-28 05:21:47', '2026-07-14 15:52:22'),
	(5, 3, 1, 5, 392.40, 'Completado', 'Entregado', 2, 1, '2026-05-29 02:40:04', '2026-07-14 15:52:40'),
	(6, 3, 1, 3, 1740.00, 'Completado', 'Entregado', 2, 1, '2026-05-29 02:40:04', '2026-07-14 15:53:25'),
	(7, 3, 4, 2, 304.00, 'Completado', 'Entregado', 2, 1, '2026-05-29 02:40:04', '2026-07-14 16:15:37'),
	(8, 3, 1, 2, 3430.00, 'Pendiente', 'Entregado', 2, 1, '2026-05-29 02:40:04', '2026-06-06 17:57:57'),
	(9, 4, 1, 3, 150.00, 'Anulado', 'Rechazado', 2, 1, '2026-05-29 17:47:44', '2026-06-06 17:48:03'),
	(10, 4, 1, 3, 60.00, 'Pendiente', 'Entregado', 2, 1, '2026-05-29 17:47:44', '2026-06-06 17:57:01'),
	(11, 5, 1, 2, 2450.00, 'Completado', 'Entregado', 2, 1, '2026-06-05 23:49:37', '2026-07-14 16:16:00'),
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
	(32, 11, 3, 2, 1222.80, 'Completado', 'Entregado', 2, 1, '2026-06-07 02:07:16', '2026-07-14 16:16:17'),
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
	(60, 28, 2, 3, 6300.00, 'Completado', 'Entregado', 1, 1, '2026-06-30 01:45:10', '2026-07-14 15:54:51'),
	(61, 28, 3, 5, 8460.00, 'Anulado', 'Rechazado Total', 1, 1, '2026-06-30 01:45:10', '2026-06-30 05:54:39'),
	(62, 29, 2, 3, 250.00, 'Anulado', 'Transbordado', 2, 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39'),
	(63, 29, 1, 4, 3000.00, 'Anulado', 'Siniestrado Parcialmente', 2, 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39'),
	(64, 29, 4, 5, 5250.00, 'Anulado', 'Siniestrado Parcialmente', 2, 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39'),
	(65, 29, 4, 3, 1450.00, 'Anulado', 'Siniestrado Parcialmente', 2, 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39'),
	(66, 29, 5, 1, 3125.00, 'Anulado', 'Siniestrado', 2, 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39'),
	(67, 29, 4, 1, 630.00, 'Anulado', 'Transbordado', 2, 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39'),
	(68, 30, 2, 3, 125.00, 'Pendiente', 'Entregado Parcialmente', 1, 1, '2026-06-30 04:16:39', '2026-07-05 06:44:36'),
	(69, 30, 1, 4, 1500.00, 'Completado', 'Entregado', 1, 1, '2026-06-30 04:16:39', '2026-07-14 15:54:41'),
	(70, 30, 4, 5, 4987.50, 'Completado', 'Entregado Parcialmente', 1, 1, '2026-06-30 04:16:39', '2026-07-14 15:54:18'),
	(71, 30, 4, 3, 1329.00, 'Anulado', 'Rechazado Total', 1, 1, '2026-06-30 04:16:39', '2026-07-05 06:45:15'),
	(72, 30, 4, 1, 630.00, 'Pendiente', 'Entregado', 1, 1, '2026-06-30 04:16:39', '2026-07-05 06:45:02'),
	(73, 25, 1, 2, 450.00, 'Completado', 'Entregado', 1, 1, '2026-06-30 05:00:35', '2026-07-14 16:14:45'),
	(74, 31, 5, 2, 300.00, 'Completado', 'Entregado', 2, 1, '2026-06-30 14:00:02', '2026-07-14 16:14:06'),
	(75, 31, 1, 2, 3087.20, 'Completado', 'Entregado Parcialmente', 2, 1, '2026-06-30 14:00:02', '2026-07-14 15:54:30'),
	(76, 31, 2, 3, 3577.60, 'Completado', 'Entregado Parcialmente', 2, 1, '2026-06-30 14:00:02', '2026-07-14 15:54:33'),
	(77, 32, 2, 5, 13500.00, 'Completado', 'Entregado', 2, 1, '2026-06-30 14:57:58', '2026-06-30 15:59:52'),
	(78, 33, 3, 4, 2760.00, 'Completado', 'Entregado Parcialmente', 2, 1, '2026-07-05 07:05:29', '2026-07-14 16:13:36'),
	(79, 34, 2, 3, 18000.00, 'Pendiente', 'Entregado', 2, 1, '2026-07-05 07:23:26', '2026-07-05 07:23:36'),
	(80, 35, 1, 2, 2340.00, 'Anulado', 'Siniestrado Parcialmente', 2, 1, '2026-07-07 03:21:24', '2026-07-07 03:31:09'),
	(81, 35, 4, 3, 500.00, 'Anulado', 'Transbordado', 2, 1, '2026-07-07 03:21:24', '2026-07-07 03:31:09'),
	(82, 36, 1, 2, 2142.00, 'Completado', 'Entregado', 1, 1, '2026-07-07 03:31:09', '2026-07-14 16:12:26'),
	(83, 36, 4, 3, 500.00, 'Completado', 'Entregado', 1, 1, '2026-07-07 03:31:09', '2026-07-14 16:12:05'),
	(84, 37, 4, 3, 1800.00, 'Anulado', 'Siniestrado Parcialmente', 2, 1, '2026-07-09 02:07:50', '2026-07-09 03:04:37'),
	(85, 37, 5, 1, 1500.00, 'Anulado', 'Transbordado', 2, 1, '2026-07-09 02:07:50', '2026-07-09 03:04:37'),
	(86, 38, 4, 3, 1744.00, 'Completado', 'Entregado Parcialmente', 1, 1, '2026-07-09 03:04:37', '2026-07-17 00:29:25'),
	(87, 38, 5, 1, 1500.00, 'Pendiente', 'En Almacen de Destino', 1, 1, '2026-07-09 03:04:37', '2026-07-09 03:04:48'),
	(88, 39, 2, 4, 3000.00, 'Pendiente', 'En Almacen de Destino', 2, 1, '2026-07-09 07:29:03', '2026-07-09 07:30:35'),
	(89, 39, 3, 1, 5000.00, 'Pendiente', 'En Almacen de Destino', 2, 1, '2026-07-09 07:29:03', '2026-07-09 07:30:35');

-- Volcando estructura para tabla joselitobd.clientes
CREATE TABLE IF NOT EXISTS `clientes` (
  `id_cliente` int NOT NULL AUTO_INCREMENT,
  `tipo_documento` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'DNI o RUC',
  `numero_documento` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `nombre_razon_social` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `direccion` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `telefono` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `correo` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `estado` tinyint NOT NULL DEFAULT '1' COMMENT '0: Inactivo, 1: Activo, 2: Eliminado',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cliente`),
  UNIQUE KEY `numero_documento` (`numero_documento`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.clientes: ~5 rows (aproximadamente)
INSERT INTO `clientes` (`id_cliente`, `tipo_documento`, `numero_documento`, `nombre_razon_social`, `direccion`, `telefono`, `correo`, `estado`, `fecha_creacion`, `fecha_actualizacion`) VALUES
	(1, 'DNI', '75405436', 'LUIS ANGEL CASTILLO GUEVARA', 'Calle Santa Martha Mz E Lt 6', '947010376', 'luisgcastilllo@gmail.com', 1, '2026-05-12 14:17:56', '2026-05-12 14:18:38'),
	(2, 'RUC', '20337564373', 'TIENDAS POR DEPARTAMENTO RIPLEY S.A.C.', 'AV. LAS BEGONIAS NRO. 545 URB. JARDIN, SAN ISIDRO, LIMA, LIMA', '912934956', '', 1, '2026-05-12 15:59:30', '2026-05-12 15:59:30'),
	(3, 'DNI', '75406589', 'VALERY SOFIA QUINCHO BERRIOS', 'CALLE EL TUMI URB. SAN JUAN BAUTISTA DE VILLA MZ. G LT. 19B, CHORRILLOS, LIMA, LIMA', '958444123', '', 1, '2026-05-27 22:18:17', '2026-05-27 22:18:17'),
	(4, 'DNI', '75896325', 'DARIANA NOVOA MERCADO', 'CALLE ZEPITA 477, SAN PEDRO DE LLOC, PACASMAYO, LA LIBERTAD', '947555845', '', 1, '2026-05-28 04:33:25', '2026-05-28 04:33:25'),
	(5, 'RUC', '20608300393', 'COMPAÑIA FOOD RETAIL S.A.C.', 'CAL. CESAR MORELLI NRO. 181      SAN BORJA NORTE, SAN BORJA, LIMA, LIMA', '911563258', '', 1, '2026-05-28 05:10:57', '2026-05-28 05:10:57'),
	(6, 'DNI', '75412244', 'LUCERO JASMINI LEÓN VARGAS', NULL, '999444333', NULL, 1, '2026-07-10 16:01:35', '2026-07-10 16:01:35');

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

-- Volcando datos para la tabla joselitobd.configuracion_sistema: ~1 rows (aproximadamente)
INSERT INTO `configuracion_sistema` (`id_config`, `parametro`, `valor`, `descripcion`, `fecha_actualizacion`) VALUES
	(1, 'PIN_ANULACION_PAGOS', '$2b$10$JS9osLLm2f8yZdZQ8qJu0uWS3vHoocQfEAjPvdgUYuBvZLkFCfMLW', 'PIN numérico para autorizar anulación de pagos', '2026-06-12 09:18:16');

-- Volcando estructura para tabla joselitobd.cuenta_bancaria
CREATE TABLE IF NOT EXISTS `cuenta_bancaria` (
  `id_cuenta` int NOT NULL AUTO_INCREMENT,
  `id_entidad` int DEFAULT NULL,
  `tipo_cuenta` varchar(50) NOT NULL,
  `nro_cuenta` varchar(100) DEFAULT NULL,
  `nro_cci` varchar(100) DEFAULT NULL,
  `titular` varchar(150) NOT NULL,
  `estado` tinyint DEFAULT '1',
  `es_sistema` tinyint(1) DEFAULT '0',
  `id_usuario_registro` int DEFAULT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cuenta`),
  UNIQUE KEY `unique_nro_cuenta` (`nro_cuenta`),
  UNIQUE KEY `unique_nro_cci` (`nro_cci`),
  KEY `fk_cuenta_usuario` (`id_usuario_registro`),
  KEY `fk_cuenta_entidad` (`id_entidad`),
  CONSTRAINT `fk_cuenta_entidad` FOREIGN KEY (`id_entidad`) REFERENCES `entidad_financiera` (`id_entidad`),
  CONSTRAINT `fk_cuenta_usuario` FOREIGN KEY (`id_usuario_registro`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla joselitobd.cuenta_bancaria: ~8 rows (aproximadamente)
INSERT INTO `cuenta_bancaria` (`id_cuenta`, `id_entidad`, `tipo_cuenta`, `nro_cuenta`, `nro_cci`, `titular`, `estado`, `es_sistema`, `id_usuario_registro`, `fecha_registro`, `fecha_actualizacion`) VALUES
	(3, 1, 'Corriente', '191-0000000-0-00', '002191000000000012', 'Transporte Joselito S.A.C.', 1, 0, NULL, '2026-07-04 02:39:35', '2026-07-04 03:37:22'),
	(4, 2, 'Ahorros', '200-300000000', '11111111222221111119', 'Teofila Inca', 1, 0, NULL, '2026-07-04 02:39:35', '2026-07-04 17:06:42'),
	(5, 1, 'Corriente', '191-12345678-0-15', '11111111111111111111', 'Jose Huaman', 1, 0, 2, '2026-07-04 04:23:05', '2026-07-04 16:26:47'),
	(9, 5, 'Corriente', '191-12345678-0-16', '11111111211221111119', 'Test', 1, 0, 2, '2026-07-04 04:29:37', '2026-07-04 05:32:07'),
	(10, 1, 'Ahorros', '191-12345678-0-18', '11111111111111111113', 'TestA', 1, 0, 2, '2026-07-04 04:34:37', '2026-07-04 04:34:37'),
	(11, 9, 'Efectivo', 'Caja Física Principal', NULL, 'Empresa', 1, 1, NULL, '2026-07-04 17:33:16', '2026-07-04 17:43:08'),
	(13, 7, 'Ahorros', '191-12345678-0-67', '11111111112222222222', 'TestInicial', 0, 0, 2, '2026-07-14 07:06:56', '2026-07-14 15:51:35');

-- Volcando estructura para tabla joselitobd.cuenta_bancaria_old
CREATE TABLE IF NOT EXISTS `cuenta_bancaria_old` (
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

-- Volcando datos para la tabla joselitobd.cuenta_bancaria_old: ~4 rows (aproximadamente)
INSERT INTO `cuenta_bancaria_old` (`id_cuenta`, `entidad_financiera`, `tipo_cuenta`, `nro_cuenta`, `nro_cci`, `titular`, `ruta_qr`, `estado`) VALUES
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
  `incidencia_justificada` tinyint(1) DEFAULT '0' COMMENT '1 = Rechazado sin justificar, 0 = Normal o justificado',
  PRIMARY KEY (`id_detalle`),
  KEY `fk_detalle_carga` (`id_carga`),
  KEY `fk_detalle_producto` (`id_producto`),
  CONSTRAINT `fk_detalle_carga` FOREIGN KEY (`id_carga`) REFERENCES `carga` (`id_carga`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_detalle_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=163 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.detalle_carga: ~134 rows (aproximadamente)
INSERT INTO `detalle_carga` (`id_detalle`, `id_carga`, `id_producto`, `marca_visual`, `cantidad_sacos`, `peso_unitario`, `peso_total`, `precio_peso`, `flete_subtotal`, `estado_operativo`, `estado`, `fecha_registro`, `fecha_actualizacion`, `incidencia_justificada`) VALUES
	(1, 1, 1, 'Marca Rojo', 2, 90.00, 180.00, 0.60, 108.00, 'Normal', 1, '2026-05-28 04:34:18', '2026-05-28 04:34:18', 0),
	(2, 2, 2, 'Marca Azul y Verde', 30, 30.00, 900.00, 0.60, 540.00, 'Normal', 1, '2026-05-28 04:34:18', '2026-05-28 04:34:18', 0),
	(3, 2, 3, 'Marca Azul y Verde', 15, 30.00, 450.00, 0.60, 270.00, 'Normal', 1, '2026-05-28 04:34:18', '2026-05-28 04:34:18', 0),
	(4, 3, 2, 'Marca Rojo', 30, 23.50, 705.00, 0.40, 282.00, 'Normal', 1, '2026-05-28 05:21:47', '2026-05-28 05:21:47', 0),
	(5, 3, 3, 'Marca Roja', 50, 25.70, 1285.00, 0.40, 514.00, 'Normal', 1, '2026-05-28 05:21:47', '2026-05-28 05:21:47', 0),
	(6, 3, 1, 'Rafia Roja', 1, 120.00, 120.00, 0.30, 36.00, 'Normal', 1, '2026-05-28 05:21:47', '2026-05-28 05:21:47', 0),
	(7, 4, 1, 'Rafia Verde', 5, 120.00, 600.00, 0.40, 240.00, 'Normal', 1, '2026-05-28 05:21:47', '2026-05-28 05:21:47', 0),
	(8, 5, 2, 'Marca Verde', 30, 32.70, 981.00, 0.40, 392.40, 'Normal', 1, '2026-05-29 02:40:04', '2026-05-29 02:40:04', 0),
	(9, 6, 2, 'Marca Morada', 50, 30.00, 1500.00, 0.40, 600.00, 'Normal', 1, '2026-05-29 02:40:04', '2026-05-29 02:40:04', 0),
	(10, 6, 3, 'Marca Morada', 50, 35.00, 1750.00, 0.40, 700.00, 'Normal', 1, '2026-05-29 02:40:04', '2026-05-29 02:40:04', 0),
	(11, 6, 1, 'Rafia Morada', 10, 110.00, 1100.00, 0.40, 440.00, 'Normal', 1, '2026-05-29 02:40:04', '2026-05-29 02:40:04', 0),
	(12, 7, 1, 'Rafia Negra', 8, 95.00, 760.00, 0.40, 304.00, 'Normal', 1, '2026-05-29 02:40:04', '2026-05-29 02:40:04', 0),
	(13, 8, 2, 'Marca Negra', 100, 35.00, 3500.00, 0.50, 1750.00, 'Normal', 1, '2026-05-29 02:40:04', '2026-05-29 02:40:04', 0),
	(14, 8, 3, 'Marca Negra', 100, 33.60, 3360.00, 0.50, 1680.00, 'Normal', 1, '2026-05-29 02:40:04', '2026-05-29 02:40:04', 0),
	(15, 9, 1, 'Marca Azul', 2, 90.00, 180.00, 0.50, 90.00, 'Normal', 2, '2026-05-29 17:47:44', '2026-06-06 17:48:03', 0),
	(16, 9, 2, 'Marca Azul', 10, 30.00, 300.00, 0.50, 150.00, 'Normal', 1, '2026-05-29 17:47:44', '2026-06-06 17:48:03', 0),
	(17, 10, 2, 'Marca verde', 2, 60.00, 120.00, 0.50, 60.00, 'Normal', 1, '2026-05-29 17:47:44', '2026-05-29 17:47:44', 0),
	(18, 11, 1, 'Rafia Morada', 10, 90.00, 900.00, 0.50, 450.00, 'Normal', 1, '2026-06-05 23:49:37', '2026-06-05 23:49:37', 0),
	(19, 11, 2, 'Marca Morada', 50, 30.00, 1500.00, 0.50, 750.00, 'Normal', 1, '2026-06-05 23:49:37', '2026-06-05 23:49:37', 0),
	(20, 11, 2, 'Marca Morada', 100, 25.00, 2500.00, 0.50, 1250.00, 'Normal', 1, '2026-06-05 23:49:37', '2026-06-05 23:49:37', 0),
	(21, 12, 1, 'Rafia Azul y Verde', 15, 110.00, 1650.00, 0.50, 825.00, 'Normal', 1, '2026-06-05 23:49:37', '2026-06-05 23:49:37', 0),
	(22, 13, 2, 'Marca Rojo y Azul', 50, 35.00, 1750.00, 0.50, 875.00, 'Normal', 1, '2026-06-05 23:49:37', '2026-06-05 23:49:37', 0),
	(23, 13, 3, 'Marca Rojo y Azul', 50, 50.00, 2500.00, 0.50, 1250.00, 'Normal', 1, '2026-06-05 23:49:37', '2026-06-05 23:49:37', 0),
	(24, 14, 1, 'Marca Azul', 2, 90.00, 180.00, 0.50, 90.00, 'Normal', 1, '2026-06-06 17:48:03', '2026-06-06 17:48:03', 0),
	(25, 14, 2, 'Marca Azul', 5, 30.00, 150.00, 0.50, 75.00, 'Normal', 1, '2026-06-06 17:48:03', '2026-06-06 17:48:03', 0),
	(26, 15, 1, 'Marca Verde', 7, 30.00, 210.00, 0.30, 63.00, 'Normal', 1, '2026-06-06 18:02:51', '2026-06-06 18:03:54', 0),
	(27, 16, 3, 'Marca Azul', 15, 30.00, 450.00, 0.30, 135.00, 'Normal', 2, '2026-06-06 18:02:51', '2026-06-06 18:03:16', 0),
	(28, 16, 2, 'Marca Azul con Negro', 15, 33.00, 495.00, 0.30, 148.50, 'Normal', 1, '2026-06-06 18:02:51', '2026-06-06 18:03:16', 0),
	(29, 17, 3, 'Marca Azul', 15, 30.00, 450.00, 0.30, 135.00, 'Normal', 1, '2026-06-06 18:03:16', '2026-06-06 18:03:16', 0),
	(30, 17, 2, 'Marca Azul con Negro', 5, 33.00, 165.00, 0.30, 49.50, 'Normal', 1, '2026-06-06 18:03:16', '2026-06-06 18:03:16', 0),
	(31, 18, 1, 'Marca Verde', 8, 30.00, 240.00, 0.30, 72.00, 'Normal', 1, '2026-06-06 18:03:54', '2026-06-06 18:03:54', 0),
	(32, 19, 3, 'Marca Verde', 50, 35.50, 1775.00, 0.30, 532.50, 'Normal', 1, '2026-06-06 18:05:09', '2026-06-06 18:05:23', 0),
	(33, 20, 3, 'Marca Verde', 100, 35.50, 3550.00, 0.30, 1065.00, 'Normal', 1, '2026-06-06 18:05:23', '2026-06-06 18:05:23', 0),
	(34, 21, 1, 'Marca Verde', 10, 90.00, 900.00, 0.50, 450.00, 'Normal', 2, '2026-06-06 23:57:21', '2026-06-07 01:51:58', 0),
	(35, 21, 2, 'Marca Verde', 100, 35.00, 3500.00, 0.50, 1750.00, 'Normal', 2, '2026-06-06 23:57:21', '2026-06-07 01:51:58', 0),
	(36, 21, 3, 'Marca Verde', 100, 20.00, 2000.00, 0.50, 1000.00, 'Normal', 1, '2026-06-06 23:57:21', '2026-06-07 01:51:58', 0),
	(37, 22, 1, 'Marca Roja con Amarillo', 10, 99.00, 990.00, 0.50, 495.00, 'Normal', 1, '2026-06-06 23:57:21', '2026-06-06 23:57:21', 0),
	(38, 23, 2, 'Marca Negra', 80, 45.00, 3600.00, 0.50, 1800.00, 'Normal', 2, '2026-06-06 23:57:21', '2026-06-07 00:51:27', 0),
	(39, 23, 3, 'Marca Negra', 50, 30.00, 1500.00, 0.50, 750.00, 'Normal', 1, '2026-06-06 23:57:21', '2026-06-07 00:51:27', 0),
	(40, 24, 2, 'Marca Negra', 80, 45.00, 3600.00, 0.50, 1800.00, 'Normal', 1, '2026-06-07 00:51:27', '2026-06-07 00:51:27', 0),
	(41, 24, 3, 'Marca Negra', 200, 30.00, 6000.00, 0.50, 3000.00, 'Normal', 1, '2026-06-07 00:51:27', '2026-06-07 00:51:27', 0),
	(42, 25, 1, 'Marca Negra', 20, 90.00, 1800.00, 0.40, 720.00, 'Normal', 1, '2026-06-07 00:54:25', '2026-06-07 00:54:25', 0),
	(43, 25, 3, 'Marca Negra', 0, 30.00, 0.00, 0.40, 0.00, 'Normal', 1, '2026-06-07 00:54:25', '2026-06-08 05:16:59', 0),
	(44, 26, 2, 'Marca Verde', 100, 35.00, 3500.00, 0.50, 1750.00, 'Normal', 1, '2026-06-07 01:51:58', '2026-06-07 01:51:58', 0),
	(45, 26, 3, 'Marca Verde', 100, 20.00, 2000.00, 0.50, 1000.00, 'Normal', 1, '2026-06-07 01:51:58', '2026-06-07 01:51:58', 0),
	(46, 26, 1, 'Marca Verde', 10, 90.00, 900.00, 0.50, 450.00, 'Normal', 1, '2026-06-07 01:51:58', '2026-06-07 01:51:58', 0),
	(47, 27, 2, 'Marca Verde', 15, 30.00, 450.00, 0.50, 225.00, 'Normal', 1, '2026-06-07 01:53:59', '2026-06-07 01:53:59', 0),
	(48, 27, 1, 'Rafia Verde', 10, 105.00, 1050.00, 0.50, 525.00, 'Normal', 2, '2026-06-07 01:53:59', '2026-06-07 01:54:58', 0),
	(49, 28, 3, 'Marca Roja', 150, 45.70, 6855.00, 0.50, 3427.50, 'Normal', 1, '2026-06-07 01:53:59', '2026-06-07 01:53:59', 0),
	(50, 28, 2, 'Marca Roja', 200, 50.00, 10000.00, 0.50, 5000.00, 'Normal', 1, '2026-06-07 01:53:59', '2026-06-07 01:53:59', 0),
	(51, 29, 1, 'Rafia Verde', 10, 105.00, 1050.00, 0.50, 525.00, 'Normal', 1, '2026-06-07 01:54:58', '2026-06-07 01:54:58', 0),
	(52, 30, 1, 'Marca Verde', 5, 90.00, 450.00, 0.60, 270.00, 'Normal', 1, '2026-06-07 02:07:16', '2026-06-07 05:23:06', 0),
	(53, 30, 2, 'Marca Rosa', 10, 50.00, 500.00, 0.60, 300.00, 'Normal', 1, '2026-06-07 02:07:16', '2026-06-07 05:23:06', 0),
	(54, 31, 2, 'Marca Negra', 100, 30.00, 3000.00, 0.60, 1800.00, 'Normal', 1, '2026-06-07 02:07:16', '2026-06-07 02:07:16', 0),
	(55, 31, 3, 'Marca Negra', 200, 45.00, 9000.00, 0.60, 5400.00, 'Normal', 1, '2026-06-07 02:07:16', '2026-06-07 02:07:16', 0),
	(56, 32, 1, 'Rafia Azul', 5, 107.60, 538.00, 0.60, 322.80, 'Normal', 1, '2026-06-07 02:07:16', '2026-06-07 02:07:16', 0),
	(57, 32, 2, 'Marca Azul', 50, 30.00, 1500.00, 0.60, 900.00, 'Normal', 1, '2026-06-07 02:07:16', '2026-06-07 02:07:16', 0),
	(58, 33, 1, 'Marca Verde', 10, 90.00, 900.00, 0.60, 540.00, 'Normal', 1, '2026-06-07 05:23:06', '2026-06-07 05:23:06', 0),
	(59, 33, 2, 'Marca Rosa', 10, 50.00, 500.00, 0.60, 300.00, 'Normal', 1, '2026-06-07 05:23:06', '2026-06-07 05:23:06', 0),
	(60, 34, 3, 'Marca Negra', 250, 30.00, 7500.00, 0.40, 3000.00, 'Normal', 1, '2026-06-08 05:16:59', '2026-06-10 07:06:10', 0),
	(61, 35, 2, 'Marca Verde', 100, 35.00, 3500.00, 0.60, 2100.00, 'Normal', 1, '2026-06-08 22:23:17', '2026-06-08 22:23:17', 0),
	(62, 35, 3, 'Marca Azul', 0, 33.60, 0.00, 0.60, 0.00, 'Normal', 1, '2026-06-08 22:23:17', '2026-06-08 22:31:31', 0),
	(63, 36, 1, 'Rafia Morada', 0, 98.60, 0.00, 0.60, 0.00, 'Normal', 1, '2026-06-08 22:23:17', '2026-06-08 22:31:31', 0),
	(64, 37, 3, 'Marca Azul', 1, 33.60, 33.60, 0.60, 20.16, 'Normal', 1, '2026-06-08 22:31:31', '2026-06-27 01:07:36', 0),
	(65, 38, 1, 'Rafia Morada', 10, 98.60, 986.00, 0.60, 591.60, 'Normal', 1, '2026-06-08 22:31:31', '2026-06-08 22:31:31', 0),
	(66, 39, 3, 'Marca Negra', 200, 30.00, 6000.00, 0.40, 2400.00, 'Normal', 1, '2026-06-10 07:06:10', '2026-06-10 07:06:10', 0),
	(67, 40, 1, 'Marca Azul', 0, 30.00, 0.00, 0.50, 0.00, 'Normal', 1, '2026-06-11 21:25:57', '2026-06-11 21:38:00', 0),
	(68, 41, 1, 'Marca Azul', 120, 30.00, 3600.00, 0.50, 1800.00, 'Transbordado', 1, '2026-06-11 21:38:00', '2026-06-30 01:17:12', 0),
	(69, 42, 1, 'Rafia Azul', 15, 90.00, 1350.00, 0.60, 810.00, 'Siniestrado', 1, '2026-06-12 17:32:50', '2026-06-29 20:43:08', 0),
	(70, 42, 2, 'Marca Azul', 150, 50.00, 7500.00, 0.60, 4500.00, 'Siniestrado', 1, '2026-06-12 17:32:50', '2026-06-29 20:43:08', 0),
	(71, 42, 3, 'Marca Verde', 200, 30.00, 6000.00, 0.60, 3600.00, 'Siniestrado', 1, '2026-06-12 17:32:50', '2026-06-29 20:43:08', 0),
	(72, 43, 1, 'Rafia Morada', 30, 99.00, 2970.00, 0.60, 1782.00, 'Transbordado', 1, '2026-06-12 17:32:50', '2026-06-29 20:43:08', 0),
	(73, 44, 1, 'Marca Verde', 15, 105.00, 1575.00, 0.40, 630.00, 'Transbordado', 1, '2026-06-12 17:32:50', '2026-06-29 20:43:08', 0),
	(74, 45, 1, 'Rafia Morada', 15, 90.00, 1350.00, 0.60, 810.00, 'Transbordado', 1, '2026-06-12 17:32:50', '2026-06-29 20:43:08', 0),
	(75, 46, 1, 'Marca Verde', 15, 90.00, 1350.00, 0.80, 1080.00, 'Transbordado', 1, '2026-06-12 17:50:12', '2026-06-29 18:50:40', 0),
	(76, 46, 2, 'Marca Verde', 20, 30.00, 600.00, 0.40, 240.00, 'Transbordado', 1, '2026-06-12 17:50:12', '2026-06-29 18:50:40', 0),
	(79, 48, 1, 'Marca Negra', 0, 80.00, 0.00, 0.60, 0.00, 'Normal', 1, '2026-06-23 15:27:45', '2026-06-26 07:48:49', 0),
	(80, 48, 2, 'Marca Negra', 0, 20.00, 0.00, 0.60, 0.00, 'Normal', 1, '2026-06-23 15:27:45', '2026-06-26 07:48:49', 0),
	(81, 49, 1, 'Marca Negra', 50, 80.00, 4000.00, 0.60, 2400.00, 'Normal', 1, '2026-06-26 07:48:49', '2026-06-26 07:48:49', 0),
	(82, 49, 2, 'Marca Negra', 80, 20.00, 1600.00, 0.60, 960.00, 'Normal', 1, '2026-06-26 07:48:49', '2026-06-26 07:48:49', 0),
	(83, 50, 3, 'Marca Azul', 149, 33.60, 5006.40, 0.60, 3003.84, 'Normal', 1, '2026-06-27 01:07:36', '2026-06-27 01:07:36', 0),
	(84, 51, 1, 'Marca Verde', 15, 90.00, 1350.00, 0.80, 1080.00, 'Normal', 1, '2026-06-29 18:50:40', '2026-06-29 18:50:40', 0),
	(85, 51, 2, 'Marca Verde', 15, 30.00, 450.00, 0.40, 180.00, 'Normal', 1, '2026-06-29 18:50:40', '2026-06-29 18:50:40', 0),
	(86, 52, 1, 'Rafia Morada', 28, 99.00, 2772.00, 0.60, 1663.20, 'Entregado', 1, '2026-06-29 20:43:08', '2026-06-30 05:55:16', 0),
	(87, 53, 1, 'Marca Verde', 15, 105.00, 1575.00, 0.40, 630.00, 'Entregado', 1, '2026-06-29 20:43:08', '2026-06-30 05:55:31', 0),
	(88, 54, 1, 'Rafia Morada', 10, 90.00, 900.00, 0.60, 540.00, 'Rechazado', 1, '2026-06-29 20:43:08', '2026-06-30 05:55:34', 0),
	(89, 55, 1, 'Marca Azul', 50, 45.00, 2250.00, 0.60, 1350.00, 'Siniestrado', 1, '2026-06-30 01:09:10', '2026-06-30 01:45:10', 0),
	(90, 55, 2, 'Marca Azul y Roja', 200, 30.00, 6000.00, 0.60, 3600.00, 'Transbordado', 1, '2026-06-30 01:09:10', '2026-06-30 01:45:10', 0),
	(91, 56, 1, 'Marca Negra', 5, 80.00, 400.00, 0.60, 240.00, 'Siniestrado', 1, '2026-06-30 01:09:10', '2026-06-30 01:45:10', 0),
	(92, 56, 3, 'Marca Negra', 70, 50.00, 3500.00, 0.60, 2100.00, 'Siniestrado', 1, '2026-06-30 01:09:10', '2026-06-30 01:45:10', 0),
	(93, 57, 1, 'Marca Azul', 30, 30.00, 900.00, 0.50, 450.00, 'Normal', 1, '2026-06-30 01:17:12', '2026-06-30 05:00:35', 0),
	(94, 58, 1, 'Marca Verde', 60, 90.00, 5400.00, 0.50, 2700.00, 'Siniestrado', 1, '2026-06-30 01:35:46', '2026-06-30 01:36:22', 0),
	(95, 59, 1, 'Marca Verde', 30, 90.00, 2700.00, 0.50, 1350.00, 'Entregado', 1, '2026-06-30 01:36:22', '2026-06-30 05:33:19', 0),
	(96, 58, 1, 'Marca Verde', 60, 90.00, 5400.00, 0.50, 2700.00, 'Transbordado', 1, '2026-06-30 01:36:22', '2026-06-30 01:36:22', 0),
	(97, 60, 1, 'Marca Azul', 100, 45.00, 4500.00, 0.60, 2700.00, 'Entregado', 1, '2026-06-30 01:45:10', '2026-06-30 05:54:30', 0),
	(98, 55, 1, 'Marca Azul', 100, 45.00, 4500.00, 0.60, 2700.00, 'Transbordado', 1, '2026-06-30 01:45:10', '2026-06-30 01:45:10', 0),
	(99, 60, 2, 'Marca Azul y Roja', 200, 30.00, 6000.00, 0.60, 3600.00, 'Entregado', 1, '2026-06-30 01:45:10', '2026-06-30 05:54:30', 0),
	(100, 61, 1, 'Marca Negra', 95, 80.00, 7600.00, 0.60, 4560.00, 'Rechazado', 1, '2026-06-30 01:45:10', '2026-06-30 05:54:39', 0),
	(101, 56, 1, 'Marca Negra', 95, 80.00, 7600.00, 0.60, 4560.00, 'Transbordado', 1, '2026-06-30 01:45:10', '2026-06-30 01:45:10', 0),
	(102, 61, 3, 'Marca Negra', 130, 50.00, 6500.00, 0.60, 3900.00, 'Rechazado', 1, '2026-06-30 01:45:10', '2026-06-30 05:54:39', 0),
	(103, 56, 3, 'Marca Negra', 130, 50.00, 6500.00, 0.60, 3900.00, 'Transbordado', 1, '2026-06-30 01:45:10', '2026-06-30 01:45:10', 0),
	(104, 62, 1, 'Marca Negra', 10, 50.00, 500.00, 0.50, 250.00, 'Transbordado', 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39', 0),
	(105, 63, 2, 'Marca Roja', 100, 30.00, 3000.00, 0.50, 1500.00, 'Siniestrado', 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39', 0),
	(106, 64, 2, 'Marca Morada', 20, 25.00, 500.00, 0.50, 250.00, 'Siniestrado', 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39', 0),
	(107, 64, 3, 'Marca Morada', 100, 30.00, 3000.00, 0.50, 1500.00, 'Transbordado', 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39', 0),
	(108, 65, 5, 'Marca Amarilla', 2, 10.00, 20.00, 0.80, 16.00, 'Siniestrado', 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39', 0),
	(109, 65, 4, 'Marca Amarilla', 10, 15.00, 150.00, 0.70, 105.00, 'Siniestrado', 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39', 0),
	(110, 66, 8, 'Marca Verde', 15, 150.00, 2250.00, 0.50, 1125.00, 'Siniestrado', 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39', 0),
	(111, 66, 7, 'Marca Negra', 100, 40.00, 4000.00, 0.50, 2000.00, 'Siniestrado', 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39', 0),
	(112, 67, 9, 'Color Rojo con Negro', 1, 300.00, 300.00, 1.00, 300.00, 'Transbordado', 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39', 0),
	(113, 67, 9, 'Color Verde con Blanco', 1, 330.00, 330.00, 1.00, 330.00, 'Transbordado', 1, '2026-06-30 04:14:15', '2026-06-30 04:16:39', 0),
	(114, 68, 1, 'Marca Negra', 5, 50.00, 250.00, 0.50, 125.00, 'Entregado', 1, '2026-06-30 04:16:39', '2026-07-05 06:44:36', 0),
	(115, 69, 2, 'Marca Roja', 100, 30.00, 3000.00, 0.50, 1500.00, 'Entregado', 1, '2026-06-30 04:16:39', '2026-07-05 06:44:42', 0),
	(116, 63, 2, 'Marca Roja', 100, 30.00, 3000.00, 0.50, 1500.00, 'Transbordado', 1, '2026-06-30 04:16:39', '2026-06-30 04:16:39', 0),
	(117, 70, 2, 'Marca Morada', 279, 25.00, 6975.00, 0.50, 3487.50, 'Entregado', 1, '2026-06-30 04:16:39', '2026-07-05 06:44:55', 0),
	(118, 64, 2, 'Marca Morada', 280, 25.00, 7000.00, 0.50, 3500.00, 'Transbordado', 1, '2026-06-30 04:16:39', '2026-06-30 04:16:39', 0),
	(119, 70, 3, 'Marca Morada', 100, 30.00, 3000.00, 0.50, 1500.00, 'Entregado', 1, '2026-06-30 04:16:39', '2026-07-05 06:44:55', 0),
	(120, 71, 5, 'Marca Amarilla', 48, 10.00, 480.00, 0.80, 384.00, 'Rechazado', 1, '2026-06-30 04:16:39', '2026-07-05 06:51:26', 0),
	(121, 65, 5, 'Marca Amarilla', 48, 10.00, 480.00, 0.80, 384.00, 'Transbordado', 1, '2026-06-30 04:16:39', '2026-06-30 04:16:39', 0),
	(122, 71, 4, 'Marca Amarilla', 90, 15.00, 1350.00, 0.70, 945.00, 'Rechazado', 1, '2026-06-30 04:16:39', '2026-07-05 06:51:26', 0),
	(123, 65, 4, 'Marca Amarilla', 90, 15.00, 1350.00, 0.70, 945.00, 'Transbordado', 1, '2026-06-30 04:16:39', '2026-06-30 04:16:39', 0),
	(124, 72, 9, 'Color Rojo con Negro', 1, 300.00, 300.00, 1.00, 300.00, 'Entregado', 1, '2026-06-30 04:16:39', '2026-07-05 06:45:02', 0),
	(125, 72, 9, 'Color Verde con Blanco', 1, 330.00, 330.00, 1.00, 330.00, 'Entregado', 1, '2026-06-30 04:16:39', '2026-07-05 06:45:02', 0),
	(126, 73, 1, 'Marca Azul', 30, 30.00, 900.00, 0.50, 450.00, 'Normal', 1, '2026-06-30 05:00:35', '2026-06-30 05:00:35', 0),
	(127, 59, 1, 'Marca Verde', 30, 90.00, 2700.00, 0.50, 1350.00, 'Rechazado', 1, '2026-06-30 05:33:19', '2026-06-30 05:33:19', 0),
	(128, 52, 1, 'Rafia Morada', 2, 99.00, 198.00, 0.60, 118.80, 'Rechazado', 1, '2026-06-30 05:55:16', '2026-06-30 05:55:16', 0),
	(129, 74, 9, 'Color Negra', 1, 300.00, 300.00, 1.00, 300.00, 'Entregado', 1, '2026-06-30 14:00:02', '2026-06-30 14:00:27', 0),
	(130, 75, 7, 'Marca Verde', 85, 45.40, 3859.00, 0.80, 3087.20, 'Entregado', 1, '2026-06-30 14:00:02', '2026-06-30 14:00:47', 0),
	(131, 76, 4, 'Marca Amarilla', 96, 18.00, 1728.00, 0.80, 1382.40, 'Entregado', 1, '2026-06-30 14:00:02', '2026-06-30 14:01:07', 0),
	(132, 76, 5, 'Marca Amarilla', 98, 28.00, 2744.00, 0.80, 2195.20, 'Entregado', 1, '2026-06-30 14:00:02', '2026-06-30 14:01:07', 0),
	(133, 75, 7, 'Marca Verde', 15, 45.40, 681.00, 0.80, 544.80, 'Rechazado', 1, '2026-06-30 14:00:47', '2026-07-07 00:43:02', 0),
	(134, 76, 4, 'Marca Amarilla', 4, 18.00, 72.00, 0.80, 57.60, 'Rechazado', 1, '2026-06-30 14:01:07', '2026-07-08 17:01:46', 0),
	(135, 76, 5, 'Marca Amarilla', 2, 28.00, 56.00, 0.80, 44.80, 'Rechazado', 1, '2026-06-30 14:01:07', '2026-07-08 17:01:46', 0),
	(136, 77, 6, 'Embalados', 1, 15000.00, 15000.00, 0.90, 13500.00, 'Entregado', 1, '2026-06-30 14:57:58', '2026-06-30 15:33:24', 0),
	(137, 68, 1, 'Marca Negra', 5, 50.00, 250.00, 0.50, 125.00, 'Rechazado', 1, '2026-07-05 06:44:36', '2026-07-05 06:51:26', 0),
	(138, 70, 2, 'Marca Morada', 1, 25.00, 25.00, 0.50, 12.50, 'Rechazado', 1, '2026-07-05 06:44:55', '2026-07-05 06:52:48', 0),
	(139, 78, 7, 'Marca Negra', 100, 45.00, 4500.00, 0.40, 1800.00, 'Entregado', 1, '2026-07-05 07:05:29', '2026-07-05 07:05:44', 0),
	(140, 78, 4, 'Marca Negra', 100, 24.00, 2400.00, 0.40, 960.00, 'Entregado', 1, '2026-07-05 07:05:29', '2026-07-05 07:05:44', 0),
	(141, 78, 7, 'Marca Negra', 100, 45.00, 4500.00, 0.40, 1800.00, 'Rechazado', 1, '2026-07-05 07:05:44', '2026-07-07 00:39:43', 0),
	(142, 79, 6, 'Sin marca', 1, 18000.00, 18000.00, 1.00, 18000.00, 'Entregado', 1, '2026-07-05 07:23:26', '2026-07-05 07:23:36', 0),
	(143, 80, 1, 'Marca Negra', 5, 30.00, 150.00, 0.60, 90.00, 'Siniestrado', 1, '2026-07-07 03:21:24', '2026-07-07 15:50:17', 0),
	(144, 80, 2, 'Marca Negra', 4, 45.00, 180.00, 0.60, 108.00, 'Siniestrado', 1, '2026-07-07 03:21:24', '2026-07-07 18:27:14', 0),
	(145, 81, 6, 'Sin Marca', 1, 500.00, 500.00, 1.00, 500.00, 'Transbordado', 1, '2026-07-07 03:21:24', '2026-07-07 03:31:09', 0),
	(146, 82, 1, 'Marca Negra', 95, 30.00, 2850.00, 0.60, 1710.00, 'Entregado', 1, '2026-07-07 03:31:09', '2026-07-08 03:44:15', 0),
	(147, 80, 1, 'Marca Negra', 95, 30.00, 2850.00, 0.60, 1710.00, 'Transbordado', 1, '2026-07-07 03:31:09', '2026-07-07 03:31:09', 0),
	(148, 82, 2, 'Marca Negra', 16, 45.00, 720.00, 0.60, 432.00, 'Entregado', 1, '2026-07-07 03:31:09', '2026-07-08 03:44:15', 0),
	(149, 80, 2, 'Marca Negra', 16, 45.00, 720.00, 0.60, 432.00, 'Transbordado', 1, '2026-07-07 03:31:09', '2026-07-07 03:31:09', 0),
	(150, 83, 6, 'Sin Marca', 1, 500.00, 500.00, 1.00, 500.00, 'Entregado', 1, '2026-07-07 03:31:09', '2026-07-08 03:44:17', 0),
	(151, 84, 2, 'Marca Verde', 1, 50.00, 50.00, 0.40, 20.00, 'Siniestrado', 1, '2026-07-09 02:07:50', '2026-07-09 03:04:37', 1),
	(152, 84, 7, 'Marca Verde', 1, 40.00, 40.00, 0.40, 16.00, 'Siniestrado', 1, '2026-07-09 02:07:50', '2026-07-09 03:04:37', 1),
	(153, 85, 9, 'Sin Marca', 5, 300.00, 1500.00, 1.00, 1500.00, 'Transbordado', 1, '2026-07-09 02:07:50', '2026-07-09 03:04:37', 0),
	(154, 86, 2, 'Marca Verde', 8, 50.00, 400.00, 0.40, 160.00, 'Entregado', 1, '2026-07-09 03:04:37', '2026-07-09 03:05:35', 0),
	(155, 84, 2, 'Marca Verde', 9, 50.00, 450.00, 0.40, 180.00, 'Transbordado', 1, '2026-07-09 03:04:37', '2026-07-09 03:04:37', 0),
	(156, 86, 7, 'Marca Verde', 99, 40.00, 3960.00, 0.40, 1584.00, 'Entregado', 1, '2026-07-09 03:04:37', '2026-07-09 03:05:35', 0),
	(157, 84, 7, 'Marca Verde', 99, 40.00, 3960.00, 0.40, 1584.00, 'Transbordado', 1, '2026-07-09 03:04:37', '2026-07-09 03:04:37', 0),
	(158, 87, 9, 'Sin Marca', 5, 300.00, 1500.00, 1.00, 1500.00, 'Normal', 1, '2026-07-09 03:04:37', '2026-07-09 03:04:37', 0),
	(159, 86, 2, 'Marca Verde', 1, 50.00, 50.00, 0.40, 20.00, 'Rechazado', 1, '2026-07-09 03:05:35', '2026-07-09 07:21:27', 0),
	(160, 88, 5, 'Marca Negra', 100, 40.00, 4000.00, 0.50, 2000.00, 'Normal', 1, '2026-07-09 07:29:03', '2026-07-09 07:29:03', 0),
	(161, 88, 4, 'Marca Negra', 100, 20.00, 2000.00, 0.50, 1000.00, 'Normal', 1, '2026-07-09 07:29:03', '2026-07-09 07:29:03', 0),
	(162, 89, 1, 'Rafia Morada', 100, 100.00, 10000.00, 0.50, 5000.00, 'Normal', 1, '2026-07-09 07:29:03', '2026-07-09 07:29:03', 0);

-- Volcando estructura para tabla joselitobd.detalle_liquidacion_pago
CREATE TABLE IF NOT EXISTS `detalle_liquidacion_pago` (
  `id_detalle_pago` int NOT NULL AUTO_INCREMENT,
  `id_liquidacion` int NOT NULL,
  `metodo_pago` varchar(50) NOT NULL COMMENT 'Efectivo, Transferencia, Depósito, Billetera Digital',
  `id_cuenta` int DEFAULT NULL COMMENT 'Cuenta bancaria afectada (Nulo si es Efectivo o Billetera Independiente)',
  `id_billetera` int DEFAULT NULL COMMENT 'Billetera digital afectada',
  `monto_pagado` decimal(10,2) NOT NULL,
  `numero_operacion` varchar(100) DEFAULT NULL,
  `evidencia_url` varchar(255) DEFAULT NULL,
  `fecha_pago` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_detalle_pago`),
  KEY `fk_detalle_pago_liq` (`id_liquidacion`),
  KEY `fk_detalle_pago_cuenta` (`id_cuenta`),
  KEY `fk_detalle_pago_billetera` (`id_billetera`),
  CONSTRAINT `fk_detalle_pago_billetera` FOREIGN KEY (`id_billetera`) REFERENCES `billetera_digital` (`id_billetera`) ON DELETE RESTRICT,
  CONSTRAINT `fk_detalle_pago_cuenta` FOREIGN KEY (`id_cuenta`) REFERENCES `cuenta_bancaria` (`id_cuenta`) ON DELETE RESTRICT,
  CONSTRAINT `fk_detalle_pago_liq` FOREIGN KEY (`id_liquidacion`) REFERENCES `liquidacion_viaje` (`id_liquidacion`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla joselitobd.detalle_liquidacion_pago: ~12 rows (aproximadamente)
INSERT INTO `detalle_liquidacion_pago` (`id_detalle_pago`, `id_liquidacion`, `metodo_pago`, `id_cuenta`, `id_billetera`, `monto_pagado`, `numero_operacion`, `evidencia_url`, `fecha_pago`) VALUES
	(1, 10, 'Billetera Digital', NULL, 7, 200.00, '69696767', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1783188711/sistema_joselito/comprobantes/voucher_1783188711249.jpg', '2026-07-04 18:11:52'),
	(2, 10, 'Efectivo', NULL, NULL, 332.50, NULL, NULL, '2026-07-04 18:11:52'),
	(3, 11, 'Efectivo', NULL, NULL, 500.00, NULL, NULL, '2026-07-04 20:22:39'),
	(4, 11, 'Billetera Digital', NULL, 2, 3000.00, '81238128', NULL, '2026-07-04 20:22:39'),
	(5, 11, 'Transferencia', 3, NULL, 598.00, '12312312', NULL, '2026-07-04 20:22:39'),
	(6, 12, 'Transferencia', 3, NULL, 1000.00, '11111111', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1783214352/sistema_joselito/comprobantes/voucher_1783214352255.jpg', '2026-07-05 01:19:13'),
	(7, 12, 'Efectivo', NULL, NULL, 685.50, NULL, NULL, '2026-07-05 01:19:13'),
	(8, 13, 'Transferencia', 9, NULL, 1657.80, '12345678', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1783222044/sistema_joselito/comprobantes/voucher_1783222044826.jpg', '2026-07-05 03:27:26'),
	(9, 14, 'Depósito', NULL, NULL, 5000.00, 'OP-12345678', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1783276289/sistema_joselito/comprobantes/voucher_1783276288306.png', '2026-07-05 18:31:30'),
	(10, 15, 'Efectivo', NULL, NULL, 40.00, NULL, NULL, '2026-07-10 00:32:14'),
	(11, 16, 'Efectivo', NULL, NULL, 823.00, NULL, NULL, '2026-07-10 00:59:12'),
	(12, 17, 'Billetera Digital', NULL, 3, 1628.00, '6767877', NULL, '2026-07-10 01:17:07');

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
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.detalle_liquidacion_penalidad: ~12 rows (aproximadamente)
INSERT INTO `detalle_liquidacion_penalidad` (`id_detalle_liq`, `id_liquidacion`, `id_incidencia`, `monto_descontado`) VALUES
	(2, 2, 5, 300.00),
	(3, 4, 1, 271.00),
	(4, 5, 1, 225.00),
	(5, 7, 1, 1604.00),
	(6, 8, 7, 400.00),
	(7, 12, 8, 150.00),
	(8, 13, 8, 150.00),
	(9, 14, 7, 100.00),
	(10, 14, 9, 300.00),
	(11, 15, 21, 500.00),
	(12, 16, 7, 600.00),
	(13, 16, 17, 350.00);

-- Volcando estructura para tabla joselitobd.detalle_pago_indemnizacion
CREATE TABLE IF NOT EXISTS `detalle_pago_indemnizacion` (
  `id_detalle_pago` int NOT NULL AUTO_INCREMENT,
  `id_pago` int NOT NULL,
  `metodo_pago` enum('Efectivo','Transferencia','Depósito','Billetera Digital') NOT NULL,
  `id_cuenta` int DEFAULT NULL,
  `id_billetera` int DEFAULT NULL,
  `monto_pagado` decimal(10,2) NOT NULL,
  `numero_operacion` varchar(100) DEFAULT NULL,
  `evidencia_url` varchar(255) DEFAULT NULL,
  `fecha_pago` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_detalle_pago`),
  KEY `fk_dpi_pago` (`id_pago`),
  KEY `fk_dpi_cuenta` (`id_cuenta`),
  KEY `fk_dpi_billetera` (`id_billetera`),
  CONSTRAINT `fk_dpi_billetera` FOREIGN KEY (`id_billetera`) REFERENCES `billetera_digital` (`id_billetera`),
  CONSTRAINT `fk_dpi_cuenta` FOREIGN KEY (`id_cuenta`) REFERENCES `cuenta_bancaria` (`id_cuenta`),
  CONSTRAINT `fk_dpi_pago` FOREIGN KEY (`id_pago`) REFERENCES `pago_indemnizacion` (`id_pago`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla joselitobd.detalle_pago_indemnizacion: ~0 rows (aproximadamente)
INSERT INTO `detalle_pago_indemnizacion` (`id_detalle_pago`, `id_pago`, `metodo_pago`, `id_cuenta`, `id_billetera`, `monto_pagado`, `numero_operacion`, `evidencia_url`, `fecha_pago`) VALUES
	(3, 12, 'Billetera Digital', NULL, 7, 100.00, '0001234', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1784217534/sistema_joselito/comprobantes/voucher_1784217532370.jpg', '2026-07-16 15:58:53'),
	(5, 14, 'Efectivo', NULL, NULL, 280.00, NULL, NULL, '2026-07-16 18:48:12'),
	(6, 14, 'Transferencia', 9, NULL, 200.00, '001122', NULL, '2026-07-16 18:48:12'),
	(7, 15, 'Efectivo', NULL, NULL, 60.00, NULL, NULL, '2026-07-16 21:23:30'),
	(8, 15, 'Transferencia', 9, NULL, 100.00, '00012304', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1784237011/sistema_joselito/comprobantes/voucher_1784237008857.jpg', '2026-07-16 21:23:30'),
	(9, 15, 'Transferencia', 3, NULL, 100.00, '00112233', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1784237011/sistema_joselito/comprobantes/voucher_1784237008857.jpg', '2026-07-16 21:23:30'),
	(10, 16, 'Efectivo', NULL, NULL, 500.00, NULL, NULL, '2026-07-16 21:32:35');

-- Volcando estructura para tabla joselitobd.entidad_financiera
CREATE TABLE IF NOT EXISTS `entidad_financiera` (
  `id_entidad` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `tipo_entidad` enum('Banco','Caja Municipal','Financiera') NOT NULL,
  `color_primario` varchar(7) DEFAULT NULL,
  `color_fondo` varchar(7) DEFAULT NULL,
  `estado` tinyint DEFAULT '1',
  PRIMARY KEY (`id_entidad`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla joselitobd.entidad_financiera: ~8 rows (aproximadamente)
INSERT INTO `entidad_financiera` (`id_entidad`, `nombre`, `tipo_entidad`, `color_primario`, `color_fondo`, `estado`) VALUES
	(1, 'BCP', 'Banco', '#f97316', '#fff7ed', 1),
	(2, 'Interbank', 'Banco', '#16a34a', '#f0fdf4', 1),
	(3, 'BBVA', 'Banco', '#2563eb', '#eff6ff', 1),
	(4, 'Scotiabank', 'Banco', '#ef4444', '#fef2f2', 1),
	(5, 'BanBif', 'Banco', '#0ea5e9', '#f0f9ff', 1),
	(6, 'Caja Piura', 'Caja Municipal', '#84cc16', '#f7fee7', 1),
	(7, 'Caja Sullana', 'Caja Municipal', '#eab308', '#fefce8', 1),
	(8, 'Caja Arequipa', 'Caja Municipal', '#dc2626', '#fef2f2', 1),
	(9, 'Caja Interna', 'Financiera', '#10b981', '#ecfdf5', 1);

-- Volcando estructura para tabla joselitobd.incidencia_detalle_carga
CREATE TABLE IF NOT EXISTS `incidencia_detalle_carga` (
  `id_incidencia` int NOT NULL,
  `id_detalle` int NOT NULL,
  `precio_unitario_acordado` decimal(10,2) DEFAULT '0.00',
  `subtotal_indemnizar` decimal(10,2) DEFAULT '0.00',
  `estado_pago_cliente` enum('Pendiente','Pagado') DEFAULT 'Pendiente',
  PRIMARY KEY (`id_incidencia`,`id_detalle`),
  KEY `fk_idc_detalle` (`id_detalle`),
  CONSTRAINT `fk_idc_detalle` FOREIGN KEY (`id_detalle`) REFERENCES `detalle_carga` (`id_detalle`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_idc_incidencia` FOREIGN KEY (`id_incidencia`) REFERENCES `incidencia_viaje` (`id_incidencia`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla joselitobd.incidencia_detalle_carga: ~7 rows (aproximadamente)
INSERT INTO `incidencia_detalle_carga` (`id_incidencia`, `id_detalle`, `precio_unitario_acordado`, `subtotal_indemnizar`, `estado_pago_cliente`) VALUES
	(12, 141, 85.00, 8500.00, 'Pendiente'),
	(13, 133, 85.00, 1275.00, 'Pendiente'),
	(14, 143, 100.00, 500.00, 'Pendiente'),
	(16, 144, 120.00, 480.00, 'Pagado'),
	(17, 134, 35.00, 140.00, 'Pagado'),
	(17, 135, 60.00, 120.00, 'Pagado'),
	(20, 159, 100.00, 100.00, 'Pendiente');

-- Volcando estructura para tabla joselitobd.incidencia_viaje
CREATE TABLE IF NOT EXISTS `incidencia_viaje` (
  `id_incidencia` int NOT NULL AUTO_INCREMENT,
  `id_viaje` int NOT NULL,
  `id_carga` int DEFAULT NULL,
  `tipo_incidencia` enum('Retraso en Ruta','Daño / Mala Estiba','Faltante / Pérdida / Robo','Accidente','Falla Mecánica','Queja de Cliente / Administrativo','Otro') COLLATE utf8mb4_general_ci NOT NULL,
  `descripcion_detallada` text COLLATE utf8mb4_general_ci NOT NULL,
  `valor_total_perdida` decimal(10,2) DEFAULT '0.00' COMMENT 'Calculado por el sistema: Fletes perdidos',
  `valor_indemnizar` decimal(10,2) DEFAULT '0.00',
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
  KEY `fk_incidencia_carga` (`id_carga`),
  CONSTRAINT `fk_incidencia_carga` FOREIGN KEY (`id_carga`) REFERENCES `carga` (`id_carga`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_incidencia_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_incidencia_viaje` FOREIGN KEY (`id_viaje`) REFERENCES `viaje` (`id_viaje`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.incidencia_viaje: ~19 rows (aproximadamente)
INSERT INTO `incidencia_viaje` (`id_incidencia`, `id_viaje`, `id_carga`, `tipo_incidencia`, `descripcion_detallada`, `valor_total_perdida`, `valor_indemnizar`, `gastos_adicionales`, `adelanto_recuperar`, `monto_asumido_empresa`, `monto_descuento_chofer`, `monto_cobrado`, `estado_cobro_penalidad`, `id_usuario`, `estado`, `fecha_creacion`, `fecha_actualizacion`) VALUES
	(1, 13, NULL, 'Falla Mecánica', 'Rotura de motor a la altura de Huarmey. El camión quedó inoperativo. Se contrató un camión externo de emergencia para hacer el transbordo de la mercadería y cumplir con el cliente. Las cargas de este viaje original se anulan, y se genera el gasto extra del remolque/transbordo.', 2100.00, 0.00, 500.00, 0.00, 500.00, 2100.00, 2100.00, 'Cobrado', 2, 1, '2026-06-10 04:06:21', '2026-06-30 16:17:38'),
	(2, 13, NULL, 'Otro', 'Pago de cochera temporal en la ciudad de Huarmey por resguardo del camión accidentado mientras se realizaba el transbordo.', 0.00, 0.00, 150.00, 0.00, 150.00, 0.00, 0.00, 'Pendiente', 2, 1, '2026-06-10 04:22:10', '2026-06-10 04:22:10'),
	(3, 8, NULL, 'Daño / Mala Estiba', 'El chofer frenó bruscamente cerca a Trujillo, provocando la caída y daño total de los productos de la Carga 1 y Carga 2. El chofer asume la responsabilidad de esta mercadería.', 1495.00, 0.00, 0.00, 0.00, 0.00, 1495.00, 0.00, 'Pendiente', 2, 1, '2026-06-10 04:31:24', '2026-07-06 23:41:32'),
	(4, 8, NULL, 'Daño / Mala Estiba', 'La Carga 3 llegó aplastada. Tras revisar las cámaras de Lima, se determinó que los estibadores de la empresa colocaron pallets muy pesados sobre mercadería frágil. Error de almacén.', 750.00, 0.00, 0.00, 0.00, 750.00, 0.00, 0.00, 'Pendiente', 2, 1, '2026-06-10 04:32:05', '2026-07-06 23:41:32'),
	(5, 15, NULL, 'Falla Mecánica', 'Llantas malogradas', 0.00, 0.00, 300.00, 0.00, 0.00, 300.00, 300.00, 'Cobrado', 2, 1, '2026-06-24 05:40:49', '2026-06-24 05:57:29'),
	(6, 13, NULL, 'Falla Mecánica', 'prueba as', 0.00, 0.00, 13.00, 0.00, 13.00, 0.00, 0.00, 'Pendiente', 2, 1, '2026-06-26 06:30:17', '2026-06-26 06:30:17'),
	(7, 9, NULL, 'Falla Mecánica', 'El camión tuvo un accidente en Casma, el chofer se durmió en la ruta causando la volcadura de la unidad', 720.00, 0.00, 200.00, 300.00, 120.00, 1100.00, 1100.00, 'Cobrado', 2, 1, '2026-06-26 15:31:20', '2026-07-10 00:59:12'),
	(8, 20, NULL, 'Falla Mecánica', 'El camión tuvo un problema con el motor que lo dejo varado en Huarmey, las gastos adicionales es por el precio de transbordar los productos y se esta recuperando parte del adelanto dado al transportista.', 0.00, 0.00, 100.00, 500.00, 300.00, 300.00, 300.00, 'Cobrado', 2, 1, '2026-06-26 15:37:57', '2026-07-05 03:27:26'),
	(9, 30, NULL, 'Retraso en Ruta', 'El chofer se quedo dormido', 1454.00, 0.00, 0.00, 0.00, 0.00, 1454.00, 300.00, 'Cobrado Parcial', 2, 1, '2026-07-05 06:51:26', '2026-07-05 18:31:30'),
	(10, 30, NULL, 'Daño / Mala Estiba', 'Al abrir la puerta del camión la malla cayo al suelo de gran altura ocasionando que el cliente ya no quiera recibirlo', 12.50, 0.00, 0.00, 0.00, 12.50, 0.00, 0.00, 'Pendiente', 2, 1, '2026-07-05 06:52:48', '2026-07-06 23:41:32'),
	(11, 34, NULL, 'Accidente', 'Un estibador daño la puerta del camión, el precio es el costo de la reparación', 0.00, 0.00, 140.00, 0.00, 140.00, 0.00, 0.00, 'Pendiente', 2, 1, '2026-07-05 07:24:33', '2026-07-05 07:24:33'),
	(12, 33, 78, 'Daño / Mala Estiba', 'Test de validaciones del formulario', 1800.00, 8500.00, 0.00, 0.00, 8500.00, 1800.00, 0.00, 'Pendiente', 2, 1, '2026-07-07 00:39:43', '2026-07-07 00:39:43'),
	(13, 31, 75, 'Daño / Mala Estiba', 'test otro viaje culpa 100% del transportista', 544.80, 1275.00, 0.00, 0.00, 0.00, 1819.80, 0.00, 'Pendiente', 2, 1, '2026-07-07 00:43:02', '2026-07-07 00:43:02'),
	(14, 35, 80, 'Accidente', 'El camión se volteo en Casma', 90.00, 500.00, 0.00, 0.00, 0.00, 590.00, 0.00, 'Pendiente', 2, 1, '2026-07-07 15:50:17', '2026-07-07 15:50:17'),
	(15, 35, NULL, 'Accidente', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.', 0.00, 0.00, 0.00, 500.00, 0.00, 500.00, 0.00, 'Pendiente', 2, 1, '2026-07-07 18:25:16', '2026-07-07 18:25:16'),
	(16, 35, 80, 'Accidente', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.', 108.00, 480.00, 0.00, 0.00, 108.00, 480.00, 0.00, 'Pendiente', 2, 1, '2026-07-07 18:27:14', '2026-07-07 18:27:14'),
	(17, 31, 76, 'Daño / Mala Estiba', 'El chofer ha frenado bruscamente durante la ruta ocasionando que las cajas de manzana y de piña golden se caigan y aplasten.', 102.40, 260.00, 0.00, 0.00, 12.40, 350.00, 350.00, 'Cobrado', 2, 1, '2026-07-08 17:01:46', '2026-07-10 00:59:12'),
	(18, 37, NULL, 'Accidente', 'El transportista se quedo sin frenos y se tuvo que arenar para poder detenerse. Se va a poner una penalidad por no haber revisado el estado de su unidad antes de ofrecer su servicio', 0.00, 0.00, 400.00, 400.00, 0.00, 800.00, 0.00, 'Pendiente', 2, 1, '2026-07-09 07:13:03', '2026-07-09 07:13:03'),
	(19, 16, NULL, 'Accidente', 'Lorem', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'Pendiente', 2, 1, '2026-07-09 07:19:15', '2026-07-09 07:19:15'),
	(20, 38, 86, 'Daño / Mala Estiba', 'Cargaron mal el saco en la ciudad de origen, la empresa asume todos los gastos no se le cobra nada al transportista', 20.00, 100.00, 0.00, 0.00, 120.00, 0.00, 0.00, 'Pendiente', 2, 1, '2026-07-09 07:21:27', '2026-07-09 07:21:27'),
	(21, 17, NULL, 'Accidente', 'Se le adjunta una penalidad por la gran cantidad de producto perdidos', 0.00, 0.00, 500.00, 0.00, 0.00, 500.00, 500.00, 'Cobrado', 2, 1, '2026-07-09 07:26:13', '2026-07-10 00:32:14'),
	(22, 26, NULL, 'Accidente', 'Multa por las 60 unidades dañadas', 0.00, 0.00, 100.00, 0.00, 0.00, 100.00, 0.00, 'Pendiente', 2, 1, '2026-07-09 07:31:08', '2026-07-09 07:31:08');

-- Volcando estructura para tabla joselitobd.liquidacion_viaje
CREATE TABLE IF NOT EXISTS `liquidacion_viaje` (
  `id_liquidacion` int NOT NULL AUTO_INCREMENT,
  `id_viaje` int NOT NULL COMMENT 'Un viaje solo se liquida una vez',
  `id_usuario` int NOT NULL COMMENT 'Usuario administrador que procesó el pago',
  `monto_bruto` decimal(10,2) NOT NULL,
  `total_adelantos` decimal(10,2) DEFAULT '0.00' COMMENT 'Suma de adelantos descontados',
  `total_penalidades` decimal(10,2) DEFAULT '0.00' COMMENT 'Suma de penalidades descontadas en este pago',
  `monto_neto_pagado` decimal(10,2) NOT NULL COMMENT 'Lo que el chofer recibe en mano/banco',
  `observaciones` text COLLATE utf8mb4_general_ci,
  `estado` tinyint(1) DEFAULT '1' COMMENT '1: Activa, 0: Anulada',
  `fecha_liquidacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_liquidacion`),
  UNIQUE KEY `id_viaje` (`id_viaje`),
  KEY `fk_liquidacion_usuario` (`id_usuario`),
  CONSTRAINT `fk_liquidacion_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_liquidacion_viaje` FOREIGN KEY (`id_viaje`) REFERENCES `viaje` (`id_viaje`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.liquidacion_viaje: ~16 rows (aproximadamente)
INSERT INTO `liquidacion_viaje` (`id_liquidacion`, `id_viaje`, `id_usuario`, `monto_bruto`, `total_adelantos`, `total_penalidades`, `monto_neto_pagado`, `observaciones`, `estado`, `fecha_liquidacion`) VALUES
	(2, 1, 2, 306.00, 0.00, 300.00, 6.00, 'Se le realizo el descuento de 300 soles por la penalidad del viaje numero 15', 1, '2026-06-24 05:57:29'),
	(3, 12, 2, 4050.00, 0.00, 0.00, 4050.00, 'Se yapeo los 4050 soles', 1, '2026-06-24 06:16:18'),
	(4, 2, 2, 271.00, 0.00, 271.00, 0.00, '', 1, '2026-06-24 06:53:36'),
	(5, 4, 2, 225.00, 0.00, 225.00, 0.00, '', 1, '2026-06-24 06:54:25'),
	(6, 3, 2, 2590.20, 0.00, 0.00, 2590.20, 'Se realizo un yapeo del monto total', 1, '2026-06-26 04:02:07'),
	(7, 32, 2, 4500.00, 800.00, 1604.00, 2096.00, NULL, 1, '2026-06-30 16:17:38'),
	(8, 5, 2, 2160.00, 0.00, 400.00, 1760.00, NULL, 1, '2026-07-02 23:52:23'),
	(9, 6, 2, 156.00, 0.00, 0.00, 156.00, 'El camionero solicito que se le haga un deposito porque se tuvo que ir rápidamente', 1, '2026-07-03 22:39:47'),
	(10, 7, 2, 532.50, 0.00, 0.00, 532.50, 'Se hizo un pago mixto del yape de tal persona para dejarla en 0 y el resto del monto fue pagado en efectivo', 1, '2026-07-04 18:11:52'),
	(11, 8, 2, 4098.00, 0.00, 0.00, 4098.00, NULL, 1, '2026-07-04 20:22:39'),
	(12, 10, 2, 1835.50, 0.00, 150.00, 1685.50, 'Se le pago una parte mediante transferencia y la otra parte en efectivo porque el chofer lo solicito', 1, '2026-07-05 01:19:13'),
	(13, 14, 2, 1807.80, 0.00, 150.00, 1657.80, 'Se realizo la transferencia del monto neto a pagar a la cuenta del chofer desde la cuenta de banbif', 1, '2026-07-05 03:27:26'),
	(14, 34, 2, 5400.00, 0.00, 400.00, 5000.00, 'El chofer solicito una transferencia, pero como no había internet se saco de la caja el efectivo para realizar el deposito a la cuenta del chofer', 1, '2026-07-05 18:31:30'),
	(15, 25, 2, 540.00, 0.00, 500.00, 40.00, 'Se hizo un descuento de la penalidad que tuvo y solo se pago 40 soles', 1, '2026-07-10 00:32:14'),
	(16, 38, 2, 1773.00, 0.00, 950.00, 823.00, NULL, 1, '2026-07-10 00:59:12'),
	(17, 36, 2, 1628.00, 0.00, 0.00, 1628.00, NULL, 1, '2026-07-10 01:17:07');

-- Volcando estructura para tabla joselitobd.movimiento_caja
CREATE TABLE IF NOT EXISTS `movimiento_caja` (
  `id_movimiento` int NOT NULL AUTO_INCREMENT,
  `tipo_movimiento` enum('INGRESO','EGRESO','TRANSFERENCIA') NOT NULL,
  `concepto` varchar(255) NOT NULL COMMENT 'Breve descripcion del movimiento',
  `monto` decimal(10,2) NOT NULL,
  `metodo_pago` enum('Efectivo','Transferencia','Depósito','Billetera Digital') NOT NULL,
  `id_cuenta_origen` int DEFAULT NULL COMMENT 'Cuenta de donde sale el dinero. Nulo si es Ingreso externo',
  `id_billetera_origen` int DEFAULT NULL COMMENT 'Billetera de donde sale el dinero. Nulo si es Ingreso externo',
  `id_cuenta_destino` int DEFAULT NULL COMMENT 'Cuenta adonde llega el dinero. Nulo si es Egreso externo',
  `id_billetera_destino` int DEFAULT NULL COMMENT 'Billetera adonde llega el dinero. Nulo si es Egreso externo',
  `modulo_origen` enum('LIQUIDACION','COBRO_FLETE','GASTO_OPERATIVO','TRANSFERENCIA_INTERNA','MANUAL','ADELANTOS','SINIESTROS','GASTOS_ADMINISTRATIVOS') NOT NULL,
  `id_registro_origen` int DEFAULT NULL COMMENT 'ID foráneo dependiendo del módulo origen. Ej: id_liquidacion',
  `numero_operacion` varchar(100) DEFAULT NULL,
  `fecha_movimiento` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `id_usuario` int NOT NULL COMMENT 'Usuario que registró el movimiento',
  `estado` tinyint(1) DEFAULT '1' COMMENT '1: Activo, 0: Anulado',
  PRIMARY KEY (`id_movimiento`),
  KEY `id_cuenta_origen` (`id_cuenta_origen`),
  KEY `id_billetera_origen` (`id_billetera_origen`),
  KEY `id_cuenta_destino` (`id_cuenta_destino`),
  KEY `id_billetera_destino` (`id_billetera_destino`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `movimiento_caja_ibfk_1` FOREIGN KEY (`id_cuenta_origen`) REFERENCES `cuenta_bancaria` (`id_cuenta`) ON DELETE RESTRICT,
  CONSTRAINT `movimiento_caja_ibfk_2` FOREIGN KEY (`id_billetera_origen`) REFERENCES `billetera_digital` (`id_billetera`) ON DELETE RESTRICT,
  CONSTRAINT `movimiento_caja_ibfk_3` FOREIGN KEY (`id_cuenta_destino`) REFERENCES `cuenta_bancaria` (`id_cuenta`) ON DELETE RESTRICT,
  CONSTRAINT `movimiento_caja_ibfk_4` FOREIGN KEY (`id_billetera_destino`) REFERENCES `billetera_digital` (`id_billetera`) ON DELETE RESTRICT,
  CONSTRAINT `movimiento_caja_ibfk_5` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=72 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla joselitobd.movimiento_caja: ~45 rows (aproximadamente)
INSERT INTO `movimiento_caja` (`id_movimiento`, `tipo_movimiento`, `concepto`, `monto`, `metodo_pago`, `id_cuenta_origen`, `id_billetera_origen`, `id_cuenta_destino`, `id_billetera_destino`, `modulo_origen`, `id_registro_origen`, `numero_operacion`, `fecha_movimiento`, `id_usuario`, `estado`) VALUES
	(1, 'EGRESO', 'Liquidación de viaje #7 (Billetera Digital)', 200.00, 'Billetera Digital', NULL, 7, NULL, NULL, 'LIQUIDACION', 10, '69696767', '2026-07-04 18:11:52', 2, 1),
	(2, 'EGRESO', 'Liquidación de viaje #7 (Efectivo)', 332.50, 'Efectivo', 11, NULL, NULL, NULL, 'LIQUIDACION', 10, NULL, '2026-07-04 18:11:52', 2, 1),
	(3, 'EGRESO', 'Liquidación de viaje #8 (Efectivo)', 500.00, 'Efectivo', 11, NULL, NULL, NULL, 'LIQUIDACION', 11, NULL, '2026-07-04 20:22:39', 2, 1),
	(4, 'EGRESO', 'Liquidación de viaje #8 (Billetera Digital)', 3000.00, 'Billetera Digital', NULL, 2, NULL, NULL, 'LIQUIDACION', 11, '81238128', '2026-07-04 20:22:39', 2, 1),
	(5, 'EGRESO', 'Liquidación de viaje #8 (Transferencia)', 598.00, 'Transferencia', 3, NULL, NULL, NULL, 'LIQUIDACION', 11, '12312312', '2026-07-04 20:22:39', 2, 1),
	(6, 'EGRESO', 'Liquidación de viaje #10 (Transferencia)', 1000.00, 'Transferencia', 3, NULL, NULL, NULL, 'LIQUIDACION', 12, '11111111', '2026-07-05 01:19:13', 2, 1),
	(7, 'EGRESO', 'Liquidación de viaje #10 (Efectivo)', 685.50, 'Efectivo', 11, NULL, NULL, NULL, 'LIQUIDACION', 12, NULL, '2026-07-05 01:19:13', 2, 1),
	(8, 'EGRESO', 'Liquidación de viaje #14 (Transferencia)', 1657.80, 'Transferencia', 9, NULL, NULL, NULL, 'LIQUIDACION', 13, '12345678', '2026-07-05 03:27:26', 2, 1),
	(9, 'EGRESO', 'Liquidación de viaje #34 (Depósito)', 5000.00, 'Depósito', 11, NULL, NULL, NULL, 'LIQUIDACION', 14, 'OP-12345678', '2026-07-05 18:31:30', 2, 1),
	(10, 'INGRESO', 'Cobro de Carga #86', 500.00, 'Efectivo', NULL, NULL, 11, NULL, 'COBRO_FLETE', 18, NULL, '2026-07-09 23:04:16', 1, 0),
	(11, 'INGRESO', 'Cobro de Carga #86', 500.00, 'Efectivo', NULL, NULL, 11, NULL, 'COBRO_FLETE', 19, NULL, '2026-07-09 23:06:00', 1, 1),
	(12, 'INGRESO', 'Cobro de Carga #86', 500.00, 'Transferencia', NULL, NULL, 3, NULL, 'COBRO_FLETE', 20, '999111000', '2026-07-09 23:06:00', 1, 1),
	(13, 'INGRESO', 'Cobro de Carga #83', 100.00, 'Efectivo', NULL, NULL, 11, NULL, 'COBRO_FLETE', 21, NULL, '2026-07-09 23:16:51', 1, 1),
	(14, 'INGRESO', 'Cobro de Carga #74', 300.00, 'Efectivo', NULL, NULL, 11, NULL, 'COBRO_FLETE', 22, NULL, '2026-07-09 23:30:16', 1, 0),
	(15, 'INGRESO', 'Cobro de Carga #86', 244.00, 'Billetera Digital', NULL, NULL, NULL, 1, 'COBRO_FLETE', 23, '999333555', '2026-07-09 23:46:35', 1, 1),
	(16, 'INGRESO', 'Cobro de Carga #83', 500.00, 'Efectivo', NULL, NULL, 11, NULL, 'COBRO_FLETE', 24, NULL, '2026-07-09 23:48:42', 1, 0),
	(17, 'EGRESO', 'Liquidación de viaje #25 (Efectivo)', 40.00, 'Efectivo', 11, NULL, NULL, NULL, 'LIQUIDACION', 15, NULL, '2026-07-10 00:32:14', 2, 1),
	(18, 'EGRESO', 'Liquidación de viaje #38 (Efectivo)', 823.00, 'Efectivo', 11, NULL, NULL, NULL, 'LIQUIDACION', 16, NULL, '2026-07-10 00:59:12', 2, 1),
	(19, 'EGRESO', 'Liquidación de viaje #36 (Billetera Digital)', 1628.00, 'Billetera Digital', 5, 3, NULL, NULL, 'LIQUIDACION', 17, '6767877', '2026-07-10 01:17:07', 2, 1),
	(20, 'INGRESO', 'Cobro de Carga #83', 200.00, 'Billetera Digital', NULL, NULL, NULL, 3, 'COBRO_FLETE', 25, '878700', '2026-07-10 01:18:29', 1, 1),
	(21, 'INGRESO', 'Cobro de Carga #83', 200.00, 'Billetera Digital', NULL, NULL, 5, 3, 'COBRO_FLETE', 26, '99119955', '2026-07-10 01:34:51', 1, 1),
	(23, 'EGRESO', 'Adelanto a transportista - Viaje #39', 200.00, 'Transferencia', 3, NULL, NULL, NULL, 'ADELANTOS', 14, '999111222333', '2026-07-14 04:57:41', 2, 1),
	(26, 'INGRESO', 'Saldo de Apertura de Cuenta', 1000.00, 'Transferencia', NULL, NULL, 13, NULL, 'MANUAL', 13, NULL, '2026-07-14 07:06:56', 2, 1),
	(30, 'EGRESO', 'Traslado de saldo por inactivación - Cuenta #13', 1000.00, 'Transferencia', 13, NULL, NULL, NULL, 'TRANSFERENCIA_INTERNA', 13, NULL, '2026-07-14 15:51:35', 2, 1),
	(31, 'INGRESO', 'Traslado de saldo recibido por inactivación de cuenta #13', 1000.00, 'Transferencia', NULL, NULL, 11, NULL, 'TRANSFERENCIA_INTERNA', 13, NULL, '2026-07-14 15:51:35', 2, 1),
	(32, 'INGRESO', 'Cobro de Carga #3', 832.00, 'Efectivo', NULL, NULL, 11, NULL, 'COBRO_FLETE', 27, NULL, '2026-07-14 15:52:14', 1, 1),
	(33, 'INGRESO', 'Cobro de Carga #4', 240.00, 'Efectivo', NULL, NULL, 11, NULL, 'COBRO_FLETE', 28, NULL, '2026-07-14 15:52:22', 1, 1),
	(34, 'INGRESO', 'Cobro de Carga #5', 392.40, 'Transferencia', NULL, NULL, 3, NULL, 'COBRO_FLETE', 29, '999222123', '2026-07-14 15:52:40', 1, 1),
	(35, 'INGRESO', 'Cobro de Carga #6', 1740.00, 'Efectivo', NULL, NULL, 11, NULL, 'COBRO_FLETE', 30, NULL, '2026-07-14 15:53:25', 1, 1),
	(36, 'INGRESO', 'Cobro de Carga #70', 4000.00, 'Efectivo', NULL, NULL, 11, NULL, 'COBRO_FLETE', 31, NULL, '2026-07-14 15:54:18', 1, 1),
	(37, 'INGRESO', 'Cobro de Carga #70', 987.50, 'Billetera Digital', NULL, NULL, 5, 3, 'COBRO_FLETE', 32, '67686960', '2026-07-14 15:54:18', 1, 1),
	(38, 'INGRESO', 'Cobro de Carga #75', 3087.20, 'Efectivo', NULL, NULL, 11, NULL, 'COBRO_FLETE', 33, NULL, '2026-07-14 15:54:30', 1, 1),
	(39, 'INGRESO', 'Cobro de Carga #76', 3577.60, 'Efectivo', NULL, NULL, 11, NULL, 'COBRO_FLETE', 34, NULL, '2026-07-14 15:54:33', 1, 1),
	(40, 'INGRESO', 'Cobro de Carga #69', 1500.00, 'Efectivo', NULL, NULL, 11, NULL, 'COBRO_FLETE', 35, NULL, '2026-07-14 15:54:41', 1, 1),
	(41, 'INGRESO', 'Cobro de Carga #60', 6300.00, 'Efectivo', NULL, NULL, 11, NULL, 'COBRO_FLETE', 36, NULL, '2026-07-14 15:54:51', 1, 1),
	(44, 'INGRESO', 'Cobro de Carga #83', 100.00, 'Transferencia', NULL, NULL, 9, NULL, 'COBRO_FLETE', 37, '1234321', '2026-07-14 16:12:05', 1, 1),
	(45, 'INGRESO', 'Cobro de Carga #82', 2142.00, 'Transferencia', NULL, NULL, 9, NULL, 'COBRO_FLETE', 38, '222111333', '2026-07-14 16:12:26', 1, 1),
	(46, 'INGRESO', 'Cobro de Carga #78', 2760.00, 'Transferencia', NULL, NULL, 3, NULL, 'COBRO_FLETE', 39, '44433322', '2026-07-14 16:13:36', 1, 1),
	(47, 'INGRESO', 'Cobro de Carga #74', 300.00, 'Billetera Digital', NULL, NULL, 5, 3, 'COBRO_FLETE', 40, '111666', '2026-07-14 16:14:06', 1, 1),
	(48, 'INGRESO', 'Cobro de Carga #73', 450.00, 'Billetera Digital', NULL, NULL, NULL, 7, 'COBRO_FLETE', 41, '543222', '2026-07-14 16:14:45', 1, 1),
	(49, 'INGRESO', 'Cobro de Carga #7', 304.00, 'Billetera Digital', NULL, NULL, NULL, 2, 'COBRO_FLETE', 42, '444333555', '2026-07-14 16:15:37', 1, 1),
	(50, 'INGRESO', 'Cobro de Carga #11', 2450.00, 'Billetera Digital', NULL, NULL, NULL, 2, 'COBRO_FLETE', 43, '543666', '2026-07-14 16:16:00', 1, 1),
	(51, 'INGRESO', 'Cobro de Carga #32', 1160.80, 'Billetera Digital', NULL, NULL, NULL, 2, 'COBRO_FLETE', 44, '543222', '2026-07-14 16:16:17', 1, 1),
	(58, 'EGRESO', 'Transferencia interna - Transferencia entre cuentas propias', 244.00, 'Billetera Digital', NULL, 1, NULL, NULL, 'TRANSFERENCIA_INTERNA', NULL, NULL, '2026-07-14 17:43:08', 2, 1),
	(59, 'INGRESO', 'Transferencia interna recibida - Transferencia entre cuentas propias', 244.00, 'Efectivo', NULL, NULL, 11, NULL, 'TRANSFERENCIA_INTERNA', 58, NULL, '2026-07-14 17:43:08', 2, 1),
	(60, 'EGRESO', 'Pago de local', 200.00, 'Efectivo', 11, NULL, NULL, NULL, 'MANUAL', NULL, NULL, '2026-07-14 17:44:16', 2, 1),
	(63, 'EGRESO', 'Indemnización a cliente #4 - Pago #12 (Billetera Digital)', 100.00, 'Billetera Digital', NULL, 7, NULL, NULL, 'SINIESTROS', 12, '0001234', '2026-07-16 15:58:53', 2, 0),
	(65, 'EGRESO', 'Indemnización a cliente #1 - Pago #14 (Efectivo)', 280.00, 'Efectivo', 11, NULL, NULL, NULL, 'SINIESTROS', 14, NULL, '2026-07-16 18:48:12', 2, 1),
	(66, 'EGRESO', 'Indemnización a cliente #1 - Pago #14 (Transferencia)', 200.00, 'Transferencia', 9, NULL, NULL, NULL, 'SINIESTROS', 14, '001122', '2026-07-16 18:48:12', 2, 1),
	(67, 'EGRESO', 'Indemnización a cliente #2 - Pago #15 (Efectivo)', 60.00, 'Efectivo', 11, NULL, NULL, NULL, 'SINIESTROS', 15, NULL, '2026-07-16 21:23:30', 2, 1),
	(68, 'EGRESO', 'Indemnización a cliente #2 - Pago #15 (Transferencia)', 100.00, 'Transferencia', 9, NULL, NULL, NULL, 'SINIESTROS', 15, '00012304', '2026-07-16 21:23:30', 2, 1),
	(69, 'EGRESO', 'Indemnización a cliente #2 - Pago #15 (Transferencia)', 100.00, 'Transferencia', 3, NULL, NULL, NULL, 'SINIESTROS', 15, '00112233', '2026-07-16 21:23:30', 2, 1),
	(70, 'EGRESO', 'Indemnización a cliente #2 - Pago #16 (Efectivo)', 500.00, 'Efectivo', 11, NULL, NULL, NULL, 'SINIESTROS', 16, NULL, '2026-07-16 21:32:35', 2, 0),
	(71, 'INGRESO', 'Cobro de Carga #86', 500.00, 'Efectivo', NULL, NULL, 11, NULL, 'COBRO_FLETE', 45, NULL, '2026-07-17 00:29:25', 1, 1);

-- Volcando estructura para tabla joselitobd.opciones
CREATE TABLE IF NOT EXISTS `opciones` (
  `id_opcion` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `ruta` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Identificador de la vista SPA para AJAX',
  `icono` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `categoria` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `orden` int NOT NULL DEFAULT '0',
  `estado` tinyint NOT NULL DEFAULT '1' COMMENT '0=inactivo, 1=activo, 2=eliminado',
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_opcion`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.opciones: ~13 rows (aproximadamente)
INSERT INTO `opciones` (`id_opcion`, `nombre`, `ruta`, `icono`, `categoria`, `orden`, `estado`, `fecha_creacion`, `fecha_actualizacion`) VALUES
	(1, 'Dashboard', 'dashboard', 'fas fa-home', NULL, 0, 1, '2026-05-08 05:04:23', '2026-05-08 05:04:23'),
	(2, 'Gestión de Usuarios', 'usuarios', 'fas fa-users', 'Administración', 10, 1, '2026-05-08 05:04:23', '2026-07-17 08:50:35'),
	(3, 'Gestión de Perfiles', 'perfiles', 'fas fa-id-card', 'Administración', 20, 1, '2026-05-08 05:04:23', '2026-07-17 08:50:35'),
	(4, 'Gestión de Opciones', 'opciones', 'fas fa-cogs', 'Administración', 30, 1, '2026-05-08 06:39:25', '2026-07-17 08:50:35'),
	(5, 'Gestión de Clientes', 'clientes', 'fas fa-users', 'Catálogos', 100, 1, '2026-05-12 13:40:07', '2026-07-17 08:50:35'),
	(6, 'Gestión de Productos', 'productos', 'fas fa-box', 'Catálogos', 110, 1, '2026-05-12 13:40:07', '2026-07-17 08:50:35'),
	(7, 'Gestión de Rutas', 'rutas', 'fas fa-route', 'Catálogos', 120, 1, '2026-05-20 06:03:24', '2026-07-17 08:50:35'),
	(8, 'Gestión de Camiones', 'camiones', 'fas fa-truck', 'Catálogos', 130, 1, '2026-05-20 06:12:11', '2026-07-17 08:50:35'),
	(9, 'Registro de Viajes', 'registro_viajes', 'fas fa-truck-loading', 'Operaciones', 200, 1, '2026-05-25 15:56:14', '2026-07-17 08:50:35'),
	(10, 'Historial de Viajes', 'historial_viajes', 'fas fa-history', 'Operaciones', 210, 1, '2026-05-29 02:11:22', '2026-07-17 08:50:35'),
	(11, 'Recepción y Entregas', 'recepcion_entregas', 'fas fa-dolly', 'Operaciones', 220, 1, '2026-06-05 17:47:04', '2026-07-17 08:50:35'),
	(12, 'Deudas por Cobrar', 'deudas_cobrar', 'fas fa-hand-holding-usd', 'Finanzas', 300, 1, '2026-06-11 01:04:19', '2026-07-17 08:50:35'),
	(13, 'Liquidación Choferes', 'liquidacion', 'fa-solid fa-money-bill', 'Finanzas', 310, 1, '2026-06-12 17:06:40', '2026-07-17 08:50:35'),
	(14, 'Cuentas Bancarias', 'cuentas_bancarias', 'fas fa-university', 'Finanzas', 320, 1, '2026-07-04 02:41:17', '2026-07-17 08:50:35'),
	(15, 'Dashboard Financiero', 'dashboard_financiero', 'fas fa-chart-pie', 'Finanzas', 330, 1, '2026-07-14 01:11:59', '2026-07-17 08:50:35'),
	(16, 'Indemnizaciones', 'indemnizaciones', 'fas fa-handshake', 'Finanzas', 340, 1, '2026-07-16 04:21:09', '2026-07-17 08:50:35');

-- Volcando estructura para tabla joselitobd.pago_carga
CREATE TABLE IF NOT EXISTS `pago_carga` (
  `id_pago` int NOT NULL AUTO_INCREMENT,
  `id_carga` int NOT NULL,
  `id_cuenta` int DEFAULT NULL,
  `id_billetera` int DEFAULT NULL,
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
  KEY `id_usuario` (`id_usuario`),
  KEY `pago_carga_fk_cuenta` (`id_cuenta`),
  KEY `pago_carga_fk_billetera` (`id_billetera`),
  CONSTRAINT `pago_carga_fk_billetera` FOREIGN KEY (`id_billetera`) REFERENCES `billetera_digital` (`id_billetera`),
  CONSTRAINT `pago_carga_fk_cuenta` FOREIGN KEY (`id_cuenta`) REFERENCES `cuenta_bancaria` (`id_cuenta`),
  CONSTRAINT `pago_carga_ibfk_1` FOREIGN KEY (`id_carga`) REFERENCES `carga` (`id_carga`),
  CONSTRAINT `pago_carga_ibfk_3` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.pago_carga: ~38 rows (aproximadamente)
INSERT INTO `pago_carga` (`id_pago`, `id_carga`, `id_cuenta`, `id_billetera`, `monto_pagado`, `tipo_pago`, `nro_operacion`, `ruta_comprobante`, `observacion`, `estado`, `id_usuario`, `fecha_pago`, `fecha_actualizacion`) VALUES
	(1, 39, 3, NULL, 2400.00, 'Transferencia', 'OP-998877', NULL, NULL, 1, 1, '2026-06-11 10:30:00', '2026-06-12 00:26:42'),
	(2, 33, NULL, NULL, 300.00, 'Efectivo', NULL, NULL, NULL, 0, 1, '2026-06-11 09:15:00', '2026-06-12 09:47:24'),
	(3, 32, NULL, 1, 12.00, 'Billetera Digital', '1756799', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1781249804/sistema_joselito/comprobantes/voucher_1781249802792.jpg', 'Pago de 12 soles como prueba', 1, 1, '2026-06-12 02:35:00', '2026-07-04 01:02:50'),
	(4, 32, NULL, 2, 50.00, 'Billetera Digital', '26561558', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1781250091/sistema_joselito/comprobantes/voucher_1781250090161.jpg', 'Pago de 50 soles de prueba', 1, 1, '2026-06-12 02:40:00', '2026-07-04 01:02:50'),
	(5, 29, NULL, NULL, 525.00, 'Efectivo', NULL, NULL, NULL, 1, 1, '2026-06-12 02:42:00', '2026-06-12 07:42:39'),
	(6, 33, 3, NULL, 500.00, 'Deposito', 'OP-965214', NULL, 'Prueba sin voucher', 1, 1, '2026-06-12 05:49:00', '2026-06-12 10:49:48'),
	(7, 37, NULL, 2, 1500.00, 'Billetera Digital', '57896585', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1781282986/sistema_joselito/comprobantes/voucher_1781282984557.jpg', 'Pagamos', 1, 1, '2026-06-12 11:49:00', '2026-07-04 01:02:50'),
	(8, 37, 3, NULL, 500.00, 'Transferencia', '655955', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1781284937/sistema_joselito/comprobantes/voucher_1781284936404.jpg', 'ksdkfksdkfsd', 0, 1, '2026-06-12 12:21:00', '2026-06-12 17:23:19'),
	(9, 33, NULL, NULL, 120.00, 'Efectivo', NULL, NULL, NULL, 1, 1, '2026-06-22 23:04:00', '2026-06-23 04:04:48'),
	(10, 33, 3, NULL, 100.00, 'Transferencia', '1536258963', NULL, NULL, 1, 1, '2026-06-22 23:04:00', '2026-06-23 04:05:07'),
	(11, 33, NULL, NULL, 120.00, 'Efectivo', NULL, NULL, NULL, 1, 1, '2026-06-24 01:32:00', '2026-06-24 06:32:09'),
	(12, 1, NULL, NULL, 108.00, 'Efectivo', NULL, NULL, NULL, 1, 1, '2026-06-24 01:33:00', '2026-06-24 06:33:46'),
	(13, 50, NULL, NULL, 1500.00, 'Efectivo', NULL, NULL, NULL, 1, 1, '2026-06-27 13:17:00', '2026-06-27 18:17:45'),
	(14, 2, NULL, NULL, 810.00, 'Efectivo', NULL, NULL, NULL, 1, 1, '2026-06-30 10:52:00', '2026-06-30 15:52:41'),
	(15, 77, NULL, NULL, 13500.00, 'Efectivo', NULL, NULL, NULL, 1, 1, '2026-06-30 10:59:00', '2026-06-30 15:59:52'),
	(18, 86, 11, NULL, 500.00, 'Efectivo', NULL, NULL, 'El cliente comento que vengamos el día siguiente a cobrar el resto porque aun no vendió todo los productos, dio un adelanto de 500 soles', 0, 1, '2026-07-09 18:04:00', '2026-07-17 00:28:44'),
	(19, 86, 11, NULL, 500.00, 'Efectivo', NULL, NULL, 'El cliente solo pudo cancelar hoy 1000. Se hicieron dos pagos uno de 500 en efectivo y los otros 500 en transferencia.', 1, 1, '2026-07-09 18:04:00', '2026-07-09 23:06:00'),
	(20, 86, 3, NULL, 500.00, 'Transferencia', '999111000', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1783638360/sistema_joselito/comprobantes/voucher_1783638359009.jpg', 'El cliente solo pudo cancelar hoy 1000. Se hicieron dos pagos uno de 500 en efectivo y los otros 500 en transferencia.', 1, 1, '2026-07-09 18:04:00', '2026-07-09 23:06:00'),
	(21, 83, 11, NULL, 100.00, 'Efectivo', NULL, NULL, 'Test para comprobar si sigue funcionando lo de anular pago', 0, 1, '2026-07-09 18:16:00', '2026-07-09 23:16:59'),
	(22, 74, 11, NULL, 300.00, 'Efectivo', NULL, NULL, '2do test de anulación de pago comprobando si se anula tambien el movimiento de caja', 0, 1, '2026-07-09 18:29:00', '2026-07-09 23:30:30'),
	(23, 86, NULL, 1, 244.00, 'Billetera Digital', '999333555', 'https://res.cloudinary.com/dduzlmlna/image/upload/v1783640795/sistema_joselito/comprobantes/voucher_1783640794041.jpg', NULL, 1, 1, '2026-07-09 18:46:00', '2026-07-09 23:46:35'),
	(24, 83, 11, NULL, 500.00, 'Efectivo', NULL, NULL, NULL, 0, 1, '2026-07-09 18:48:00', '2026-07-09 23:48:55'),
	(25, 83, NULL, 3, 200.00, 'Billetera Digital', '878700', NULL, 'TEST', 1, 1, '2026-07-09 20:18:00', '2026-07-10 01:18:29'),
	(26, 83, 5, 3, 200.00, 'Billetera Digital', '99119955', NULL, NULL, 1, 1, '2026-07-09 20:34:00', '2026-07-10 01:34:51'),
	(27, 3, 11, NULL, 832.00, 'Efectivo', NULL, NULL, NULL, 1, 1, '2026-07-14 10:52:00', '2026-07-14 15:52:14'),
	(28, 4, 11, NULL, 240.00, 'Efectivo', NULL, NULL, NULL, 1, 1, '2026-07-14 10:52:00', '2026-07-14 15:52:22'),
	(29, 5, 3, NULL, 392.40, 'Transferencia', '999222123', NULL, NULL, 1, 1, '2026-07-14 10:52:00', '2026-07-14 15:52:40'),
	(30, 6, 11, NULL, 1740.00, 'Efectivo', NULL, NULL, NULL, 1, 1, '2026-07-14 10:53:00', '2026-07-14 15:53:25'),
	(31, 70, 11, NULL, 4000.00, 'Efectivo', NULL, NULL, NULL, 1, 1, '2026-07-14 10:53:00', '2026-07-14 15:54:18'),
	(32, 70, 5, 3, 987.50, 'Billetera Digital', '67686960', NULL, NULL, 1, 1, '2026-07-14 10:53:00', '2026-07-14 15:54:18'),
	(33, 75, 11, NULL, 3087.20, 'Efectivo', NULL, NULL, NULL, 1, 1, '2026-07-14 10:54:00', '2026-07-14 15:54:30'),
	(34, 76, 11, NULL, 3577.60, 'Efectivo', NULL, NULL, NULL, 1, 1, '2026-07-14 10:54:00', '2026-07-14 15:54:33'),
	(35, 69, 11, NULL, 1500.00, 'Efectivo', NULL, NULL, NULL, 1, 1, '2026-07-14 10:54:00', '2026-07-14 15:54:41'),
	(36, 60, 11, NULL, 6300.00, 'Efectivo', NULL, NULL, NULL, 1, 1, '2026-07-14 10:54:00', '2026-07-14 15:54:51'),
	(37, 83, 9, NULL, 100.00, 'Transferencia', '1234321', NULL, NULL, 1, 1, '2026-07-14 11:11:00', '2026-07-14 16:12:05'),
	(38, 82, 9, NULL, 2142.00, 'Transferencia', '222111333', NULL, NULL, 1, 1, '2026-07-14 11:12:00', '2026-07-14 16:12:26'),
	(39, 78, 3, NULL, 2760.00, 'Transferencia', '44433322', NULL, NULL, 1, 1, '2026-07-14 11:13:00', '2026-07-14 16:13:36'),
	(40, 74, 5, 3, 300.00, 'Billetera Digital', '111666', NULL, NULL, 1, 1, '2026-07-14 11:13:00', '2026-07-14 16:14:06'),
	(41, 73, NULL, 7, 450.00, 'Billetera Digital', '543222', NULL, NULL, 1, 1, '2026-07-14 11:14:00', '2026-07-14 16:14:45'),
	(42, 7, NULL, 2, 304.00, 'Billetera Digital', '444333555', NULL, NULL, 1, 1, '2026-07-14 11:15:00', '2026-07-14 16:15:37'),
	(43, 11, NULL, 2, 2450.00, 'Billetera Digital', '543666', NULL, NULL, 1, 1, '2026-07-14 11:15:00', '2026-07-14 16:16:00'),
	(44, 32, NULL, 2, 1160.80, 'Billetera Digital', '543222', NULL, NULL, 1, 1, '2026-07-14 11:16:00', '2026-07-14 16:16:17'),
	(45, 86, 11, NULL, 500.00, 'Efectivo', NULL, NULL, NULL, 1, 1, '2026-07-16 19:29:00', '2026-07-17 00:29:25');

-- Volcando estructura para tabla joselitobd.pago_indemnizacion
CREATE TABLE IF NOT EXISTS `pago_indemnizacion` (
  `id_pago` int NOT NULL AUTO_INCREMENT,
  `id_cliente` int NOT NULL,
  `monto_total` decimal(10,2) NOT NULL,
  `fecha_pago` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `observaciones` text,
  `id_usuario` int NOT NULL COMMENT 'Usuario que registró el pago',
  `estado` tinyint(1) DEFAULT '1' COMMENT '1: Activo, 0: Anulado',
  PRIMARY KEY (`id_pago`),
  KEY `fk_pago_indem_cliente` (`id_cliente`),
  KEY `fk_pago_indem_usuario` (`id_usuario`),
  CONSTRAINT `fk_pago_indem_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`),
  CONSTRAINT `fk_pago_indem_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla joselitobd.pago_indemnizacion: ~1 rows (aproximadamente)
INSERT INTO `pago_indemnizacion` (`id_pago`, `id_cliente`, `monto_total`, `fecha_pago`, `observaciones`, `id_usuario`, `estado`) VALUES
	(12, 4, 100.00, '2026-07-16 15:58:53', NULL, 2, 0),
	(14, 1, 480.00, '2026-07-16 18:48:12', NULL, 2, 1),
	(15, 2, 260.00, '2026-07-16 21:23:30', NULL, 2, 1),
	(16, 2, 500.00, '2026-07-16 21:32:35', NULL, 2, 0);

-- Volcando estructura para tabla joselitobd.pago_indemnizacion_detalle
CREATE TABLE IF NOT EXISTS `pago_indemnizacion_detalle` (
  `id_pago` int NOT NULL,
  `id_incidencia` int NOT NULL,
  `id_detalle` int NOT NULL,
  `monto_pagado` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_pago`,`id_incidencia`,`id_detalle`),
  KEY `fk_pid_incidencia_detalle` (`id_incidencia`,`id_detalle`),
  CONSTRAINT `fk_pid_incidencia_detalle` FOREIGN KEY (`id_incidencia`, `id_detalle`) REFERENCES `incidencia_detalle_carga` (`id_incidencia`, `id_detalle`),
  CONSTRAINT `fk_pid_pago` FOREIGN KEY (`id_pago`) REFERENCES `pago_indemnizacion` (`id_pago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla joselitobd.pago_indemnizacion_detalle: ~0 rows (aproximadamente)
INSERT INTO `pago_indemnizacion_detalle` (`id_pago`, `id_incidencia`, `id_detalle`, `monto_pagado`) VALUES
	(12, 20, 159, 100.00),
	(14, 16, 144, 480.00),
	(15, 17, 134, 140.00),
	(15, 17, 135, 120.00),
	(16, 14, 143, 500.00);

-- Volcando estructura para tabla joselitobd.perfil_opcion
CREATE TABLE IF NOT EXISTS `perfil_opcion` (
  `id_perfil` int NOT NULL,
  `id_opcion` int NOT NULL,
  PRIMARY KEY (`id_perfil`,`id_opcion`),
  KEY `id_opcion` (`id_opcion`),
  CONSTRAINT `perfil_opcion_ibfk_1` FOREIGN KEY (`id_perfil`) REFERENCES `perfiles` (`id_perfil`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `perfil_opcion_ibfk_2` FOREIGN KEY (`id_opcion`) REFERENCES `opciones` (`id_opcion`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.perfil_opcion: ~31 rows (aproximadamente)
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
	(1, 14),
	(1, 15),
	(1, 16),
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
	(2, 14),
	(2, 15),
	(2, 16),
	(3, 1),
	(3, 2),
	(3, 3),
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
	(1, 'DESARROLLADOR', 'Perfil Oculto', 1, '2026-05-08 06:46:26', '2026-07-10 17:34:35'),
	(2, 'ADMINISTRADOR', 'Perfil con acceso total a todas las opciones del sistema', 1, '2026-05-08 05:04:23', '2026-07-10 17:34:19'),
	(3, 'ADMINISTRADOR SEDE', 'Administrador de la Sede de Chiclayo', 1, '2026-05-08 06:24:39', '2026-07-14 17:38:18'),
	(4, 'DASHBOARD', 'Solo acceso al dashboard', 1, '2026-05-08 14:39:10', '2026-07-10 17:33:52'),
	(5, 'CONTABILIDAD', 'Acceso a los módulos de cobro y liquidaciones', 1, '2026-05-08 16:16:48', '2026-07-10 17:33:57');

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
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.productos: ~12 rows (aproximadamente)
INSERT INTO `productos` (`id_producto`, `nombre`, `descripcion`, `estado`, `fecha_creacion`, `fecha_actualizacion`) VALUES
	(1, 'Saco de kion', NULL, 1, '2026-05-12 14:56:59', '2026-05-12 15:12:39'),
	(2, 'Ajo Cajamarquino', 'Ajo para pelar y desgranar', 1, '2026-05-12 15:11:39', '2026-05-12 17:17:52'),
	(3, 'Ajo Chino', NULL, 1, '2026-05-12 15:33:51', '2026-05-12 15:33:51'),
	(4, 'Caja de Manzana', 'Caja de cartón', 1, '2026-06-30 04:01:12', '2026-06-30 04:01:12'),
	(5, 'Caja de Piña Golden', 'Cajas o javas de madera', 1, '2026-06-30 04:02:26', '2026-06-30 04:02:26'),
	(6, 'Servicio de Mudanza', 'Transporte ya sea en conjunto o unitario de muebles, cocinas, etc...', 1, '2026-06-30 04:03:15', '2026-06-30 04:03:15'),
	(7, 'Sacos de Papa Blanca', NULL, 1, '2026-06-30 04:05:55', '2026-06-30 04:05:55'),
	(8, 'Malla de Alverja', NULL, 1, '2026-06-30 04:09:03', '2026-06-30 04:09:03'),
	(9, 'Transporte de Motos', 'Servicio de transporte de motos lineales o mototaxi', 1, '2026-06-30 04:11:42', '2026-06-30 04:11:42'),
	(10, 'CAJA DE PERAS', 'Caja de cartón, frágil', 1, '2026-07-10 15:08:19', '2026-07-10 15:08:19'),
	(11, 'CAJA DE NARANJAS', NULL, 1, '2026-07-10 15:09:24', '2026-07-10 15:09:24'),
	(12, 'SACO DE CAMOTE MORADO', NULL, 1, '2026-07-10 15:09:56', '2026-07-10 15:09:56'),
	(13, 'SACO DE CAMOTE', 'Camote normal el naranja', 1, '2026-07-10 15:14:17', '2026-07-10 15:14:17');

-- Volcando estructura para tabla joselitobd.proveedor_billetera
CREATE TABLE IF NOT EXISTS `proveedor_billetera` (
  `id_proveedor` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `color_primario` varchar(7) DEFAULT NULL,
  `color_fondo` varchar(7) DEFAULT NULL,
  `estado` tinyint DEFAULT '1',
  PRIMARY KEY (`id_proveedor`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla joselitobd.proveedor_billetera: ~4 rows (aproximadamente)
INSERT INTO `proveedor_billetera` (`id_proveedor`, `nombre`, `color_primario`, `color_fondo`, `estado`) VALUES
	(1, 'Yape', '#9333ea', '#faf5ff', 1),
	(2, 'Plin', '#ec4899', '#fdf2f8', 1),
	(3, 'Tunki', '#14b8a6', '#f0fdfa', 1),
	(4, 'Agora', '#f59e0b', '#fffbeb', 1);

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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Registro de rutas lógicas cubiertas por la empresa';

-- Volcando datos para la tabla joselitobd.rutas: ~2 rows (aproximadamente)
INSERT INTO `rutas` (`id_ruta`, `ciudad_origen`, `ciudad_destino`, `descripcion`, `estado`, `fecha_creacion`, `fecha_actualizacion`) VALUES
	(1, 'LIMA', 'CHICLAYO', 'Paradas en Chepén', 1, '2026-05-20 06:13:44', '2026-05-20 06:13:44'),
	(2, 'CHICLAYO', 'LIMA', NULL, 1, '2026-05-27 22:18:29', '2026-05-27 22:18:29'),
	(3, 'LIMA', 'TRUJILLO', NULL, 1, '2026-07-10 15:09:03', '2026-07-10 15:09:03');

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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.usuarios: ~6 rows (aproximadamente)
INSERT INTO `usuarios` (`id_usuario`, `id_perfil`, `nombre`, `usuario`, `clave`, `estado`, `fecha_creacion`, `fecha_actualizacion`) VALUES
	(1, 1, 'Desarrollador', 'developer', '$2b$10$PIFX4ryhDbYs4bfi3jfOV.KqqhQollcGprSxZuOIDEPZupaHqcGb6', 1, '2026-05-08 06:46:26', '2026-05-08 15:26:35'),
	(2, 2, 'Administrador', 'admin', '$2b$10$3Fc2uSgrvHJylWpRoMbOdeS9Oa7y4RxmeymeiDwEkcYzfCEwmPNqW', 1, '2026-05-08 05:04:23', '2026-05-08 14:52:54'),
	(3, 3, 'Luis Castillo', 'Luis', '$2b$10$TLKzDd5VRGuYOw4TTItvmupn3Vks33SCrGSwLmfxRx5ZZe6HPyNoS', 1, '2026-05-08 06:25:33', '2026-07-14 17:38:33'),
	(4, 4, 'admin2', 'admin2', '$2b$10$Ow3achrtouLsK4kXI7CyW.R6aLVy3dNHDr8A5cCqUTXh1kDwOgcRm', 1, '2026-05-08 14:54:45', '2026-05-08 15:27:24'),
	(5, 3, 'CRISTIANO RONALDO', 'cristiano', '$2b$10$WqsqhMfElsQHayOCA.MuLew8RqUqdxAIiZ6/WquB.mei2lC3.Ag3i', 1, '2026-07-10 18:07:38', '2026-07-14 17:38:30'),
	(6, 3, 'KYLIAN MBAPPE', 'mbappe', '$2b$10$RkaUTKzd0JOf4JQ7dR.BM.FD/eMPJlrK08LPKOasUiMRgL9StMJny', 1, '2026-07-10 18:13:45', '2026-07-14 17:38:26');

-- Volcando estructura para tabla joselitobd.viaje
CREATE TABLE IF NOT EXISTS `viaje` (
  `id_viaje` int NOT NULL AUTO_INCREMENT,
  `id_camion` int NOT NULL,
  `id_ruta` int NOT NULL,
  `tarifa_transportista` decimal(10,2) NOT NULL COMMENT 'Tarifa acordada para pagar al transportista por kg',
  `fecha_salida` datetime DEFAULT NULL,
  `fecha_llegada` datetime DEFAULT NULL,
  `estado_pagos` enum('Pendiente','Liquidado','Anulado') COLLATE utf8mb4_general_ci DEFAULT 'Pendiente' COMMENT 'Controla si el chofer ya cobró su viaje',
  `estado_operativo` enum('En Ruta','Llegó a Destino','Descargado','Finalizado','Incidencia') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'En Ruta',
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
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Volcando datos para la tabla joselitobd.viaje: ~35 rows (aproximadamente)
INSERT INTO `viaje` (`id_viaje`, `id_camion`, `id_ruta`, `tarifa_transportista`, `fecha_salida`, `fecha_llegada`, `estado_pagos`, `estado_operativo`, `id_usuario`, `estado`, `fecha_creacion`, `fecha_actualizacion`, `id_viaje_origen`) VALUES
	(1, 1, 1, 0.20, '2026-05-05 00:00:00', '2026-05-06 14:44:04', 'Liquidado', 'Finalizado', 2, 1, '2026-05-28 04:34:18', '2026-06-24 05:57:29', NULL),
	(2, 2, 1, 0.10, '2026-05-28 00:00:00', '2026-05-29 11:05:36', 'Liquidado', 'Finalizado', 2, 1, '2026-05-28 05:21:47', '2026-06-24 06:53:36', NULL),
	(3, 3, 1, 0.20, '2026-05-28 21:37:00', '2026-06-06 12:57:40', 'Liquidado', 'Finalizado', 2, 1, '2026-05-29 02:40:04', '2026-06-26 04:02:07', NULL),
	(4, 2, 1, 0.30, '2026-05-29 12:40:00', '2026-06-05 21:12:01', 'Liquidado', 'Finalizado', 2, 1, '2026-05-29 17:47:44', '2026-06-24 06:54:25', NULL),
	(5, 3, 1, 0.20, '2026-06-04 18:47:00', '2026-06-05 18:49:48', 'Liquidado', 'Finalizado', 2, 1, '2026-06-05 23:49:37', '2026-07-02 23:52:23', NULL),
	(6, 3, 1, 0.10, '2026-06-06 13:02:00', '2026-06-06 13:03:00', 'Liquidado', 'Finalizado', 2, 1, '2026-06-06 18:02:51', '2026-07-03 22:39:47', NULL),
	(7, 2, 1, 0.10, '2026-06-06 13:05:00', '2026-06-06 13:05:15', 'Liquidado', 'Finalizado', 2, 1, '2026-06-06 18:05:09', '2026-07-04 18:11:52', NULL),
	(8, 2, 1, 0.20, '2026-06-06 18:54:00', '2026-06-06 18:58:13', 'Liquidado', 'Finalizado', 2, 1, '2026-06-06 23:57:21', '2026-07-04 20:22:39', NULL),
	(9, 3, 1, 0.25, '2026-06-06 19:53:00', NULL, 'Anulado', 'Finalizado', 2, 1, '2026-06-07 00:54:25', '2026-07-09 06:58:21', NULL),
	(10, 1, 1, 0.10, '2026-06-06 20:52:00', '2026-06-06 20:54:37', 'Liquidado', 'Finalizado', 2, 1, '2026-06-07 01:53:59', '2026-07-05 01:19:13', NULL),
	(11, 3, 1, 0.30, '2026-06-06 21:05:00', '2026-06-07 00:22:41', 'Pendiente', 'Finalizado', 2, 1, '2026-06-07 02:07:16', '2026-06-23 16:04:07', NULL),
	(12, 1, 1, 0.30, '2026-06-08 00:16:00', '2026-06-08 18:34:24', 'Liquidado', 'Finalizado', 1, 1, '2026-06-08 05:16:59', '2026-06-24 06:16:18', 9),
	(13, 2, 1, 0.30, '2026-06-08 17:22:00', NULL, 'Anulado', 'Finalizado', 2, 1, '2026-06-08 22:23:17', '2026-07-09 06:58:10', NULL),
	(14, 1, 1, 0.30, '2026-06-08 17:28:00', '2026-06-11 13:09:44', 'Liquidado', 'Finalizado', 1, 1, '2026-06-08 22:31:31', '2026-07-05 03:27:26', 13),
	(15, 1, 1, 0.20, '2026-06-11 16:25:00', NULL, 'Anulado', 'Finalizado', 2, 1, '2026-06-11 21:25:57', '2026-07-09 07:10:29', NULL),
	(16, 2, 1, 0.30, '2026-06-11 16:37:00', NULL, 'Anulado', 'Finalizado', 1, 1, '2026-06-11 21:38:00', '2026-07-09 07:19:23', 15),
	(17, 1, 1, 0.20, '2026-06-12 12:18:00', NULL, 'Anulado', 'Finalizado', 1, 1, '2026-06-12 17:32:50', '2026-07-14 18:04:02', NULL),
	(18, 1, 1, 0.30, '2026-06-12 12:46:00', NULL, 'Anulado', 'Incidencia', 1, 1, '2026-06-12 17:50:12', '2026-06-29 18:50:40', NULL),
	(20, 1, 1, 0.30, '2026-06-23 10:20:00', NULL, 'Anulado', 'Finalizado', 2, 1, '2026-06-23 15:27:45', '2026-07-09 07:17:50', NULL),
	(21, 2, 1, 0.30, '2026-06-26 02:48:00', '2026-06-26 13:09:11', 'Pendiente', 'Finalizado', 1, 1, '2026-06-26 07:48:49', '2026-07-14 16:09:26', 20),
	(22, 2, 1, 0.30, '2026-06-29 13:50:00', '2026-06-29 22:43:58', 'Pendiente', 'Finalizado', 1, 1, '2026-06-29 18:50:40', '2026-06-30 03:44:03', 18),
	(23, 2, 1, 0.25, '2026-06-29 15:41:00', '2026-06-29 20:09:15', 'Pendiente', 'Finalizado', 1, 1, '2026-06-29 20:43:08', '2026-06-30 05:55:34', 17),
	(24, 1, 1, 0.30, '2026-06-27 13:09:00', NULL, 'Anulado', 'Incidencia', 2, 1, '2026-06-30 01:09:10', '2026-06-30 01:45:10', NULL),
	(25, 1, 1, 0.30, '2026-06-29 20:09:00', '2026-06-29 22:43:51', 'Liquidado', 'Finalizado', 1, 1, '2026-06-30 01:17:12', '2026-07-10 00:32:14', 16),
	(26, 2, 2, 0.20, '2026-06-29 20:35:00', NULL, 'Anulado', 'Finalizado', 2, 1, '2026-06-30 01:35:46', '2026-07-09 07:31:21', NULL),
	(27, 1, 2, 0.25, '2026-06-29 20:35:00', '2026-06-29 22:43:48', 'Pendiente', 'Finalizado', 1, 1, '2026-06-30 01:36:22', '2026-06-30 05:33:19', 26),
	(28, 2, 1, 0.35, '2026-06-29 20:44:00', '2026-06-29 22:42:41', 'Pendiente', 'Finalizado', 1, 1, '2026-06-30 01:45:10', '2026-06-30 05:54:39', 24),
	(29, 1, 2, 0.20, '2026-06-29 23:14:00', NULL, 'Anulado', 'Finalizado', 2, 1, '2026-06-30 04:14:15', '2026-07-08 17:02:04', NULL),
	(30, 3, 2, 0.25, '2026-06-29 23:14:00', '2026-07-05 01:44:23', 'Pendiente', 'Finalizado', 1, 1, '2026-06-30 04:16:39', '2026-07-05 06:45:15', 29),
	(31, 3, 2, 0.30, '2026-06-30 08:57:00', '2026-06-30 09:00:09', 'Pendiente', 'Finalizado', 2, 1, '2026-06-30 14:00:02', '2026-07-08 17:10:12', NULL),
	(32, 2, 2, 0.30, '2026-06-30 09:53:00', '2026-06-30 10:33:19', 'Liquidado', 'Finalizado', 2, 1, '2026-06-30 14:57:58', '2026-06-30 16:17:38', NULL),
	(33, 2, 1, 0.20, '2026-07-05 02:04:00', '2026-07-05 02:05:34', 'Pendiente', 'Finalizado', 2, 1, '2026-07-05 07:05:29', '2026-07-05 07:05:44', NULL),
	(34, 3, 2, 0.30, '2026-07-05 02:18:00', '2026-07-05 02:23:32', 'Liquidado', 'Finalizado', 2, 1, '2026-07-05 07:23:26', '2026-07-05 18:31:30', NULL),
	(35, 2, 1, 0.30, '2026-07-06 22:20:00', NULL, 'Anulado', 'Finalizado', 2, 1, '2026-07-07 03:21:24', '2026-07-08 03:49:18', NULL),
	(36, 3, 1, 0.40, '2026-07-06 22:30:00', '2026-07-07 22:44:11', 'Liquidado', 'Finalizado', 1, 1, '2026-07-07 03:31:09', '2026-07-10 01:17:07', 35),
	(37, 2, 1, 0.20, '2026-07-08 21:06:00', NULL, 'Anulado', 'Incidencia', 2, 1, '2026-07-09 02:07:50', '2026-07-09 03:04:37', NULL),
	(38, 3, 1, 0.30, '2026-07-08 22:04:00', '2026-07-08 22:04:48', 'Liquidado', 'Finalizado', 1, 1, '2026-07-09 03:04:37', '2026-07-10 00:59:12', 37),
	(39, 2, 1, 0.10, '2026-07-09 02:27:00', '2026-07-09 02:30:35', 'Pendiente', 'Llegó a Destino', 2, 1, '2026-07-09 07:29:03', '2026-07-09 07:30:35', NULL);

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
