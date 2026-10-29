# Sistema Escolar

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

- El frontend toma la dirección del backend de `frontend/.env` (`VITE_API_URL`). El valor local esperado es `http://localhost:3000/api`.
- El backend toma la conexión de `backend/.env` (`DATABASE_URL`) y el puerto de `PORT` (por defecto, `3000`). Usa la URL de la base existente que ya tengas configurada.
- Si no existen dependencias instaladas, ejecuta `npm.cmd install` dentro de cada carpeta (`backend` y `frontend`).
- Si PowerShell indica que no puede ejecutar `npm.ps1`, usa `npm.cmd` como en los comandos anteriores.

Esta guía solo inicia la aplicación. No ejecutes archivos de `backend/src/database/migrations`, `npm run control-admin` ni otros scripts de inicialización: esos pasos cambian la base o insertan datos. El inicio del backend por sí solo no aplica migraciones ni crea usuarios. Las funciones que consultan datos sí necesitan que la base existente esté disponible y tenga el esquema que espera la aplicación.
