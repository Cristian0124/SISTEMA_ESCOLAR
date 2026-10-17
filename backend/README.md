# Backend del Sistema Escolar

## PostgreSQL y registro

1. Copia `.env.example` como `.env` y configura `DATABASE_URL` con la URL de tu instancia PostgreSQL. No subas `.env` a GitHub. Para una base con SSL, configura `DB_SSL=true`.
2. Desde esta carpeta, establece la URL en la terminal PowerShell y aplica el esquema:

	```powershell
	$env:DATABASE_URL = "postgresql://usuario:contrasena@host:5432/base"
	psql $env:DATABASE_URL -f src/database/migrations/001_usuarios.sql
	```

	Sustituye la URL de ejemplo por la misma URL configurada en `.env`.

3. Inicia el backend con `npm run dev`.

El registro público está en `POST /api/auth/register`. Requiere nombre, correo, contraseña de al menos 8 caracteres, cédula, fechas de nacimiento e ingreso, nacionalidad y género. El servidor asigna el rol `estudiante`; correo y cédula deben ser únicos.

El inicio de sesión ahora valida hashes bcrypt guardados en PostgreSQL. Las cuentas que ya existan en otra base deben tener `password_hash` con un hash bcrypt válido. En una base vacía también hay que provisionar una cuenta administrativa antes de usar las funciones reservadas al administrador.

### Crear el primer administrador

Desde la carpeta `backend`, ejecuta `npm run admin:create`. El comando solicita los datos del perfil y la contraseña (que se escribe oculta), guarda el hash en PostgreSQL y no crea otro administrador si ya existe uno. Después inicia sesión en `/login` y usa **Registrar usuarios** desde el panel administrativo para elegir entre estudiante y profesor.
