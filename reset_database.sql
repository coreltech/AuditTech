-- ADVERTENCIA: Este comando borrará TODOS los datos de tu sistema para dejarlo en blanco.
-- Solo úsalo cuando estés listo para empezar a cargar tus datos reales.

-- Borrado en orden de dependencias
TRUNCATE TABLE attendances, classes, students, courses, payments, settlements CASCADE;

-- Si quieres reiniciar también los generadores de IDs (opcional pero limpio)
-- ALTER SEQUENCE courses_id_seq RESTART WITH 1; -- Supabase usa UUIDs por defecto, así que esto no suele ser necesario.
