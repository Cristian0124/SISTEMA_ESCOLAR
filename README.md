# Sistema Escolar

Sistema de gestión académica con acceso para estudiantes, profesores y administradores.
Incluye matrícula, oferta académica, calificaciones, horarios, perfiles y soporte.

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `backend/` | API Express, PostgreSQL y migraciones |
| `frontend/` | Interfaz Vue, TypeScript y Pinia |
| `docs/` | Guías de desarrollo, estructura y oferta académica |
| `herramientas/` | Configuración y dependencias de ESLint y Prettier |

## Requisitos e instalación

Necesitas Node.js 22 LTS, npm y una conexión a PostgreSQL.

```powershell
npm.cmd install
npm.cmd run install:all
```

Configura `backend/.env` y `frontend/.env` a partir de sus archivos `.env.example`.
La [guía de desarrollo](docs/desarrollo.md) detalla las variables de entorno y la
comprobación del esquema antes de iniciar.

## Comandos principales

Desde la raíz:

| Comando | Acción |
| --- | --- |
| `npm.cmd run dev` | Iniciar backend y frontend |
| `npm.cmd run dev:backend` | Iniciar solo el backend |
| `npm.cmd run dev:frontend` | Iniciar solo el frontend |
| `npm.cmd run tools:install` | Instalar las herramientas opcionales de desarrollo |
| `npm.cmd run lint` | Analizar el código tras instalar las herramientas |
| `npm.cmd run format:check` | Revisar el formato tras instalar las herramientas |

El backend escucha en `http://localhost:3000` y Vite anuncia la dirección de la
interfaz, normalmente `http://localhost:5173`. El arranque no aplica migraciones
ni crea usuarios; las operaciones de base de datos son explícitas.

## Documentación

- [Guía visual para explicar y modificar el proyecto](docs/guia-defensa.md)
- [Desarrollo local y verificaciones](docs/desarrollo.md)
- [Organización y convenciones](docs/estructura.md)
- [Migraciones de base de datos](backend/src/database/README.md)
- [Oferta académica y validaciones pendientes](docs/oferta-academica.md)
- [API y administración del backend](backend/README.md)
- [Interfaz y contrato de autenticación](frontend/README.md)
