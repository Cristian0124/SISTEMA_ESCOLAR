import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generarResumenPdf } from '../src/services/documentos.service';
import { leerPdf } from './pdf.fixture';

test('PDF legible, con tildes, contenido completo y varias páginas', async () => {
  const cursos = Array.from({ length: 45 }, (_, i) => ({
    codigo: `PR${i}`, nombre: `Asignatura ${i}: Matemáticas y programación con un nombre extenso para comprobar los saltos de línea`,
    horario: 'Miércoles 08:00 - 10:00; Viernes 14:00 - 16:00', creditos: 3
  }));
  const pdf = await generarResumenPdf({
    estudiante: { id: 1, nombre: 'María Muñoz', cedula: '12345', carrera: 'Ingeniería de Sistemas' },
    periodo: '2026-2', cursos, totalCreditos: 135
  });
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  const { texto, paginas } = await leerPdf(pdf);
  assert.ok(paginas > 1);
  for (const fragmento of ['María Muñoz', '12345', 'Ingeniería de Sistemas', '2026-2',
    'Miércoles 08:00 - 10:00', 'Total de créditos: 135', 'No constituye una certificación oficial.']) {
    assert.ok(texto.includes(fragmento), fragmento);
  }
  for (const curso of cursos) assert.ok(texto.includes(`${curso.codigo} -`));
});
