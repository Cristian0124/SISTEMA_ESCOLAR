CREATE TABLE periodos_matricula (
 codigo VARCHAR(6) PRIMARY KEY CHECK (codigo ~ '^[0-9]{4}-[12]$'),
 apertura TIMESTAMPTZ NOT NULL,
 cierre TIMESTAMPTZ NOT NULL,
 habilitado BOOLEAN NOT NULL DEFAULT FALSE,
 CHECK (apertura < cierre)
);
CREATE TABLE solicitudes_matricula (
 id UUID PRIMARY KEY,
 usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
 curso_id INTEGER NOT NULL REFERENCES cursos(id),
 periodo VARCHAR(6) NOT NULL REFERENCES periodos_matricula(codigo),
 clave UUID NOT NULL,
 correlacion VARCHAR(64) NOT NULL,
 estado TEXT NOT NULL DEFAULT 'en_espera' CHECK (estado IN ('en_espera','procesando','confirmada','rechazada')),
 intentos INTEGER NOT NULL DEFAULT 0,
 disponible_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 token UUID,
 vence_en TIMESTAMPTZ,
 matricula_id INTEGER REFERENCES matriculas(id) ON DELETE SET NULL,
 motivo TEXT,
 codigo_error TEXT,
 creada_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 terminada_en TIMESTAMPTZ,
 UNIQUE(usuario_id, clave)
);
CREATE UNIQUE INDEX solicitudes_matricula_activa_uq ON solicitudes_matricula(usuario_id,curso_id,periodo)
 WHERE estado IN ('en_espera','procesando');
CREATE INDEX solicitudes_matricula_cola_idx ON solicitudes_matricula(disponible_en,creada_en) WHERE estado='en_espera';
CREATE INDEX solicitudes_matricula_lease_idx ON solicitudes_matricula(vence_en) WHERE estado='procesando';
CREATE TABLE reservas_cupos (
 solicitud_id UUID PRIMARY KEY REFERENCES solicitudes_matricula(id) ON DELETE CASCADE,
 curso_id INTEGER NOT NULL REFERENCES cursos(id),
 periodo VARCHAR(6) NOT NULL,
 token UUID NOT NULL,
 vence_en TIMESTAMPTZ NOT NULL
);
CREATE INDEX reservas_cupos_ocupacion_idx ON reservas_cupos(curso_id,periodo,vence_en);
CREATE TABLE workers_matricula (
 id UUID PRIMARY KEY,
 actualizado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE limites_http (
 clave TEXT PRIMARY KEY,
 cantidad INTEGER NOT NULL,
 vence_en TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS sis_migraciones (archivo TEXT PRIMARY KEY, aplicada_en TIMESTAMPTZ NOT NULL DEFAULT NOW());
INSERT INTO sis_migraciones(archivo) VALUES ('001_esquema.sql'),('002_catalogo_academico.sql'),('003_matricula_masiva.sql') ON CONFLICT DO NOTHING;
