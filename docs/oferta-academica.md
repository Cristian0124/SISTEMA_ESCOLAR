# Facultades, carreras y pénsum

La oferta de la Facultad de Ingeniería incluye Bioingeniería, Ingeniería Industrial e Ingeniería de Sistemas. El catálogo base está en `002_catalogo_academico.sql` e incluye los semestres 1 a 5 de cada carrera.

## Comportamiento del sistema

- El registro público y administrativo exige una carrera válida para estudiantes. Profesores y administradores no se inscriben en una carrera.
- La sesión devuelve `carreraCodigo`. El perfil muestra el programa registrado como dato de solo lectura; los borradores locales no cambian la carrera.
- «Facultades y carreras» permite consultar los planes activos y se accede desde el menú del administrador. El menú del estudiante ofrece «Mi pénsum» para consultar el plan de su carrera.
- El catálogo, el avance y los créditos base corresponden al programa del estudiante. La duración, modalidad y total de créditos ya no están fijados a Sistemas.
- La matrícula rechaza cursos de otras carreras dentro de su transacción. El registro de notas también valida la pertenencia al programa.
- El límite para solicitar créditos adicionales corresponde al total de créditos del programa, en lugar del valor fijo 154.

## Materias y grupos compartidos

`materias` guarda el código único de cada asignatura. `materias_pensum`
relaciona la materia con la carrera y define sus créditos y semestre.
Por ejemplo, Matemáticas Fundamentales usa `09001` en Sistemas y Bioingeniería.

Un grupo se abre para el código de materia y aparece en la oferta de todas
las carreras que lo tienen en su plan. Comparte docente, horario y cupos.
La matrícula usa los créditos y prerrequisitos del plan del estudiante.
Los 18 prerrequisitos de Sistemas se cargan con su carrera. Bioingeniería
e Industrial quedan por definir.

La instalación comienza con el catálogo académico. El administrador debe
registrar profesores y abrir grupos para que los estudiantes puedan matricularse.
Consulta [las instrucciones de migración](../backend/src/database/README.md).

## API

- `GET /api/academico/facultades`
- `GET /api/academico/carreras`
- `GET /api/academico/carreras/:codigo/pensum`
- `GET /api/academico/estudiantes/sin-carrera` (administrador)
- `PATCH /api/academico/estudiantes/:id/carrera` con `{ "carreraCodigo": "SIS" }` (administrador, asignación inicial)

El modelo permite agregar otras facultades más adelante; esta entrega carga únicamente Ingeniería.
