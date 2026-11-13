CREATE TABLE telemetria_pruebas_carga (
  id UUID PRIMARY KEY,
  estado TEXT NOT NULL CHECK (estado IN ('preparando','ejecutando','verificando','completada','fallida')),
  estudiantes INTEGER NOT NULL CHECK (estudiantes > 0),
  cupos INTEGER NOT NULL CHECK (cupos > 0 AND cupos <= estudiantes),
  conexiones INTEGER NOT NULL CHECK (conexiones > 0),
  pausa_ms INTEGER NOT NULL CHECK (pausa_ms >= 0),
  pid INTEGER NOT NULL,
  progreso JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(progreso) = 'object'),
  proceso JSONB CHECK (proceso IS NULL OR jsonb_typeof(proceso) = 'object'),
  resultado JSONB CHECK (resultado IS NULL OR jsonb_typeof(resultado) = 'object'),
  mensaje TEXT,
  iniciada_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  actualizada_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  terminada_en TIMESTAMPTZ
);
CREATE INDEX telemetria_pruebas_carga_fecha_idx ON telemetria_pruebas_carga(iniciada_en DESC);
INSERT INTO sis_migraciones(archivo) VALUES ('004_telemetria_carga.sql') ON CONFLICT DO NOTHING;
