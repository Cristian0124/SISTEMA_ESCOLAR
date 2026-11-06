# Desarrollo local

## Requisitos

- Node.js 22 LTS y npm.
- PostgreSQL y una base configurada mediante `DATABASE_URL`.
- Python y `requests` únicamente para volver a recopilar las fuentes académicas.

## Instalación

Desde la raíz del proyecto:

```powershell
npm.cmd install
npm.cmd run install:all
```

Copia `backend/.env.example` a `backend/.env` y configura la conexión existente.
Copia `frontend/.env.example` a `frontend/.env`; el valor local esperado de
`VITE_API_URL` es `http://localhost:3000/api`.

## Base de datos

```powershell
cd backend
npm.cmd run db:check
```

Si hay migraciones pendientes, revisa la lista antes de usar `npm.cmd run db:migrate`.
Las migraciones iniciales también incorporan datos del catálogo en una base vacía.
Un esquema parcialmente modificado puede necesitar revisión manual. No vuelvas a
ejecutar todos los SQL manualmente sobre una base existente.

El servidor comprueba el esquema al arrancar, pero no aplica migraciones ni crea
usuarios. [Reglas y catálogo de migraciones](../backend/src/database/README.md).
La administración de cuentas mediante `control-admin` se describe en el
[README del backend](../backend/README.md).

## Inicio

Desde la raíz, `npm.cmd run dev` inicia ambos procesos. También puedes abrir dos
terminales y usar `npm.cmd run dev` dentro de `backend` y `frontend` por separado.

- Backend: `http://localhost:3000`; comprobación en `/api/health`.
- Frontend: la dirección que anuncie Vite, normalmente `http://localhost:5173`.

En Windows, `npm.cmd` evita la restricción de ejecución que puede afectar a `npm.ps1`.

## Verificación

| Directorio | Comando | Propósito |
| --- | --- | --- |
| `backend` | `npm.cmd run build` | Compilar TypeScript |
| `backend` | `npm.cmd test` | Ejecutar pruebas del backend |
| `frontend` | `npm.cmd run build` | Comprobar tipos y generar la interfaz |
| `frontend` | `npm.cmd test -- --run` | Ejecutar pruebas del frontend sin modo observación |

Las pruebas de integración del backend requieren PostgreSQL y permisos para crear
y eliminar esquemas temporales. Las pruebas no sustituyen una revisión del esquema
de la aplicación.

## Formato y análisis

`.editorconfig` establece UTF-8, saltos LF e indentación. Prettier usa
`.prettierrc.json`; ESLint se configura en `herramientas/eslint.config.mjs`.
Las herramientas tienen su propio manifiesto para no mezclar sus dependencias
con las de ejecución ni modificar los lockfiles existentes sin instalarlas.

La configuración está preparada; sus dependencias requieren una instalación
explícita antes de ejecutar los siguientes comandos:

```powershell
npm.cmd run tools:install
npm.cmd run lint
npm.cmd run format:check
```

La primera instalación genera `herramientas/package-lock.json`, que debe conservarse
para posteriores instalaciones reproducibles con `npm.cmd ci --prefix herramientas`.
`npm.cmd run format` aplica el formato; revísalo como un cambio separado. El formato
no se ha aplicado de manera masiva. Los SQL históricos, datos de origen, lockfiles,
archivos generados y variables de entorno quedan excluidos de Prettier.
