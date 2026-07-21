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

-- La exportación de datos fue deseleccionada.

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

-- La exportación de datos fue deseleccionada.

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

-- La exportación de datos fue deseleccionada.

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

-- La exportación de datos fue deseleccionada.

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

-- La exportación de datos fue deseleccionada.

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

-- La exportación de datos fue deseleccionada.

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

-- La exportación de datos fue deseleccionada.

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

-- La exportación de datos fue deseleccionada.

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

-- La exportación de datos fue deseleccionada.

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

-- La exportación de datos fue deseleccionada.

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

-- La exportación de datos fue deseleccionada.

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

-- La exportación de datos fue deseleccionada.

-- Volcando estructura para tabla joselitobd.perfil_opcion
CREATE TABLE IF NOT EXISTS `perfil_opcion` (
  `id_perfil` int NOT NULL,
  `id_opcion` int NOT NULL,
  PRIMARY KEY (`id_perfil`,`id_opcion`),
  KEY `id_opcion` (`id_opcion`),
  CONSTRAINT `perfil_opcion_ibfk_1` FOREIGN KEY (`id_perfil`) REFERENCES `perfiles` (`id_perfil`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `perfil_opcion_ibfk_2` FOREIGN KEY (`id_opcion`) REFERENCES `opciones` (`id_opcion`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- La exportación de datos fue deseleccionada.

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

-- La exportación de datos fue deseleccionada.

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

-- La exportación de datos fue deseleccionada.

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

-- La exportación de datos fue deseleccionada.

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

-- La exportación de datos fue deseleccionada.

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

-- La exportación de datos fue deseleccionada.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
