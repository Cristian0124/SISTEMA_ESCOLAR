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

-- Preserve legacy instructor names and convert any exact match to a user FK.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cursos' AND column_name = 'docente'
  ) THEN
    ALTER TABLE cursos ADD COLUMN IF NOT EXISTS docente_legacy VARCHAR(150);

    EXECUTE $migrate$
      UPDATE cursos AS curso
      SET docente_id = usuario.id
      FROM usuarios AS usuario
      WHERE curso.docente_id IS NULL
        AND usuario.rol = 'profesor'
        AND usuario.activo = TRUE
        AND LOWER(BTRIM(usuario.nombre)) = LOWER(BTRIM(curso.docente))
    $migrate$;

    EXECUTE $archive$
      UPDATE cursos
      SET docente_legacy = docente
      WHERE docente_id IS NULL AND docente IS NOT NULL
    $archive$;

    ALTER TABLE cursos DROP COLUMN docente;
  END IF;
END
$$;

COMMIT;
