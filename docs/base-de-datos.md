# Base de datos

Configura DATABASE_URL en backend/.env para sistema_escolar_v2. El ejecutor aplica migraciones bajo un bloqueo de instalación y cada archivo se ejecuta dentro de una transacción.

001_esquema.sql conserva la estructura académica original y 002_catalogo_academico.sql carga el catálogo.

003_matricula_masiva.sql agrega las siguientes tablas.

| Tabla | Responsabilidad |
| --- | --- |
| periodos_matricula | Fechas y habilitación del periodo |
| solicitudes_matricula | Cola persistente, clave de idempotencia, token, intentos y resultado |
| reservas_cupos | Reservas temporales por solicitud y curso |
| workers_matricula | Latidos de los procesos consumidores |
| limites_http | Contadores compartidos de límites por IP o estudiante |
| sis_migraciones | Registro de versiones aplicadas |

La migración es aditiva y conserva usuarios, matrículas, calificaciones y datos históricos. Las tablas de soporte y perfil de la versión anterior se conservan, aunque sus endpoints se retiraron de esta aplicación.

## Consultas importantes

solicitudes.repository.ts registra solicitudes y toma trabajos disponibles mediante SKIP LOCKED. El índice parcial impide dos solicitudes activas para el mismo estudiante, curso y periodo. La pareja usuario y clave identifica los reintentos HTTP.

reservas.service.ts bloquea el curso, cuenta las matrículas y reservas vigentes y registra la reserva. La fecha de vencimiento se compara con el reloj de PostgreSQL.

matriculas.repository.ts conserva las validaciones académicas y confirma la solicitud dentro de la misma transacción que inserta la matrícula. El token y la reserva deben seguir vigentes al confirmar.

reconciliacion.ts recupera arrendamientos vencidos. Los trabajos que mantienen bloqueos durante una confirmación se omiten hasta la siguiente revisión.

La restricción UNIQUE de matrícula por estudiante, curso y periodo y los bloqueos sobre el curso protegen la capacidad. Los campos de cupos_disponibles almacenan el límite de inscripción del curso. El catálogo descuenta las matrículas y reservas actuales para mostrar los lugares libres.

## Operaciones

Desde backend ejecuta npm.cmd run db:migrate para actualizar y npm.cmd run db:check para comprobar el esquema. Las pruebas funcionales y de carga usan esquemas temporales con identificadores aleatorios y los eliminan al terminar.
