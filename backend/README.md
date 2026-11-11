# Backend de SIS 2.0

Configura .env y ejecuta npm.cmd run db:migrate y npm.cmd run db:check antes de iniciar.

npm.cmd run dev compila en modo observación e inicia la API con consumidores embebidos.
npm.cmd run build compila TypeScript.
npm.cmd test ejecuta las pruebas sobre esquemas temporales.
npm.cmd run control-admin abre el menú de creación y administración de cuentas.

Con WORKER_EMBEBIDO=false la API conserva la recepción de solicitudes y npm.cmd run worker inicia los consumidores en otro proceso. Ambos deben usar la misma base.

## API de matrícula

POST /api/matriculas recibe cursoId y admite Idempotency-Key con un UUID. Devuelve 202 mientras la solicitud está pendiente.
GET /api/matriculas/solicitudes devuelve las solicitudes del estudiante autenticado.
GET /api/matriculas/solicitudes/:id consulta una solicitud propia.
GET /api/matriculas/mias devuelve las matrículas confirmadas.
GET /api/matriculas/admin/todas requiere administrador.
DELETE /api/matriculas/:id permite retirar una matrícula propia.

GET /api/masiva/periodo consulta el periodo.
PUT /api/masiva/periodo requiere administrador y recibe apertura, cierre y habilitado.
GET /api/masiva/monitoreo requiere administrador.

Las rutas académicas y de cursos conservan sus contratos. El historial de notas acepta una nota final en la operación de registro. La compatibilidad con el cuerpo histórico de tres cortes se conserva.

Los módulos de perfiles, soporte y solicitud de créditos adicionales se retiraron del alcance de la aplicación.

GET /api/masiva/simulacion consulta el estado de la demostración y POST /api/masiva/simulacion la inicia. Ambos requieren administrador. El cuerpo del POST incluye estudiantes, cupos y modoExposicion. El escenario utiliza el backend compilado y permisos de creación de esquemas.
