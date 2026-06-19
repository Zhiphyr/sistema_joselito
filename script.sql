CREATE DATABASE  IF NOT EXISTS `joselitobd` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `joselitobd`;
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: joselitobd
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `camiones`
--

DROP TABLE IF EXISTS `camiones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `camiones` (
  `id_camion` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Alias, marca o modelo del camión',
  `placa` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Placa de rodaje (única por unidad)',
  `tipo_documento` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'DNI o RUC',
  `numero_documento` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Número de documento del conductor',
  `conductor` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nombre o Razón Social del conductor',
  `direccion` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Dirección del conductor',
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Teléfono asignado a la unidad',
  `estado` tinyint(1) NOT NULL DEFAULT '1' COMMENT '0=inactivo, 1=activo, 2=eliminado',
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_camion`),
  UNIQUE KEY `uq_placa` (`placa`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro de unidades de transporte de la flota';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `camiones`
--

LOCK TABLES `camiones` WRITE;
/*!40000 ALTER TABLE `camiones` DISABLE KEYS */;
INSERT INTO `camiones` VALUES (1,'Volvo F11 Azul','M8A-987','DNI','75405436','LUIS ANGEL CASTILLO GUEVARA','CALLE SANTA MARTHA MZ. E LT. 06, JOSE LEONARDO ORTIZ, CHICLAYO, LAMBAYEQUE','956487152',1,'2026-05-20 06:13:20','2026-05-20 06:13:20'),(2,'Scania Azul','M7A-658','DNI','75407777','JHON DEIVIS RODAS BUSTAMANTE','JR. GUEPI 790, MORALES, SAN MARTIN, SAN MARTIN','963256325',1,'2026-05-27 22:19:12','2026-05-27 22:19:12'),(3,'Fuso Azul','B9A-695','DNI','75698452','NAHUM HONORATO PADILLA MANCILLA','C.POBLADO PICHARI BAJA, PICHARI, LA CONVENCION, CUSCO','984554123',1,'2026-05-28 05:25:19','2026-05-28 05:25:19');
/*!40000 ALTER TABLE `camiones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `carga`
--

DROP TABLE IF EXISTS `carga`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carga` (
  `id_carga` int NOT NULL AUTO_INCREMENT,
  `id_viaje` int NOT NULL,
  `id_remitente` int NOT NULL,
  `id_destinatario` int NOT NULL,
  `flete_total` decimal(10,2) DEFAULT '0.00',
  `estado_cobro` enum('Pendiente','Completado','Parcial','Anulado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Pendiente' COMMENT 'Estado de cobranza del flete',
  `estado_entrega` enum('En Almacen de Origen','En Almacen de Destino','En ruta','Entregado','Rechazado','Siniestrado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'En Almacen de Origen' COMMENT 'Estado físico del paquete o carga durante el proceso logístico',
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
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carga`
--

LOCK TABLES `carga` WRITE;
/*!40000 ALTER TABLE `carga` DISABLE KEYS */;
INSERT INTO `carga` VALUES (1,1,3,2,108.00,'Pendiente','Entregado',2,1,'2026-05-28 04:34:18','2026-06-05 23:21:32'),(2,1,3,4,810.00,'Pendiente','Entregado',2,1,'2026-05-28 04:34:18','2026-06-05 23:21:54'),(3,2,4,5,832.00,'Pendiente','Entregado',2,1,'2026-05-28 05:21:47','2026-06-06 00:03:22'),(4,2,3,1,240.00,'Pendiente','Entregado',2,1,'2026-05-28 05:21:47','2026-06-06 00:03:26'),(5,3,1,5,392.40,'Pendiente','Entregado',2,1,'2026-05-29 02:40:04','2026-06-06 17:57:49'),(6,3,1,3,1740.00,'Pendiente','Entregado',2,1,'2026-05-29 02:40:04','2026-06-06 17:57:51'),(7,3,4,2,304.00,'Pendiente','Entregado',2,1,'2026-05-29 02:40:04','2026-06-06 17:57:54'),(8,3,1,2,3430.00,'Pendiente','Entregado',2,1,'2026-05-29 02:40:04','2026-06-06 17:57:57'),(9,4,1,3,150.00,'Anulado','Rechazado',2,1,'2026-05-29 17:47:44','2026-06-06 17:48:03'),(10,4,1,3,60.00,'Pendiente','Entregado',2,1,'2026-05-29 17:47:44','2026-06-06 17:57:01'),(11,5,1,2,2450.00,'Pendiente','Entregado',2,1,'2026-06-05 23:49:37','2026-06-05 23:49:57'),(12,5,3,2,825.00,'Pendiente','Entregado',2,1,'2026-06-05 23:49:37','2026-06-05 23:50:00'),(13,5,4,5,2125.00,'Pendiente','Entregado',2,1,'2026-06-05 23:49:37','2026-06-05 23:50:03'),(14,4,1,3,165.00,'Pendiente','Entregado',1,1,'2026-06-06 17:48:03','2026-06-06 17:48:03'),(15,6,1,4,63.00,'Anulado','Rechazado',2,1,'2026-06-06 18:02:51','2026-06-06 18:03:54'),(16,6,1,2,148.50,'Anulado','Rechazado',2,1,'2026-06-06 18:02:51','2026-06-06 18:03:16'),(17,6,1,2,184.50,'Pendiente','Entregado',1,1,'2026-06-06 18:03:16','2026-06-06 18:03:16'),(18,6,1,4,72.00,'Pendiente','Entregado',1,1,'2026-06-06 18:03:54','2026-06-06 18:03:54'),(19,7,1,2,532.50,'Anulado','Rechazado',2,1,'2026-06-06 18:05:09','2026-06-06 18:05:23'),(20,7,1,2,1065.00,'Pendiente','Entregado',1,1,'2026-06-06 18:05:23','2026-06-06 18:05:23'),(21,8,1,2,1000.00,'Anulado','Rechazado',2,1,'2026-06-06 23:57:21','2026-06-07 01:51:58'),(22,8,3,5,495.00,'Anulado','Rechazado',2,1,'2026-06-06 23:57:21','2026-06-07 00:49:17'),(23,8,4,5,750.00,'Anulado','Rechazado',2,1,'2026-06-06 23:57:21','2026-06-07 00:51:27'),(24,8,4,5,4800.00,'Pendiente','Entregado',1,1,'2026-06-07 00:51:27','2026-06-07 00:51:27'),(25,9,1,2,720.00,'Anulado','Siniestrado',2,1,'2026-06-07 00:54:25','2026-06-08 05:16:59'),(26,8,1,2,3200.00,'Pendiente','Entregado',1,1,'2026-06-07 01:51:58','2026-06-07 01:51:58'),(27,10,1,2,225.00,'Anulado','Rechazado',2,1,'2026-06-07 01:53:59','2026-06-07 01:54:58'),(28,10,3,5,8427.50,'Pendiente','Entregado',2,1,'2026-06-07 01:53:59','2026-06-09 04:45:34'),(29,10,1,2,525.00,'Completado','Entregado',1,1,'2026-06-07 01:54:58','2026-06-12 07:42:39'),(30,11,1,2,570.00,'Anulado','Rechazado',2,1,'2026-06-07 02:07:16','2026-06-07 05:23:06'),(31,11,1,5,7200.00,'Pendiente','Entregado',2,1,'2026-06-07 02:07:16','2026-06-07 05:23:23'),(32,11,3,2,1222.80,'Parcial','Entregado',2,1,'2026-06-07 02:07:16','2026-06-12 07:36:44'),(33,11,1,2,840.00,'Parcial','Entregado',1,1,'2026-06-07 05:23:06','2026-06-12 10:49:48'),(34,12,1,2,3000.00,'Anulado','Rechazado',1,1,'2026-06-08 05:16:59','2026-06-10 07:06:10'),(35,13,1,2,2100.00,'Anulado','Siniestrado',2,1,'2026-06-08 22:23:17','2026-06-08 22:31:31'),(36,13,3,5,0.00,'Anulado','Siniestrado',2,1,'2026-06-08 22:23:17','2026-06-08 22:31:31'),(37,14,1,2,3024.00,'Parcial','En Almacen de Destino',1,1,'2026-06-08 22:31:31','2026-06-12 16:49:46'),(38,14,3,5,591.60,'Anulado','Entregado',1,1,'2026-06-08 22:31:31','2026-06-12 15:52:10'),(39,12,1,2,2400.00,'Completado','Entregado',1,1,'2026-06-10 07:06:10','2026-06-12 00:26:42'),(40,15,1,2,0.00,'Anulado','Siniestrado',2,1,'2026-06-11 21:25:57','2026-06-11 21:38:00'),(41,16,1,2,1800.00,'Pendiente','En ruta',1,1,'2026-06-11 21:38:00','2026-06-11 21:38:00'),(42,17,3,2,8910.00,'Pendiente','En ruta',1,1,'2026-06-12 17:32:50','2026-06-12 17:32:50'),(43,17,3,5,1782.00,'Pendiente','En ruta',1,1,'2026-06-12 17:32:50','2026-06-12 17:32:50'),(44,17,4,5,630.00,'Pendiente','En ruta',1,1,'2026-06-12 17:32:50','2026-06-12 17:32:50'),(45,17,2,3,810.00,'Pendiente','En ruta',1,1,'2026-06-12 17:32:50','2026-06-12 17:32:50'),(46,18,1,2,1320.00,'Pendiente','En ruta',1,1,'2026-06-12 17:50:12','2026-06-12 17:50:12');
/*!40000 ALTER TABLE `carga` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `id_cliente` int NOT NULL AUTO_INCREMENT,
  `tipo_documento` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'DNI o RUC',
  `numero_documento` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_razon_social` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `direccion` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `correo` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` tinyint NOT NULL DEFAULT '1' COMMENT '0: Inactivo, 1: Activo, 2: Eliminado',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cliente`),
  UNIQUE KEY `numero_documento` (`numero_documento`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes`
--

LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
INSERT INTO `clientes` VALUES (1,'DNI','75405436','LUIS ANGEL CASTILLO GUEVARA','Calle Santa Martha Mz E Lt 6','947010376','luisgcastilllo@gmail.com',1,'2026-05-12 14:17:56','2026-05-12 14:18:38'),(2,'RUC','20337564373','TIENDAS POR DEPARTAMENTO RIPLEY S.A.C.','AV. LAS BEGONIAS NRO. 545 URB. JARDIN, SAN ISIDRO, LIMA, LIMA','912934956','',1,'2026-05-12 15:59:30','2026-05-12 15:59:30'),(3,'DNI','75406589','VALERY SOFIA QUINCHO BERRIOS','CALLE EL TUMI URB. SAN JUAN BAUTISTA DE VILLA MZ. G LT. 19B, CHORRILLOS, LIMA, LIMA','958444123','',1,'2026-05-27 22:18:17','2026-05-27 22:18:17'),(4,'DNI','75896325','DARIANA NOVOA MERCADO','CALLE ZEPITA 477, SAN PEDRO DE LLOC, PACASMAYO, LA LIBERTAD','947555845','',1,'2026-05-28 04:33:25','2026-05-28 04:33:25'),(5,'RUC','20608300393','COMPAÑIA FOOD RETAIL S.A.C.','CAL. CESAR MORELLI NRO. 181      SAN BORJA NORTE, SAN BORJA, LIMA, LIMA','911563258','',1,'2026-05-28 05:10:57','2026-05-28 05:10:57');
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `configuracion_sistema`
--

DROP TABLE IF EXISTS `configuracion_sistema`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuracion_sistema` (
  `id_config` int NOT NULL AUTO_INCREMENT,
  `parametro` varchar(50) NOT NULL,
  `valor` varchar(255) NOT NULL,
  `descripcion` text,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_config`),
  UNIQUE KEY `parametro` (`parametro`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuracion_sistema`
--

LOCK TABLES `configuracion_sistema` WRITE;
/*!40000 ALTER TABLE `configuracion_sistema` DISABLE KEYS */;
INSERT INTO `configuracion_sistema` VALUES (1,'PIN_ANULACION_PAGOS','$2b$10$JS9osLLm2f8yZdZQ8qJu0uWS3vHoocQfEAjPvdgUYuBvZLkFCfMLW','PIN numérico para autorizar anulación de pagos','2026-06-12 09:18:16');
/*!40000 ALTER TABLE `configuracion_sistema` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cuenta_bancaria`
--

DROP TABLE IF EXISTS `cuenta_bancaria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cuenta_bancaria` (
  `id_cuenta` int NOT NULL AUTO_INCREMENT,
  `entidad_financiera` varchar(50) NOT NULL,
  `tipo_cuenta` varchar(50) NOT NULL,
  `nro_cuenta` varchar(100) DEFAULT NULL,
  `nro_cci` varchar(100) DEFAULT NULL,
  `titular` varchar(150) NOT NULL,
  `ruta_qr` varchar(255) DEFAULT NULL,
  `estado` tinyint DEFAULT '1',
  PRIMARY KEY (`id_cuenta`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cuenta_bancaria`
--

LOCK TABLES `cuenta_bancaria` WRITE;
/*!40000 ALTER TABLE `cuenta_bancaria` DISABLE KEYS */;
INSERT INTO `cuenta_bancaria` VALUES (1,'Yape','Celular','999888777',NULL,'Transporte Joselito','https://res.cloudinary.com/dduzlmlna/image/upload/v1781247118/qr_yape1_llvstg.jpg',1),(2,'Plin','Celular','999888777',NULL,'Transporte Joselito','https://res.cloudinary.com/dduzlmlna/image/upload/v1781247118/qr_plin_pgyta3.jpg',1),(3,'BCP','Corriente','191-0000000-0-00','002191000000000012','Transporte Joselito S.A.C.',NULL,1),(4,'Interbank','Ahorros','200-300000000',NULL,'Teofila Inca',NULL,1);
/*!40000 ALTER TABLE `cuenta_bancaria` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `detalle_carga`
--

DROP TABLE IF EXISTS `detalle_carga`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_carga` (
  `id_detalle` int NOT NULL AUTO_INCREMENT,
  `id_carga` int NOT NULL,
  `id_producto` int NOT NULL,
  `marca_visual` varchar(100) DEFAULT NULL COMMENT 'Marca distintiva o descripción visual en el empaque o producto',
  `cantidad_sacos` int NOT NULL,
  `peso_unitario` decimal(10,2) DEFAULT NULL COMMENT 'Peso por unidad de saco en Kg',
  `peso_total` decimal(10,2) DEFAULT NULL COMMENT 'Peso total (cantidad_sacos * peso_unitario)',
  `precio_peso` decimal(10,2) DEFAULT NULL COMMENT 'Tarifa o precio aplicado por cada Kg de la carga',
  `flete_subtotal` decimal(10,2) DEFAULT NULL COMMENT 'Subtotal calculado por el peso (peso_total * precio_peso)',
  `estado` tinyint(1) DEFAULT '1',
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_detalle`),
  KEY `fk_detalle_carga` (`id_carga`),
  KEY `fk_detalle_producto` (`id_producto`),
  CONSTRAINT `fk_detalle_carga` FOREIGN KEY (`id_carga`) REFERENCES `carga` (`id_carga`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_detalle_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=77 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalle_carga`
--

LOCK TABLES `detalle_carga` WRITE;
/*!40000 ALTER TABLE `detalle_carga` DISABLE KEYS */;
INSERT INTO `detalle_carga` VALUES (1,1,1,'Marca Rojo',2,90.00,180.00,0.60,108.00,1,'2026-05-28 04:34:18','2026-05-28 04:34:18'),(2,2,2,'Marca Azul y Verde',30,30.00,900.00,0.60,540.00,1,'2026-05-28 04:34:18','2026-05-28 04:34:18'),(3,2,3,'Marca Azul y Verde',15,30.00,450.00,0.60,270.00,1,'2026-05-28 04:34:18','2026-05-28 04:34:18'),(4,3,2,'Marca Rojo',30,23.50,705.00,0.40,282.00,1,'2026-05-28 05:21:47','2026-05-28 05:21:47'),(5,3,3,'Marca Roja',50,25.70,1285.00,0.40,514.00,1,'2026-05-28 05:21:47','2026-05-28 05:21:47'),(6,3,1,'Rafia Roja',1,120.00,120.00,0.30,36.00,1,'2026-05-28 05:21:47','2026-05-28 05:21:47'),(7,4,1,'Rafia Verde',5,120.00,600.00,0.40,240.00,1,'2026-05-28 05:21:47','2026-05-28 05:21:47'),(8,5,2,'Marca Verde',30,32.70,981.00,0.40,392.40,1,'2026-05-29 02:40:04','2026-05-29 02:40:04'),(9,6,2,'Marca Morada',50,30.00,1500.00,0.40,600.00,1,'2026-05-29 02:40:04','2026-05-29 02:40:04'),(10,6,3,'Marca Morada',50,35.00,1750.00,0.40,700.00,1,'2026-05-29 02:40:04','2026-05-29 02:40:04'),(11,6,1,'Rafia Morada',10,110.00,1100.00,0.40,440.00,1,'2026-05-29 02:40:04','2026-05-29 02:40:04'),(12,7,1,'Rafia Negra',8,95.00,760.00,0.40,304.00,1,'2026-05-29 02:40:04','2026-05-29 02:40:04'),(13,8,2,'Marca Negra',100,35.00,3500.00,0.50,1750.00,1,'2026-05-29 02:40:04','2026-05-29 02:40:04'),(14,8,3,'Marca Negra',100,33.60,3360.00,0.50,1680.00,1,'2026-05-29 02:40:04','2026-05-29 02:40:04'),(15,9,1,'Marca Azul',2,90.00,180.00,0.50,90.00,2,'2026-05-29 17:47:44','2026-06-06 17:48:03'),(16,9,2,'Marca Azul',10,30.00,300.00,0.50,150.00,1,'2026-05-29 17:47:44','2026-06-06 17:48:03'),(17,10,2,'Marca verde',2,60.00,120.00,0.50,60.00,1,'2026-05-29 17:47:44','2026-05-29 17:47:44'),(18,11,1,'Rafia Morada',10,90.00,900.00,0.50,450.00,1,'2026-06-05 23:49:37','2026-06-05 23:49:37'),(19,11,2,'Marca Morada',50,30.00,1500.00,0.50,750.00,1,'2026-06-05 23:49:37','2026-06-05 23:49:37'),(20,11,2,'Marca Morada',100,25.00,2500.00,0.50,1250.00,1,'2026-06-05 23:49:37','2026-06-05 23:49:37'),(21,12,1,'Rafia Azul y Verde',15,110.00,1650.00,0.50,825.00,1,'2026-06-05 23:49:37','2026-06-05 23:49:37'),(22,13,2,'Marca Rojo y Azul',50,35.00,1750.00,0.50,875.00,1,'2026-06-05 23:49:37','2026-06-05 23:49:37'),(23,13,3,'Marca Rojo y Azul',50,50.00,2500.00,0.50,1250.00,1,'2026-06-05 23:49:37','2026-06-05 23:49:37'),(24,14,1,'Marca Azul',2,90.00,180.00,0.50,90.00,1,'2026-06-06 17:48:03','2026-06-06 17:48:03'),(25,14,2,'Marca Azul',5,30.00,150.00,0.50,75.00,1,'2026-06-06 17:48:03','2026-06-06 17:48:03'),(26,15,1,'Marca Verde',7,30.00,210.00,0.30,63.00,1,'2026-06-06 18:02:51','2026-06-06 18:03:54'),(27,16,3,'Marca Azul',15,30.00,450.00,0.30,135.00,2,'2026-06-06 18:02:51','2026-06-06 18:03:16'),(28,16,2,'Marca Azul con Negro',15,33.00,495.00,0.30,148.50,1,'2026-06-06 18:02:51','2026-06-06 18:03:16'),(29,17,3,'Marca Azul',15,30.00,450.00,0.30,135.00,1,'2026-06-06 18:03:16','2026-06-06 18:03:16'),(30,17,2,'Marca Azul con Negro',5,33.00,165.00,0.30,49.50,1,'2026-06-06 18:03:16','2026-06-06 18:03:16'),(31,18,1,'Marca Verde',8,30.00,240.00,0.30,72.00,1,'2026-06-06 18:03:54','2026-06-06 18:03:54'),(32,19,3,'Marca Verde',50,35.50,1775.00,0.30,532.50,1,'2026-06-06 18:05:09','2026-06-06 18:05:23'),(33,20,3,'Marca Verde',100,35.50,3550.00,0.30,1065.00,1,'2026-06-06 18:05:23','2026-06-06 18:05:23'),(34,21,1,'Marca Verde',10,90.00,900.00,0.50,450.00,2,'2026-06-06 23:57:21','2026-06-07 01:51:58'),(35,21,2,'Marca Verde',100,35.00,3500.00,0.50,1750.00,2,'2026-06-06 23:57:21','2026-06-07 01:51:58'),(36,21,3,'Marca Verde',100,20.00,2000.00,0.50,1000.00,1,'2026-06-06 23:57:21','2026-06-07 01:51:58'),(37,22,1,'Marca Roja con Amarillo',10,99.00,990.00,0.50,495.00,1,'2026-06-06 23:57:21','2026-06-06 23:57:21'),(38,23,2,'Marca Negra',80,45.00,3600.00,0.50,1800.00,2,'2026-06-06 23:57:21','2026-06-07 00:51:27'),(39,23,3,'Marca Negra',50,30.00,1500.00,0.50,750.00,1,'2026-06-06 23:57:21','2026-06-07 00:51:27'),(40,24,2,'Marca Negra',80,45.00,3600.00,0.50,1800.00,1,'2026-06-07 00:51:27','2026-06-07 00:51:27'),(41,24,3,'Marca Negra',200,30.00,6000.00,0.50,3000.00,1,'2026-06-07 00:51:27','2026-06-07 00:51:27'),(42,25,1,'Marca Negra',20,90.00,1800.00,0.40,720.00,1,'2026-06-07 00:54:25','2026-06-07 00:54:25'),(43,25,3,'Marca Negra',0,30.00,0.00,0.40,0.00,1,'2026-06-07 00:54:25','2026-06-08 05:16:59'),(44,26,2,'Marca Verde',100,35.00,3500.00,0.50,1750.00,1,'2026-06-07 01:51:58','2026-06-07 01:51:58'),(45,26,3,'Marca Verde',100,20.00,2000.00,0.50,1000.00,1,'2026-06-07 01:51:58','2026-06-07 01:51:58'),(46,26,1,'Marca Verde',10,90.00,900.00,0.50,450.00,1,'2026-06-07 01:51:58','2026-06-07 01:51:58'),(47,27,2,'Marca Verde',15,30.00,450.00,0.50,225.00,1,'2026-06-07 01:53:59','2026-06-07 01:53:59'),(48,27,1,'Rafia Verde',10,105.00,1050.00,0.50,525.00,2,'2026-06-07 01:53:59','2026-06-07 01:54:58'),(49,28,3,'Marca Roja',150,45.70,6855.00,0.50,3427.50,1,'2026-06-07 01:53:59','2026-06-07 01:53:59'),(50,28,2,'Marca Roja',200,50.00,10000.00,0.50,5000.00,1,'2026-06-07 01:53:59','2026-06-07 01:53:59'),(51,29,1,'Rafia Verde',10,105.00,1050.00,0.50,525.00,1,'2026-06-07 01:54:58','2026-06-07 01:54:58'),(52,30,1,'Marca Verde',5,90.00,450.00,0.60,270.00,1,'2026-06-07 02:07:16','2026-06-07 05:23:06'),(53,30,2,'Marca Rosa',10,50.00,500.00,0.60,300.00,1,'2026-06-07 02:07:16','2026-06-07 05:23:06'),(54,31,2,'Marca Negra',100,30.00,3000.00,0.60,1800.00,1,'2026-06-07 02:07:16','2026-06-07 02:07:16'),(55,31,3,'Marca Negra',200,45.00,9000.00,0.60,5400.00,1,'2026-06-07 02:07:16','2026-06-07 02:07:16'),(56,32,1,'Rafia Azul',5,107.60,538.00,0.60,322.80,1,'2026-06-07 02:07:16','2026-06-07 02:07:16'),(57,32,2,'Marca Azul',50,30.00,1500.00,0.60,900.00,1,'2026-06-07 02:07:16','2026-06-07 02:07:16'),(58,33,1,'Marca Verde',10,90.00,900.00,0.60,540.00,1,'2026-06-07 05:23:06','2026-06-07 05:23:06'),(59,33,2,'Marca Rosa',10,50.00,500.00,0.60,300.00,1,'2026-06-07 05:23:06','2026-06-07 05:23:06'),(60,34,3,'Marca Negra',250,30.00,7500.00,0.40,3000.00,1,'2026-06-08 05:16:59','2026-06-10 07:06:10'),(61,35,2,'Marca Verde',100,35.00,3500.00,0.60,2100.00,1,'2026-06-08 22:23:17','2026-06-08 22:23:17'),(62,35,3,'Marca Azul',0,33.60,0.00,0.60,0.00,1,'2026-06-08 22:23:17','2026-06-08 22:31:31'),(63,36,1,'Rafia Morada',0,98.60,0.00,0.60,0.00,1,'2026-06-08 22:23:17','2026-06-08 22:31:31'),(64,37,3,'Marca Azul',150,33.60,5040.00,0.60,3024.00,1,'2026-06-08 22:31:31','2026-06-08 22:31:31'),(65,38,1,'Rafia Morada',10,98.60,986.00,0.60,591.60,1,'2026-06-08 22:31:31','2026-06-08 22:31:31'),(66,39,3,'Marca Negra',200,30.00,6000.00,0.40,2400.00,1,'2026-06-10 07:06:10','2026-06-10 07:06:10'),(67,40,1,'Marca Azul',0,30.00,0.00,0.50,0.00,1,'2026-06-11 21:25:57','2026-06-11 21:38:00'),(68,41,1,'Marca Azul',120,30.00,3600.00,0.50,1800.00,1,'2026-06-11 21:38:00','2026-06-11 21:38:00'),(69,42,1,'Rafia Azul',15,90.00,1350.00,0.60,810.00,1,'2026-06-12 17:32:50','2026-06-12 17:32:50'),(70,42,2,'Marca Azul',150,50.00,7500.00,0.60,4500.00,1,'2026-06-12 17:32:50','2026-06-12 17:32:50'),(71,42,3,'Marca Verde',200,30.00,6000.00,0.60,3600.00,1,'2026-06-12 17:32:50','2026-06-12 17:32:50'),(72,43,1,'Rafia Morada',30,99.00,2970.00,0.60,1782.00,1,'2026-06-12 17:32:50','2026-06-12 17:32:50'),(73,44,1,'Marca Verde',15,105.00,1575.00,0.40,630.00,1,'2026-06-12 17:32:50','2026-06-12 17:32:50'),(74,45,1,'Rafia Morada',15,90.00,1350.00,0.60,810.00,1,'2026-06-12 17:32:50','2026-06-12 17:32:50'),(75,46,1,'Marca Verde',15,90.00,1350.00,0.80,1080.00,1,'2026-06-12 17:50:12','2026-06-12 17:50:12'),(76,46,2,'Marca Verde',20,30.00,600.00,0.40,240.00,1,'2026-06-12 17:50:12','2026-06-12 17:50:12');
/*!40000 ALTER TABLE `detalle_carga` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `incidencia_viaje`
--

DROP TABLE IF EXISTS `incidencia_viaje`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `incidencia_viaje` (
  `id_incidencia` int NOT NULL AUTO_INCREMENT,
  `id_viaje` int NOT NULL,
  `tipo_incidencia` enum('Falla Mecánica','Retraso en Ruta','Daño/Mala Estiba','Faltante / Pérdida','Accidente','Otro') NOT NULL COMMENT 'Categoría estadística de la causa raíz',
  `descripcion_detallada` text NOT NULL,
  `valor_total_perdida` decimal(10,2) DEFAULT '0.00' COMMENT 'Calculado por el sistema: Fletes perdidos',
  `gastos_adicionales` decimal(10,2) DEFAULT '0.00' COMMENT 'Gastos extra por siniestro (grúa, cochera, transbordo)',
  `monto_asumido_empresa` decimal(10,2) DEFAULT NULL COMMENT 'NULL hasta que administración decida',
  `monto_descuento_chofer` decimal(10,2) DEFAULT NULL COMMENT 'NULL hasta que administración decida',
  `monto_cobrado` decimal(10,2) DEFAULT '0.00' COMMENT 'Acumulador de cobros parciales realizados al chofer',
  `estado_cobro_penalidad` enum('Pendiente','Cobrado Parcial','Cobrado','Anulado') DEFAULT 'Pendiente' COMMENT 'Control del pago de la deuda del transportista',
  `estado_resolucion` enum('Pendiente','Resuelto') DEFAULT 'Pendiente',
  `id_usuario` int NOT NULL COMMENT 'Administrador que registró o resolvió la incidencia',
  `estado` tinyint(1) DEFAULT '1' COMMENT '1: Activo, 0: Eliminado lógico por error de registro',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_incidencia`),
  KEY `fk_incidencia_viaje` (`id_viaje`),
  KEY `fk_incidencia_usuario` (`id_usuario`),
  CONSTRAINT `fk_incidencia_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_incidencia_viaje` FOREIGN KEY (`id_viaje`) REFERENCES `viaje` (`id_viaje`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `incidencia_viaje`
--

LOCK TABLES `incidencia_viaje` WRITE;
/*!40000 ALTER TABLE `incidencia_viaje` DISABLE KEYS */;
INSERT INTO `incidencia_viaje` VALUES (1,13,'Falla Mecánica','Rotura de motor a la altura de Huarmey. El camión quedó inoperativo. Se contrató un camión externo de emergencia para hacer el transbordo de la mercadería y cumplir con el cliente. Las cargas de este viaje original se anulan, y se genera el gasto extra del remolque/transbordo.',2100.00,500.00,500.00,2100.00,0.00,'Pendiente','Resuelto',2,1,'2026-06-10 04:06:21','2026-06-10 04:06:21'),(2,13,'Otro','Pago de cochera temporal en la ciudad de Huarmey por resguardo del camión accidentado mientras se realizaba el transbordo.',0.00,150.00,150.00,0.00,0.00,'Pendiente','Resuelto',2,1,'2026-06-10 04:22:10','2026-06-10 04:22:10'),(3,8,'Daño/Mala Estiba','El chofer frenó bruscamente cerca a Trujillo, provocando la caída y daño total de los productos de la Carga 1 y Carga 2. El chofer asume la responsabilidad de esta mercadería.',1495.00,0.00,0.00,1495.00,0.00,'Pendiente','Resuelto',2,1,'2026-06-10 04:31:24','2026-06-10 04:31:24'),(4,8,'Daño/Mala Estiba','La Carga 3 llegó aplastada. Tras revisar las cámaras de Lima, se determinó que los estibadores de la empresa colocaron pallets muy pesados sobre mercadería frágil. Error de almacén.',750.00,0.00,750.00,0.00,0.00,'Pendiente','Resuelto',2,1,'2026-06-10 04:32:05','2026-06-10 04:32:05');
/*!40000 ALTER TABLE `incidencia_viaje` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `opciones`
--

DROP TABLE IF EXISTS `opciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `opciones` (
  `id_opcion` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ruta` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Identificador de la vista SPA para AJAX',
  `icono` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` tinyint NOT NULL DEFAULT '1' COMMENT '0=inactivo, 1=activo, 2=eliminado',
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_opcion`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opciones`
--

LOCK TABLES `opciones` WRITE;
/*!40000 ALTER TABLE `opciones` DISABLE KEYS */;
INSERT INTO `opciones` VALUES (1,'Dashboard','dashboard','fas fa-home',1,'2026-05-08 05:04:23','2026-05-08 05:04:23'),(2,'Gestión de Usuarios','usuarios','fas fa-users',1,'2026-05-08 05:04:23','2026-05-08 05:04:23'),(3,'Gestión de Perfiles','perfiles','fas fa-id-card',1,'2026-05-08 05:04:23','2026-05-08 05:04:23'),(4,'Gestión de Opciones','opciones','fas fa-cogs',1,'2026-05-08 06:39:25','2026-05-08 06:39:25'),(5,'Gestión de Clientes','clientes','fas fa-users',1,'2026-05-12 13:40:07','2026-05-12 13:40:07'),(6,'Gestión de Productos','productos','fas fa-box',1,'2026-05-12 13:40:07','2026-05-12 13:40:07'),(7,'Gestión de Rutas','rutas','fas fa-route',1,'2026-05-20 06:03:24','2026-05-20 06:03:24'),(8,'Gestión de Camiones','camiones','fas fa-truck',1,'2026-05-20 06:12:11','2026-05-20 06:12:11'),(9,'Registro de Viajes','registro_viajes','fas fa-truck-loading',1,'2026-05-25 15:56:14','2026-05-25 15:56:14'),(10,'Historial de Viajes','historial_viajes','fas fa-history',1,'2026-05-29 02:11:22','2026-05-29 02:11:22'),(11,'Recepción y Entregas','recepcion_entregas','fas fa-dolly',1,'2026-06-05 17:47:04','2026-06-05 17:47:04'),(12,'Deudas por Cobrar','deudas_cobrar','fas fa-hand-holding-usd',1,'2026-06-11 01:04:19','2026-06-11 01:04:19'),(13,'Liquidación Choferes','liquidacion','fa-solid fa-money-bill',1,'2026-06-12 17:06:40','2026-06-12 17:06:40');
/*!40000 ALTER TABLE `opciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pago_carga`
--

DROP TABLE IF EXISTS `pago_carga`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pago_carga` (
  `id_pago` int NOT NULL AUTO_INCREMENT,
  `id_carga` int NOT NULL,
  `id_cuenta` int DEFAULT NULL,
  `monto_pagado` decimal(10,2) NOT NULL,
  `tipo_pago` enum('Efectivo','Transferencia','Deposito','Billetera Digital') NOT NULL,
  `nro_operacion` varchar(50) DEFAULT NULL,
  `ruta_comprobante` varchar(255) DEFAULT NULL,
  `observacion` text,
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
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pago_carga`
--

LOCK TABLES `pago_carga` WRITE;
/*!40000 ALTER TABLE `pago_carga` DISABLE KEYS */;
INSERT INTO `pago_carga` VALUES (1,39,3,2400.00,'Transferencia','OP-998877',NULL,NULL,1,1,'2026-06-11 10:30:00','2026-06-12 00:26:42'),(2,33,NULL,300.00,'Efectivo',NULL,NULL,NULL,0,1,'2026-06-11 09:15:00','2026-06-12 09:47:24'),(3,32,1,12.00,'Billetera Digital','1756799','https://res.cloudinary.com/dduzlmlna/image/upload/v1781249804/sistema_joselito/comprobantes/voucher_1781249802792.jpg','Pago de 12 soles como prueba',1,1,'2026-06-12 02:35:00','2026-06-12 07:36:44'),(4,32,2,50.00,'Billetera Digital','26561558','https://res.cloudinary.com/dduzlmlna/image/upload/v1781250091/sistema_joselito/comprobantes/voucher_1781250090161.jpg','Pago de 50 soles de prueba',1,1,'2026-06-12 02:40:00','2026-06-12 07:41:31'),(5,29,NULL,525.00,'Efectivo',NULL,NULL,NULL,1,1,'2026-06-12 02:42:00','2026-06-12 07:42:39'),(6,33,3,500.00,'Deposito','OP-965214',NULL,'Prueba sin voucher',1,1,'2026-06-12 05:49:00','2026-06-12 10:49:48'),(7,37,2,1500.00,'Billetera Digital','57896585','https://res.cloudinary.com/dduzlmlna/image/upload/v1781282986/sistema_joselito/comprobantes/voucher_1781282984557.jpg','Pagamos',1,1,'2026-06-12 11:49:00','2026-06-12 16:49:46'),(8,37,3,500.00,'Transferencia','655955','https://res.cloudinary.com/dduzlmlna/image/upload/v1781284937/sistema_joselito/comprobantes/voucher_1781284936404.jpg','ksdkfksdkfsd',0,1,'2026-06-12 12:21:00','2026-06-12 17:23:19');
/*!40000 ALTER TABLE `pago_carga` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `perfil_opcion`
--

DROP TABLE IF EXISTS `perfil_opcion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `perfil_opcion` (
  `id_perfil` int NOT NULL,
  `id_opcion` int NOT NULL,
  PRIMARY KEY (`id_perfil`,`id_opcion`),
  KEY `id_opcion` (`id_opcion`),
  CONSTRAINT `perfil_opcion_ibfk_1` FOREIGN KEY (`id_perfil`) REFERENCES `perfiles` (`id_perfil`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `perfil_opcion_ibfk_2` FOREIGN KEY (`id_opcion`) REFERENCES `opciones` (`id_opcion`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `perfil_opcion`
--

LOCK TABLES `perfil_opcion` WRITE;
/*!40000 ALTER TABLE `perfil_opcion` DISABLE KEYS */;
INSERT INTO `perfil_opcion` VALUES (1,1),(2,1),(3,1),(4,1),(5,1),(1,2),(2,2),(1,3),(2,3),(1,4),(2,4),(1,5),(2,5),(1,6),(2,6),(1,7),(2,7),(1,8),(2,8),(1,9),(2,9),(1,10),(2,10),(1,11),(2,11),(1,12),(2,12),(2,13);
/*!40000 ALTER TABLE `perfil_opcion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `perfiles`
--

DROP TABLE IF EXISTS `perfiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `perfiles` (
  `id_perfil` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `estado` tinyint NOT NULL DEFAULT '1' COMMENT '0=inactivo, 1=activo, 2=eliminado',
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_perfil`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `perfiles`
--

LOCK TABLES `perfiles` WRITE;
/*!40000 ALTER TABLE `perfiles` DISABLE KEYS */;
INSERT INTO `perfiles` VALUES (1,'Desarrollador','Perfil Oculto de Arquitectura',1,'2026-05-08 06:46:26','2026-05-08 14:42:28'),(2,'Administrador','Perfil con acceso total a todas las opciones del sistema',1,'2026-05-08 05:04:23','2026-05-08 14:42:56'),(3,'Administrador Sede','Administrador de la Sede de Chiclayo',1,'2026-05-08 06:24:39','2026-05-08 14:42:56'),(4,'Dashboard','Solo acceso al dashboard',1,'2026-05-08 14:39:10','2026-05-08 15:27:54'),(5,'Contabilidad','Acceso a los módulos de cobro y liquidaciones',1,'2026-05-08 16:16:48','2026-05-08 16:16:58');
/*!40000 ALTER TABLE `perfiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `productos`
--

DROP TABLE IF EXISTS `productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productos` (
  `id_producto` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `estado` tinyint NOT NULL DEFAULT '1' COMMENT '0: Inactivo, 1: Activo, 2: Eliminado',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_producto`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `productos`
--

LOCK TABLES `productos` WRITE;
/*!40000 ALTER TABLE `productos` DISABLE KEYS */;
INSERT INTO `productos` VALUES (1,'Saco de kion',NULL,1,'2026-05-12 14:56:59','2026-05-12 15:12:39'),(2,'Ajo Cajamarquino','Ajo para pelar y desgranar',1,'2026-05-12 15:11:39','2026-05-12 17:17:52'),(3,'Ajo Chino',NULL,1,'2026-05-12 15:33:51','2026-05-12 15:33:51');
/*!40000 ALTER TABLE `productos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rutas`
--

DROP TABLE IF EXISTS `rutas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rutas` (
  `id_ruta` int NOT NULL AUTO_INCREMENT,
  `ciudad_origen` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ciudad de origen de la ruta',
  `ciudad_destino` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ciudad de destino de la ruta',
  `descripcion` text COLLATE utf8mb4_unicode_ci COMMENT 'Detalles adicionales o puntos intermedios',
  `estado` tinyint(1) NOT NULL DEFAULT '1' COMMENT '0=inactivo, 1=activo, 2=eliminado',
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_ruta`),
  UNIQUE KEY `uq_origen_destino` (`ciudad_origen`,`ciudad_destino`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro de rutas lógicas cubiertas por la empresa';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rutas`
--

LOCK TABLES `rutas` WRITE;
/*!40000 ALTER TABLE `rutas` DISABLE KEYS */;
INSERT INTO `rutas` VALUES (1,'LIMA','CHICLAYO','Paradas en Chepén',1,'2026-05-20 06:13:44','2026-05-20 06:13:44'),(2,'CHICLAYO','LIMA',NULL,1,'2026-05-27 22:18:29','2026-05-27 22:18:29');
/*!40000 ALTER TABLE `rutas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `id_perfil` int NOT NULL,
  `nombre` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `clave` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Hash bcrypt',
  `estado` tinyint NOT NULL DEFAULT '1' COMMENT '0=inactivo, 1=activo, 2=eliminado',
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `usuario` (`usuario`),
  KEY `id_perfil` (`id_perfil`),
  CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`id_perfil`) REFERENCES `perfiles` (`id_perfil`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,1,'Desarrollador','developer','$2b$10$PIFX4ryhDbYs4bfi3jfOV.KqqhQollcGprSxZuOIDEPZupaHqcGb6',1,'2026-05-08 06:46:26','2026-05-08 15:26:35'),(2,2,'Administrador','admin','$2b$10$3Fc2uSgrvHJylWpRoMbOdeS9Oa7y4RxmeymeiDwEkcYzfCEwmPNqW',1,'2026-05-08 05:04:23','2026-05-08 14:52:54'),(3,3,'Luis Castillo','Luis','$2b$10$TLKzDd5VRGuYOw4TTItvmupn3Vks33SCrGSwLmfxRx5ZZe6HPyNoS',1,'2026-05-08 06:25:33','2026-05-08 14:43:07'),(4,4,'admin2','admin2','$2b$10$Ow3achrtouLsK4kXI7CyW.R6aLVy3dNHDr8A5cCqUTXh1kDwOgcRm',1,'2026-05-08 14:54:45','2026-05-08 15:27:24');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `viaje`
--

DROP TABLE IF EXISTS `viaje`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `viaje` (
  `id_viaje` int NOT NULL AUTO_INCREMENT,
  `id_camion` int NOT NULL,
  `id_ruta` int NOT NULL,
  `tarifa_transportista` decimal(10,2) NOT NULL COMMENT 'Tarifa acordada para pagar al transportista por kg',
  `fecha_salida` datetime DEFAULT NULL,
  `fecha_llegada` datetime DEFAULT NULL,
  `estado_pagos` varchar(50) DEFAULT NULL COMMENT 'Controla el estado de los pagos asociados a este viaje',
  `estado_operativo` enum('En Ruta','Llegó a Destino','Finalizado','Incidencia') DEFAULT 'En Ruta' COMMENT 'Estado físico del viaje',
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
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `viaje`
--

LOCK TABLES `viaje` WRITE;
/*!40000 ALTER TABLE `viaje` DISABLE KEYS */;
INSERT INTO `viaje` VALUES (1,1,1,0.20,'2026-05-05 00:00:00','2026-05-06 14:44:04',NULL,'Finalizado',2,1,'2026-05-28 04:34:18','2026-06-12 08:29:42',NULL),(2,2,1,0.10,'2026-05-28 00:00:00','2026-05-29 11:05:36',NULL,'Finalizado',2,1,'2026-05-28 05:21:47','2026-06-06 00:03:26',NULL),(3,3,1,0.20,'2026-05-28 21:37:00','2026-06-06 12:57:40',NULL,'Finalizado',2,1,'2026-05-29 02:40:04','2026-06-06 17:57:57',NULL),(4,2,1,0.30,'2026-05-29 12:40:00','2026-06-05 21:12:01',NULL,'Finalizado',2,1,'2026-05-29 17:47:44','2026-06-06 18:05:54',NULL),(5,3,1,0.20,'2026-06-04 18:47:00','2026-06-05 18:49:48',NULL,'Finalizado',2,1,'2026-06-05 23:49:37','2026-06-05 23:50:03',NULL),(6,3,1,0.10,'2026-06-06 13:02:00','2026-06-06 13:03:00',NULL,'Finalizado',2,1,'2026-06-06 18:02:51','2026-06-06 18:05:56',NULL),(7,2,1,0.10,'2026-06-06 13:05:00','2026-06-06 13:05:15',NULL,'Finalizado',2,1,'2026-06-06 18:05:09','2026-06-06 18:05:23',NULL),(8,2,1,0.20,'2026-06-06 18:54:00','2026-06-06 18:58:13',NULL,'Finalizado',2,1,'2026-06-06 23:57:21','2026-06-07 01:51:58',NULL),(9,3,1,0.25,'2026-06-06 19:53:00',NULL,NULL,'Incidencia',2,1,'2026-06-07 00:54:25','2026-06-08 05:16:59',NULL),(10,1,1,0.10,'2026-06-06 20:52:00','2026-06-06 20:54:37',NULL,'Finalizado',2,1,'2026-06-07 01:53:59','2026-06-09 04:45:34',NULL),(11,3,1,0.30,'2026-06-06 21:05:00','2026-06-07 00:22:41',NULL,'Finalizado',2,1,'2026-06-07 02:07:16','2026-06-07 05:23:26',NULL),(12,1,1,0.30,'2026-06-08 00:16:00','2026-06-08 18:34:24',NULL,'Finalizado',1,1,'2026-06-08 05:16:59','2026-06-10 07:06:10',9),(13,2,1,0.30,'2026-06-08 17:22:00',NULL,NULL,'Incidencia',2,1,'2026-06-08 22:23:17','2026-06-08 22:31:31',NULL),(14,1,1,0.30,'2026-06-08 17:28:00','2026-06-11 13:09:44',NULL,'Llegó a Destino',1,1,'2026-06-08 22:31:31','2026-06-11 18:09:44',13),(15,1,1,0.20,'2026-06-11 16:25:00',NULL,NULL,'Incidencia',2,1,'2026-06-11 21:25:57','2026-06-11 21:38:00',NULL),(16,2,1,0.30,'2026-06-11 16:37:00',NULL,NULL,'En Ruta',1,1,'2026-06-11 21:38:00','2026-06-11 21:38:00',15),(17,1,1,0.20,'2026-06-12 12:18:00',NULL,NULL,'En Ruta',1,1,'2026-06-12 17:32:50','2026-06-12 17:32:50',NULL),(18,1,1,0.30,'2026-06-12 12:46:00',NULL,NULL,'En Ruta',1,1,'2026-06-12 17:50:12','2026-06-12 17:50:12',NULL);
/*!40000 ALTER TABLE `viaje` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-18 23:55:25
