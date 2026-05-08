-- Script para insertar el módulo "Gestión de Opciones" y asignarlo al Administrador (id_perfil = 1)
-- Ejecutar en la base de datos: JoselitoBD

-- 1. Insertamos la nueva opción en la tabla 'opciones'
INSERT INTO opciones (nombre, ruta, icono, estado)
VALUES ('Gestión de Opciones', 'opciones', 'fas fa-cogs', 1);

-- 2. Buscamos el ID recién insertado y lo asignamos al Perfil 1 (Administrador Principal)
SET @id_nueva_opcion = LAST_INSERT_ID();

INSERT INTO perfil_opcion (id_perfil, id_opcion)
VALUES (1, @id_nueva_opcion);

-- NOTA: Si ya tenías opciones previas, su ID autoincremental será asignado correctamente.
