# Facultades, carreras y pénsum

Se habilita únicamente la Facultad de Ingeniería de la Universidad Santiago de Cali. El catálogo incluye carreras de pregrado: nueve programas profesionales (Sistemas presencial y virtual tienen planes independientes) y dos tecnologías. No incluye posgrados.

## Fuente y alcance

Fuente principal: https://www.usc.edu.co/facultad-de-ingenieria/

Consulta: 28 de octubre de 2026. Los enlaces oficiales y las asignaturas consultadas están registrados en la migración `backend/src/database/migrations/007_facultades_carreras.sql` y en la base de datos. Se transcriben las tablas públicas de asignaturas, semestres y créditos, con un total de 528 asignaturas. Los códigos de cinco dígitos son internos, no códigos oficiales USC. Se conservan inconsistencias del origen, como la repetición de «Algoritmos y Programación I» en Sistemas presencial. No se deducen equivalencias por nombre.

| Programa | Asignaturas | Créditos sumados de las tablas |
| --- | ---: | ---: |
| Tecnología en Gestión de Procesos Industriales | 29 | 89 |
| Tecnología en Desarrollo de Sistemas de Información y de Software | 31 | 94 |
| Bioingeniería | 51 | 154 |
| Ingeniería Civil | 56 | 176 |
| Ingeniería Química | 48 | 158 |
| Ingeniería Industrial | 61 | 170 |
| Ingeniería Electrónica | 50 | 151 |
| Ingeniería en Energías | 51 | 155 |
| Ingeniería de Sistemas | 51 | 154 |
| Ingeniería de Sistemas – Virtual | 51 | 150 |
| Ingeniería en Desarrollo de Videojuegos | 49 | 144 |

Algunos totales difieren del resumen anunciado por USC: por ejemplo, Gestión de Procesos Industriales anuncia 88 créditos, pero sus tablas suman 89. La pantalla muestra explícitamente que los totales corresponden a las tablas.

## Comportamiento del sistema

- El registro público y administrativo exige una carrera válida para estudiantes. Profesores y administradores no se inscriben en una carrera.
- La sesión devuelve `carreraCodigo`. El perfil muestra el programa registrado como dato de solo lectura; los borradores locales no cambian la carrera.
- «Facultades y carreras» permite consultar todos los planes y se accede desde el menú del administrador. El menú del estudiante ofrece «Mi pénsum» para consultar el plan de su carrera.
- El catálogo, el avance y los créditos base corresponden al programa del estudiante. La duración, modalidad y total de créditos ya no están fijados a Sistemas.
- La matrícula rechaza cursos de otras carreras dentro de su transacción. El registro de notas también valida la pertenencia al programa.
- El límite para solicitar créditos adicionales corresponde al total de créditos del programa, en lugar del valor fijo 154.

## Datos anteriores y activación académica

La migración agrega tablas y columnas sin borrar ni reasignar usuarios, asignaturas, notas, cursos o matrículas anteriores. Los estudiantes sin carrera conservan acceso al pénsum anterior. La carrera de los nuevos estudiantes se asigna al registrarlos. La pantalla de oferta académica se dedica a consultar carreras y pénsum; no muestra asignación de estudiantes anteriores. El endpoint administrativo de asignación inicial sigue disponible y solo permite asignar una carrera una vez; un traslado posterior requiere un proceso académico específico. Las notas y matrículas previas se conservan, pero no se homologan automáticamente al nuevo plan.

Las tablas públicas consultadas no incluyen prerrequisitos. Los nuevos planes quedan con `prerrequisitos_verificados = FALSE`; la consulta está habilitada, pero la matrícula de esos planes devuelve `PENSUM_PENDIENTE_VALIDACION`. Para habilitarla se necesita revisar los prerrequisitos con información académica oficial, cargar `prerrequisitos_materia` y marcar el plan como verificado. No se crean horarios, cupos ni asignaciones docentes ficticias: también se deben abrir grupos reales en `cursos`, usando los identificadores del nuevo plan.

El administrador puede realizar esa revisión desde **Validación del pénsum**, en
`/admin/pensum`. Selecciona una carrera, indica los prerrequisitos de cada asignatura
y confirma la revisión académica antes de usar **Guardar y validar pénsum**. Una
lista vacía indica que esa asignatura no tiene prerrequisitos. **Guardar como
pendiente** conserva la revisión con la matrícula de la carrera pendiente de validación.
La consulta de facultades y carreras también enlaza directamente a la revisión.

El servidor exige todas las asignaturas de la carrera y rechaza requisitos ajenos,
repetidos, autorreferencias y ciclos. Prerrequisitos y estado del plan se guardan
en una transacción. Una versión del contenido evita sobrescribir una edición
guardada por otro administrador. Tras validar el plan, el estudiante debe volver
a cargar su pantalla de matrícula para consultar el estado actualizado.

## Instalación y verificación

Con el esquema anterior instalado y la conexión de `backend/.env` configurada:

```powershell
cd backend
npm.cmd run db:check
npm.cmd run db:migrate
npm.cmd run build
npm.cmd test
```

`db:check` informa las migraciones faltantes; `db:migrate` aplica las pendientes en orden, cada una dentro de una transacción. Conserva el esquema ya instalado y no vuelve a ejecutar seeds anteriores cuando sus tablas y columnas están presentes. Reinicia el backend después de actualizar el código. El script antiguo `migrate-academic.cjs` fue retirado; todas las instalaciones usan el ejecutor general y su catálogo compartido.

Las pruebas usan esquemas temporales separados del esquema de la aplicación. Cubren el registro obligatorio, carrera inexistente, persistencia en la sesión, catálogo y avance por carrera, créditos, rechazo de matrícula cruzada y pendiente de validación, y compatibilidad de notas/prerrequisitos del plan anterior.

La migración contiene el catálogo aplicado a la base de datos. Una actualización posterior requiere revisar las fuentes oficiales, preparar otra migración y verificar las versiones de pénsum; no se sincroniza automáticamente con el sitio de USC.

## API

- `GET /api/academico/facultades`
- `GET /api/academico/carreras`
- `GET /api/academico/carreras/:codigo/pensum`
- `GET /api/academico/carreras/:codigo/prerrequisitos` (administrador)
- `PUT /api/academico/carreras/:codigo/prerrequisitos` (administrador, revisión completa y confirmación explícita para validar)
- `GET /api/academico/estudiantes/sin-carrera` (administrador)
- `PATCH /api/academico/estudiantes/:id/carrera` con `{ "carreraCodigo": "CIV" }` (administrador, asignación inicial)

El modelo permite agregar otras facultades más adelante; esta entrega carga únicamente Ingeniería.
