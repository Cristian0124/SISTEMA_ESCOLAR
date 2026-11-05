# Backend del Sistema Escolar

### Instalar cambios y verificar el esquema

Después de actualizar el código, instala las dependencias y ejecuta `npm.cmd run db:check` desde `backend`. Si faltan tablas o columnas, usa `npm.cmd run db:migrate` para aplicar las migraciones pendientes en orden. El servidor también comprueba el esquema antes de escuchar conexiones, evitando anunciar un arranque correcto cuando falta una tabla.

La migración 006 habilita el envío y respuesta de soporte. Las migraciones 010 y 011 agregan capacidad para horarios de varias sesiones y perfiles persistentes, respectivamente. Los tests usan esquemas temporales y verifican soporte, permisos, matrícula por asignatura, horarios, perfiles, documentos y sesiones.

### Horarios y perfiles

La creación de grupos recibe `sesiones: [{ dia: 1, horaInicio: "08:00", horaFin: "10:00" }]`. Admite varias sesiones, valida días ISO y rechaza intervalos invertidos o superpuestos dentro del grupo. Se almacenan dentro de la misma transacción que crea el curso. Por compatibilidad, la API acepta un texto de un solo día e intervalo explícito; los textos ambiguos se rechazan. El horario del estudiante usa las sesiones actuales de PostgreSQL.

`GET/PUT /api/perfil/datos` y `GET/PUT /api/perfil/hoja-de-vida` guardan los datos del estudiante autenticado. No aceptan identificadores ajenos ni permiten modificar carrera, semestre o edad. Los datos personales actualizan nombre, correo y nacionalidad de la cuenta y conservan la unicidad del correo. La hoja de vida admite hasta 20 estudios y foto PNG/JPEG/WebP de hasta 1 MB. Las respuestas llevan `Cache-Control: no-store`; el almacenamiento local solo conserva borradores que se recuperan explícitamente.

Todas las rutas protegidas consultan que la cuenta siga activa y que el rol del token coincida con el rol vigente. Los errores inesperados registran una referencia, ruta y código técnico sin registrar cuerpos, contraseñas, tokens ni mensajes del driver. El usuario recibe un mensaje seguro; los fallos de conexión se distinguen con HTTP 503.

### Resumen informativo de matrícula

`GET /api/documentos/resumen-matricula` consulta el resumen del estudiante
autenticado; `GET /api/documentos/resumen-matricula.pdf` descarga el PDF.
Ambas rutas requieren un access token Bearer de estudiante y comprueban que
la cuenta siga activa. Usan exclusivamente la identidad autenticada, aunque se
envíe otro ID en la URL. No ofrecen consulta de documentos de otros estudiantes.

El servidor consulta nombre, identificación, carrera, periodo vigente, cursos
activos, horarios y créditos directamente en PostgreSQL. La respuesta JSON
incluye una lista vacía cuando no hay matrículas; la descarga responde 409
`SIN_MATRICULAS`. Los documentos llevan `Cache-Control: no-store` y se generan
en memoria con PDFKit, sin capturas de pantalla ni archivos públicos temporales.
El PDF es un resumen informativo del sistema, sin certificación oficial.

Las pruebas verifican autorización, aislamiento entre estudiantes, exclusión
de otros periodos, cabeceras PDF, texto extraído, tildes y documentos de varias
páginas. Instala las dependencias actualizadas con `npm ci` antes de desplegar.

### Sesiones persistentes y despliegue

Aplica `src/database/migrations/009_sesiones_auth.sql` antes de iniciar esta
versión. Las sesiones anteriores estaban en memoria y **se invalidan al desplegar**:
todos los usuarios deberán iniciar sesión otra vez. No se importan tokens viejos.
Detén todas las instancias antiguas antes de habilitar las nuevas para evitar
que sigan aceptando sesiones en memoria durante un despliegue mixto.

`sesiones_auth` guarda el usuario, SHA-256 del refresh token, vencimiento y fecha
de revocación. Nunca guarda el token completo. Cada renovación reemplaza
atómicamente el hash y el vencimiento; el token anterior deja de ser válido.
Se verifica la firma y expiración del JWT y el vencimiento persistido, y se
comprueba que el usuario siga activo dentro de la transacción. Logout espera
la revocación persistida antes de responder 204 y borrar la cookie.

El cuerpo de login/refresh y las cookies conservan su contrato. Mantén
`JWT_REFRESH_SECRET` estable y compartido entre instancias y reinicios para
conservar las sesiones; cambiarlo exige volver a iniciar sesión. Los access
tokens ya emitidos mantienen su vencimiento de 15 minutos.

