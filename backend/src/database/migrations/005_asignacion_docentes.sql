BEGIN;

ALTER TABLE cursos
  ADD COLUMN IF NOT EXISTS docente_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cursos_docente_id_fkey'
      AND conrelid = 'cursos'::regclass
  ) THEN
    ALTER TABLE cursos
      ADD CONSTRAINT cursos_docente_id_fkey
      FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE SET NULL;
  END IF;
END
$$;


UPDATE cursos SET docente_id = NULL;

ALTER TABLE cursos
  DROP COLUMN IF EXISTS docente;

COMMIT;
