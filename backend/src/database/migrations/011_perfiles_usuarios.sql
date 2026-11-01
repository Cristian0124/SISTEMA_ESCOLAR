BEGIN;
CREATE TABLE perfiles_usuarios (
  usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  datos_contacto JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(datos_contacto) = 'object'),
  hoja_vida JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(hoja_vida) = 'object'),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMIT;
