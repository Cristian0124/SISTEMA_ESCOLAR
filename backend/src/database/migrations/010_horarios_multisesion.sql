BEGIN;
DROP TRIGGER cursos_sincronizar_horario ON cursos;
ALTER TABLE cursos ALTER COLUMN horario TYPE VARCHAR(1000);
CREATE TRIGGER cursos_sincronizar_horario AFTER INSERT OR UPDATE OF horario ON cursos
FOR EACH ROW EXECUTE FUNCTION sincronizar_horario_curso();
COMMIT;
