BEGIN;

CREATE TABLE sesiones_auth (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  refresh_hash CHAR(64) NOT NULL UNIQUE CHECK (refresh_hash ~ '^[0-9a-f]{64}$'),
  vence_en TIMESTAMPTZ NOT NULL,
  revocada_en TIMESTAMPTZ,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX sesiones_auth_usuario_idx ON sesiones_auth(usuario_id);
CREATE INDEX sesiones_auth_vencimiento_idx ON sesiones_auth(vence_en);

-- Las sesiones del antiguo Set no se importan: requieren un nuevo login.
COMMIT;
