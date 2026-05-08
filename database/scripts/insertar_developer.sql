-- Ejecutar en JoselitoBD

-- 1. Insertamos el Perfil "Desarrollador" con ID fijo 999
INSERT INTO perfiles (id_perfil, nombre, descripcion, estado) 
VALUES (999, 'Desarrollador', 'Perfil Oculto de Arquitectura', 1)
ON DUPLICATE KEY UPDATE nombre='Desarrollador';

-- 2. Insertamos al usuario "developer" (la contraseña bcrypt es "developer123")
INSERT INTO usuarios (id_perfil, nombre, usuario, clave, estado)
VALUES (999, 'Super Administrador', 'developer', '$2a$10$tZ2.Q2xJg1uS/2OqZfUWeO5tT/NRYl8d7qO8x3hBf2h7TXZU7/a3C', 1);

-- 3. Reasignación Exclusiva del Módulo "Gestión de Opciones"
-- Buscamos cuál es el ID del módulo de opciones creado en el paso anterior
SET @id_opcion_gestion = (SELECT id_opcion FROM opciones WHERE ruta = 'opciones' LIMIT 1);

-- Le quitamos este acceso a TODOS los perfiles actuales (por ejemplo, el admin id_perfil = 1)
DELETE FROM perfil_opcion WHERE id_opcion = @id_opcion_gestion;

-- Le asignamos el acceso única y exclusivamente al Desarrollador
INSERT INTO perfil_opcion (id_perfil, id_opcion) 
VALUES (999, @id_opcion_gestion);
