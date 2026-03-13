-- Script SQL para actualizar la tabla 'courses' con los nuevos requerimientos (Día, Horario y Duración)

-- 1. Añadimos las nuevas columnas
ALTER TABLE courses ADD COLUMN day_of_week TEXT;
ALTER TABLE courses ADD COLUMN schedule TEXT;
ALTER TABLE courses ADD COLUMN duration_weeks INTEGER;

-- 2. (Opcional) Si quieres que los cursos que ya habías creado tengan un valor por defecto para que no se vean vacíos:
UPDATE courses SET day_of_week = 'Lunes', schedule = '00:00 - 00:00', duration_weeks = 8 WHERE day_of_week IS NULL;
