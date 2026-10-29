import json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
programas = json.loads((root/'src/data/oferta-usc.json').read_text(encoding='utf-8'))
def sql(v): return "'"+v.replace("'", "''")+"'"
texto = '''-- Catálogo USC consultado el 28 de octubre de 2026. No altera notas ni matrículas existentes.
BEGIN;
CREATE TABLE facultades (
 codigo VARCHAR(10) PRIMARY KEY,
 nombre VARCHAR(150) NOT NULL
);
CREATE TABLE carreras (
 codigo VARCHAR(10) PRIMARY KEY,
 facultad_codigo VARCHAR(10) NOT NULL REFERENCES facultades(codigo),
 nombre VARCHAR(150) NOT NULL,
 nivel VARCHAR(30) NOT NULL,
 modalidad VARCHAR(30) NOT NULL,
 fuente TEXT NOT NULL,
 consultado_en DATE NOT NULL,
 prerrequisitos_verificados BOOLEAN NOT NULL DEFAULT FALSE
);
INSERT INTO facultades VALUES ('ING', 'Facultad de Ingeniería');
ALTER TABLE usuarios ADD COLUMN carrera_codigo VARCHAR(10) REFERENCES carreras(codigo);
ALTER TABLE materias_pensum ADD COLUMN carrera_codigo VARCHAR(10) REFERENCES carreras(codigo);
CREATE INDEX ON materias_pensum(carrera_codigo, semestre);
CREATE INDEX ON usuarios(carrera_codigo);
ALTER TABLE solicitudes_creditos DROP CONSTRAINT IF EXISTS solicitudes_creditos_creditos_check;
ALTER TABLE solicitudes_creditos ADD CONSTRAINT solicitudes_creditos_creditos_check CHECK (creditos > 0);
'''
for p in programas:
 texto += 'INSERT INTO carreras (codigo, facultad_codigo, nombre, nivel, modalidad, fuente, consultado_en) VALUES ('+', '.join(sql(v) for v in [p['codigo'],'ING',p['nombre'],p['nivel'],p['modalidad'],p['fuente'],p['consultadoEn']])+');\n'
 for m in p['materias']:
  texto += f"INSERT INTO materias_pensum (codigo, nombre, semestre, creditos, carrera_codigo) VALUES ({sql(m['codigo'])}, {sql(m['nombre'])}, {m['semestre']}, {m['creditos']}, {sql(p['codigo'])});\n"
texto += '''
-- Los registros anteriores quedan sin carrera; el catálogo antiguo sigue disponible solo para ellos.
CREATE FUNCTION materia_del_programa(codigo VARCHAR, estudiante INTEGER) RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
 SELECT EXISTS (
  SELECT 1 FROM materias_pensum m JOIN usuarios u ON u.id = estudiante
  WHERE m.codigo = $1 AND m.carrera_codigo IS NOT DISTINCT FROM u.carrera_codigo
 )
$$;
COMMIT;
'''
(root/'src/database/migrations/007_facultades_carreras.sql').write_text(texto, encoding='utf-8')
