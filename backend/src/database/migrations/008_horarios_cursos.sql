BEGIN;

-- ISO: lunes=1, domingo=7. Sin sesiones significa pendiente de revisión.
CREATE TABLE curso_horarios (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  dia SMALLINT NOT NULL CHECK (dia BETWEEN 1 AND 7),
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  CHECK (hora_inicio < hora_fin),
  UNIQUE (curso_id, dia, hora_inicio, hora_fin)
);

-- Solo convierte un día explícito con intervalo completo en formato de 24 horas.
CREATE FUNCTION sincronizar_horario_curso() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE partes TEXT[];
  dias TEXT[] := ARRAY['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];
BEGIN
  DELETE FROM curso_horarios WHERE curso_id = NEW.id;
  partes := regexp_match(lower(trim(NEW.horario)),
    '^(lunes|martes|miércoles|jueves|viernes|sábado|domingo) +([0-9]{1,2}:[0-9]{2}) *- *([0-9]{1,2}:[0-9]{2})$');
  IF partes IS NOT NULL AND partes[2] ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
    AND partes[3] ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' THEN
    IF partes[2]::time < partes[3]::time THEN
      INSERT INTO curso_horarios(curso_id, dia, hora_inicio, hora_fin)
      VALUES (NEW.id, array_position(dias, partes[1]), partes[2]::time, partes[3]::time);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cursos_sincronizar_horario AFTER INSERT OR UPDATE OF horario ON cursos
FOR EACH ROW EXECUTE FUNCTION sincronizar_horario_curso();
UPDATE cursos SET horario = horario;
COMMIT;
