# Backend del Sistema Escolar

## PostgreSQL y registro

1. Copia `.env.example` como `.env` y configura `DATABASE_URL` con la URL de tu instancia PostgreSQL. No subas `.env` a GitHub. Para una base con SSL, configura `DB_SSL=true`.
2. Desde esta carpeta, establece la URL en la terminal PowerShell y aplica el esquema:

	```powershell
	$env:DATABASE_URL = "postgresql://usuario:contrasena@host:5432/base"
	psql $env:DATABASE_URL -f src/database/migrations/001_usuarios.sql
	psql $env:DATABASE_URL -f src/database/migrations/002_matriculas.sql
	$env:PGCLIENTENCODING = "UTF8"
	psql $env:DATABASE_URL -f src/database/migrations/002_prerrequisitos_calificaciones.sql
	psql $env:DATABASE_URL -f src/database/migrations/003_cursos.sql
	```

	Sustituye la URL de ejemplo por la misma URL configurada en `.env`.
	La migración `003_cursos.sql` crea el catálogo y conserva los IDs usados por las matrículas. Su reversión está en `003_cursos.down.sql`; úsala solo si quieres retirar el catálogo creado por esa migración, pues elimina esa tabla y sus filas.

3. Inicia el backend con `npm run dev`.

El registro público está en `POST /api/auth/register`. Requiere nombre, correo, contraseña de al menos 8 caracteres, cédula, fechas de nacimiento e ingreso, nacionalidad y género. El servidor asigna el rol `estudiante`; correo y cédula deben ser únicos.

El inicio de sesión ahora valida hashes bcrypt guardados en PostgreSQL. Las cuentas que ya existan en otra base deben tener `password_hash` con un hash bcrypt válido. En una base vacía también hay que provisionar una cuenta administrativa antes de usar las funciones reservadas al administrador.

### Administrar cuentas de administrador

Desde la carpeta `backend`, ejecuta `npm run control-admin` y elige si quieres crear un administrador, cambiar una contraseña o borrar una cuenta. Puedes crear varios administradores; cada uno debe tener correo y cédula únicos. El borrado pide confirmar el correo, no permite borrar al último administrador y se detiene si la cuenta tiene datos asociados.

### Prerrequisitos y calificaciones

El avance del estudiante está en `GET /api/matriculas/avance`. Las materias se consideran aprobadas con nota igual o superior a `3.0`. Al matricular un curso que tenga prerrequisitos pendientes, `POST /api/matriculas` responde `409 PRERREQUISITOS_PENDIENTES`.

El profesor consulta sus cursos en `GET /api/matriculas/docente/cursos` y sus estudiantes matriculados en `GET /api/matriculas/docente/cursos/:cursoId/estudiantes`. El backend limita estas listas a los cursos cuyo campo `docente` coincide con el nombre del usuario profesor, ignorando mayúsculas y tildes.

Un usuario con rol `admin` o el profesor asignado registra o actualiza una nota con `PUT /api/matriculas/calificaciones/:usuarioId/:codigoMateria`, enviando un token Bearer y un cuerpo como `{ "nota": 3.5 }`. Para profesores, el estudiante debe estar matriculado en el curso asignado. El código es el del pensum, por ejemplo `ISI01`; las notas aceptadas van de `0.0` a `5.0` con un decimal.
