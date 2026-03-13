-- Script SQL para actualizar la tabla 'students' con datos de contacto

-- 1. Añadimos las nuevas columnas opcionales
ALTER TABLE students ADD COLUMN cedula TEXT;
ALTER TABLE students ADD COLUMN phone TEXT;
ALTER TABLE students ADD COLUMN email TEXT;

-- Nota: No es necesario valor por defecto ya que son opcionales y pueden ser NULL.
