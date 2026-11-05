# Organización del proyecto

## Backend

Se conserva la estructura por capas para facilitar la revisión de los cambios:

- `routes/`: métodos, rutas y permisos HTTP.
- `controllers/`: lectura de la petición y construcción de la respuesta.
- `services/`: validaciones de negocio y coordinación de operaciones.
- `repositorios/`: SQL y transacciones de persistencia.
- `schemas/`: esquemas Zod y tipos de las entradas.
- `database/`: catálogo de migraciones y archivos SQL.
- `config/`: entorno, conexión y comprobación del esquema.

Perfil y oferta académica siguen esta separación. Créditos y calificaciones tienen
servicios propios; el servicio de matrículas conserva la matrícula y las consultas
de cursos y estudiantes asignados a profesores. La validación común del estudiante
se encuentra en `estudiantes.service.ts`.

No se crean capas vacías para operaciones que solo necesitan delegar una consulta.
Las transacciones de matrícula mantienen juntas sus consultas y bloqueos para
conservar su atomicidad.

El único catálogo de migraciones es `backend/src/database/migraciones.ts`.
Consulta [las reglas de migraciones](../backend/src/database/README.md).

## Frontend

Las pantallas de `views/` se agrupan por funcionalidad:
`auth`, `academico`, `matriculas`, `perfil`, `calificaciones`, `horarios`,
`soporte`, `inicio` y `documentos`. La página 404 queda en la raíz de `views/`.
Las URLs públicas conservan sus direcciones anteriores.

- `api/`: peticiones HTTP y contratos específicos de cada funcionalidad.
- `api/axios.ts`: URL base, credenciales, token y renovación ante HTTP 401.
- `stores/`: estado compartido entre pantallas.
- `composables/`: comportamiento reutilizable ligado al ciclo de vida de Vue.
- `components/`: presentación reutilizable; `academic/` contiene el editor de sesiones.
- `layouts/`: estructura común y navegación por rol.
- `router/`: rutas y permisos declarados en `meta.roles`.
- `services/`: autenticación y utilidades de borradores locales.
- `types/`: tipos comunes de usuario y sesión.

Las vistas no construyen su propia URL del backend ni renuevan tokens con fetch.
Las funciones HTTP usan el cliente compartido. Los colores comunes se toman de
las variables de `assets/base.css`; los estilos propios de cada pantalla siguen
siendo locales.

Las rutas privadas heredan los roles estudiante y administrador del layout;
las rutas administrativas y docentes los sustituyen explícitamente. Los permisos
del backend siguen siendo la autoridad para permitir cada operación.

## Convenciones

Para nuevas funcionalidades, usar el mismo nombre de dominio en las distintas
capas y conservar los sufijos existentes (`.routes.ts`, `.controller.ts`,
`.service.ts`, `.repository.ts`, `.schema.ts`, `.api.ts`). Los nombres históricos
de archivos se conservan para reducir cambios sin efecto funcional.

Las pruebas de frontend están en `frontend/tests`; las de backend, en
`backend/tests`. La preparación de la base de pruebas consume el catálogo común
de migraciones y utiliza esquemas aislados.
