"""Descarga planes públicos de USC y genera catálogo y migración revisables."""
import concurrent.futures
import html
import json
import re
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
PROGRAMAS = [
 ('TPI', 'Tecnología en Gestión de Procesos Industriales', 'tecnologia-en-gestion-de-procesos-industriales'),
 ('TSW', 'Tecnología en Desarrollo de Sistemas de Información y de Software', 'tecnologia-en-desarrollo-de-sistemas-de-informacion-y-de-software'),
 ('BIO', 'Bioingeniería', 'bioingenieria'),
 ('CIV', 'Ingeniería Civil', 'ingenieria-civil'),
 ('QUI', 'Ingeniería Química', 'ingenieria-quimica'),
 ('IND', 'Ingeniería Industrial', 'ingenieria-industrial'),
 ('ELE', 'Ingeniería Electrónica', 'ingenieria-electronica'),
 ('ENE', 'Ingeniería en Energías', 'ingenieria-en-energias'),
 ('SIS', 'Ingeniería de Sistemas', 'ingenieria-de-sistemas'),
 ('SIV', 'Ingeniería de Sistemas – Virtual', 'ingenieria-de-sistemas-virtual'),
 ('VID', 'Ingeniería en Desarrollo de Videojuegos', 'ingenieria-desarrollo-videojuegos'),
]
ROMANOS = ['I','II','III','IV','V','VI','VII','VIII','IX','X']
def limpiar(texto):
 return ' '.join(html.unescape(re.sub('<[^>]+>', ' ', texto)).split())
def descargar(item):
 codigo, nombre, slug = item
 url = 'https://www.usc.edu.co/' + slug + '/'
 respuesta = requests.get(url, timeout=60)
 respuesta.raise_for_status()
 texto = respuesta.content.decode('utf-8')
 texto = texto[texto.index('>Plan de estudios'):]
 partes = re.split(r'Semestre\s+([IVX]+)\s*</a>', texto, flags=re.I)
 materias = []
 for i in range(1, len(partes), 2):
  semestre = ROMANOS.index(partes[i].upper()) + 1
  tabla = re.search(r'<table\b.*?</table>', partes[i+1], re.S)
  if not tabla: raise ValueError((codigo, semestre, 'sin tabla'))
  for fila in re.findall(r'<tr\b[^>]*>(.*?)</tr>', tabla[0], re.S):
   celdas = [limpiar(c) for c in re.findall(r'<t[dh]\b[^>]*>(.*?)</t[dh]>', fila, re.S)]
   if len(celdas) != 2: continue
   creditos = re.match(r'^(\d+)\b', celdas[1])
   if not creditos: raise ValueError((codigo, celdas))
   materias.append(dict(codigo=f'{PROGRAMAS.index(item)+1:02}{len(materias)+1:03}', nombre=celdas[0], semestre=semestre, creditos=int(creditos[1])))
 if len(materias) < 20: raise ValueError((codigo, 'plan incompleto', len(materias)))
 return dict(codigo=codigo, nombre=nombre, nivel='Tecnología' if codigo.startswith('T') else 'Profesional', modalidad='Virtual' if codigo=='SIV' else 'Presencial', fuente=url, consultadoEn='2026-10-28', prerrequisitosVerificados=False, materias=materias)

if __name__ == '__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
  programas = list(executor.map(descargar, PROGRAMAS))
 destino = ROOT / 'src/data'
 destino.mkdir(exist_ok=True)
 (destino / 'oferta-usc.json').write_text(json.dumps(programas, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
 print([(p['codigo'],len(p['materias']),sum(m['creditos'] for m in p['materias'])) for p in programas])