`tests/sesiones.test.ts` verifica renovación desde otro proceso, vencimiento,
usuario inactivo, logout y rotación concurrente. Usa una base de pruebas con
`DATABASE_URL` y permiso para crear esquemas aislados.

### Validación de cruces de horario

Antes de desplegar esta versión, aplica `src/database/migrations/008_horarios_cursos.sql`
después de las migraciones existentes. Conserva `cursos.horario` y añade
`curso_horarios` con día ISO (lunes=1), hora de inicio y hora de fin; admite varias
sesiones por curso. El catálogo expone estas sesiones en `sesiones`.

La conversión automática solo acepta un día completo y un intervalo de 24 horas,
por ejemplo `Lunes 08:00 - 10:00`. Textos incompletos, varios días o intervalos
inválidos se conservan sin inventar sesiones. Para revisarlos:

```sql
SELECT id, codigo, horario FROM cursos c
WHERE NOT EXISTS (SELECT 1 FROM curso_horarios h WHERE h.curso_id = c.id);
```

Corrige el texto a un intervalo explícito, o registra las sesiones verificadas
en `curso_horarios` para horarios de varios días. Un cambio posterior del texto
reemplaza las sesiones mediante el trigger; al editar varios días, actualiza
texto y sesiones en la misma transacción. Mientras falten sesiones en el curso
solicitado o en una matrícula activa del periodo, se devuelve 409
`HORARIO_PENDIENTE_REVISION`. Los cruces devuelven 409 `CRUCE_HORARIO` con el
código, nombre y franja del curso en conflicto. Las clases consecutivas se permiten.

Las pruebas de `tests/horarios.test.ts` requieren `DATABASE_URL` y permisos para
crear y eliminar esquemas de prueba; cubren conversión, horarios ambiguos,
superposición, consecutivos, otro periodo y dos solicitudes simultáneas.

## PostgreSQL y registro

1. Copia `.env.example` como `.env` y configura `DATABASE_URL` con tu instancia PostgreSQL. Para una base con SSL, configura `DB_SSL=true`.
2. Desde `backend`, usa `npm.cmd run db:check` para consultar faltantes y `npm.cmd run db:migrate` para aplicar las migraciones pendientes.
3. Inicia el backend con `npm.cmd run dev`.

El catálogo ordenado y las reglas de instalación están en [database/README.md](src/database/README.md). No apliques manualmente una lista parcial de SQL ni vuelvas a ejecutar seeds sobre una base existente.

El registro público está en `POST /api/auth/register`. Requiere nombre, correo, contraseña de al menos 8 caracteres, cédula, fechas de nacimiento e ingreso, nacionalidad y género. El servidor asigna el rol `estudiante`; correo y cédula deben ser únicos.

El inicio de sesión ahora valida hashes bcrypt guardados en PostgreSQL. Las cuentas que ya existan en otra base deben tener `password_hash` con un hash bcrypt válido. En una base vacía también hay que provisionar una cuenta administrativa antes de usar las funciones reservadas al administrador.

### Administrar cuentas de administrador

Desde la carpeta `backend`, ejecuta `npm run control-admin` y elige si quieres crear un administrador, cambiar una contraseña o borrar una cuenta. Puedes crear varios administradores; cada uno debe tener correo y cédula únicos. El borrado pide confirmar el correo, no permite borrar al último administrador y se detiene si la cuenta tiene datos asociados.

El buzón de soporte docente requiere aplicar `src/database/migrations/006_soporte_docente.sql` a la base de datos existente.

### Prerrequisitos y calificaciones

El avance del estudiante está en `GET /api/matriculas/avance`. Las materias se consideran aprobadas con nota igual o superior a `3.0`. Al matricular un curso que tenga prerrequisitos pendientes, `POST /api/matriculas` responde `409 PRERREQUISITOS_PENDIENTES`.

El profesor consulta sus cursos en `GET /api/matriculas/docente/cursos` y sus estudiantes matriculados en `GET /api/matriculas/docente/cursos/:cursoId/estudiantes`. El backend limita estas listas a los cursos cuyo `docente_id` coincide con el identificador del profesor autenticado.

Un usuario con rol `admin` o el profesor asignado registra o actualiza una nota con `PUT /api/matriculas/calificaciones/:usuarioId/:codigoMateria`, enviando un token Bearer y un cuerpo como `{ "corte1": 3.5, "corte2": 4.0, "corte3": 3.8 }`. La nota final se calcula con pesos de 30 %, 30 % y 40 %. Para profesores, el estudiante debe estar matriculado en el curso asignado. El código es el del pensum, por ejemplo `ISI01`; las notas aceptadas van de `0.0` a `5.0` con un decimal.
