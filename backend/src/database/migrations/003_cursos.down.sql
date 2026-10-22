BEGIN;

ALTER TABLE matriculas
  DROP CONSTRAINT IF EXISTS matriculas_curso_id_fkey;

DROP TABLE IF EXISTS cursos;

COMMIT;
