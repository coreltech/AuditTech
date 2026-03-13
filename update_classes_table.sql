-- Script SQL para actualizar la tabla 'classes' para incluir contenido y hora de la clase

-- 1. Añadimos las nuevas columnas
ALTER TABLE classes ADD COLUMN content TEXT;
ALTER TABLE classes ADD COLUMN class_time TIME;

-- (Opcional) Si quieres actualizar clases viejas con valores por defecto:
-- UPDATE classes SET content = 'N/A', class_time = '00:00' WHERE content IS NULL;
