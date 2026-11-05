# Sistema Escolar

La distribución del código y las convenciones se describen en [Organización del proyecto](docs/estructura.md).

La ampliación de facultades, carreras y pénsum de Ingeniería USC se documenta en [Oferta académica](docs/oferta-academica.md), incluyendo migración, fuentes y validaciones pendientes para habilitar matrícula en los planes nuevos.

## Ejecutar en Windows sin modificar la base de datos

El proyecto tiene dos procesos: el backend y la interfaz web. Abre dos terminales de PowerShell en la carpeta del proyecto y ejecuta lo siguiente.

### Terminal 1: backend

```powershell
cd backend
npm.cmd run dev
```

El backend queda en `http://localhost:3000`. Puedes comprobar que inició abriendo `http://localhost:3000/api/health`.

### Terminal 2: frontend

```powershell
cd frontend
npm.cmd run dev
```

Abre la dirección que Vite muestre en la terminal, normalmente `http://localhost:5173`.

## Configuración

### Después de clonar o hacer pull

Desde la carpeta principal:

```powershell
npm.cmd install
npm.cmd run install:all
```

Con `backend/.env` configurado, comprueba el esquema:

```powershell
cd backend
npm.cmd run db:check
```

Si el comando informa migraciones pendientes, revisa la lista y ejecuta `npm.cmd run db:migrate` desde `backend`. El comando aplica los archivos pendientes en orden y conserva las tablas ya instaladas; no borra datos. En una base vacía, las migraciones iniciales también crean los datos iniciales del catálogo. Un esquema parcialmente modificado puede requerir revisión manual antes de continuar.

Para iniciar ambos procesos juntos, vuelve a la carpeta principal y ejecuta `npm.cmd run dev`. También puedes usar las dos terminales descritas arriba. El backend comprueba el esquema antes de escuchar conexiones.

- El frontend toma la dirección del backend de `frontend/.env` (`VITE_API_URL`). El valor local esperado es `http://localhost:3000/api`.
- El backend toma la conexión de `backend/.env` (`DATABASE_URL`) y el puerto de `PORT` (por defecto, `3000`). Usa la URL de la base existente que ya tengas configurada.
- Si no existen dependencias instaladas, ejecuta `npm.cmd install` dentro de cada carpeta (`backend` y `frontend`).
- Si PowerShell indica que no puede ejecutar `npm.ps1`, usa `npm.cmd` como en los comandos anteriores.

El inicio del backend por sí solo no aplica migraciones ni crea usuarios. Usa `db:check` para detectar faltantes y `db:migrate` para instalarlos explícitamente. No vuelvas a ejecutar manualmente todos los archivos SQL sobre una base existente. `npm run control-admin` administra cuentas y debe utilizarse únicamente cuando necesites crear o modificar administradores.
