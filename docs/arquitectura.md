# Arquitectura de matrícula masiva

Vue 3 y Pinia presentan la oferta y los estados. Express recibe solicitudes, PostgreSQL conserva la cola y las matrículas, y los consumidores procesan los trabajos.

Se eligió PostgreSQL para mantener reservas, solicitudes y confirmaciones bajo transacciones. Redis no es una dependencia de esta implementación. config/redis.ts documenta ese punto de extensión.

## Flujo de una solicitud

1. El middleware verifica la sesión y el rol del estudiante. El límite de matrícula admite hasta 60 envíos por estudiante cada minuto.
2. El controlador valida el curso y la clave UUID de idempotencia. El backend comprueba la apertura del periodo y persiste la solicitud.
3. La API devuelve 202 con el identificador y el estado inicial. Un reintento con la misma clave devuelve la misma solicitud.
4. El worker toma una solicitud mediante FOR UPDATE SKIP LOCKED y le asigna un token de arrendamiento de 60 segundos.
5. Bajo un bloqueo de la fila del curso, cuenta las matrículas y reservas vigentes. Crea una reserva de 30 segundos si hay capacidad.
6. El servicio valida créditos, prerrequisitos, materia aprobada, carrera y cruces de horario.
7. Una transacción verifica el token, la reserva y la apertura, inserta la matrícula, confirma la solicitud y elimina la reserva.
8. Si ocurre un fallo, la operación se revierte. Los rechazos académicos son definitivos y los errores temporales se reintentan hasta diez veces.
9. Cada cinco segundos se recuperan trabajos vencidos y se eliminan reservas expiradas. Un token antiguo pierde la capacidad de confirmar.

El estado de la solicitud y la matrícula se confirman juntos. Una caída entre reserva y confirmación deja un trabajo recuperable. Una caída después del COMMIT conserva el resultado definitivo.

Si todos los cupos libres están temporalmente reservados, el trabajo espera un reintento. Si la capacidad ya está ocupada por matrículas, se rechaza por falta de cupo. El orden de extracción favorece las solicitudes disponibles más antiguas y SKIP LOCKED permite procesarlas concurrentemente.

## Procesos y observación

server.ts inicia cuatro consumidores embebidos durante el desarrollo. Con WORKER_EMBEBIDO=false se puede ejecutar worker.ts como proceso separado. Cada proceso publica un latido y puede recuperarse tras un reinicio.

El panel administrativo consulta métricas reales cada dos segundos. Los estados y el p95 del tiempo desde creación hasta terminación proceden de PostgreSQL. Los contadores HTTP, memoria y conexiones corresponden a la instancia de API que respondió y se reinician con ese proceso.

El identificador x-correlation-id se devuelve en las respuestas y acompaña la solicitud y sus logs de procesamiento. El login limita veinte intentos por IP cada minuto. Los contadores de límites están compartidos en PostgreSQL.

## Interfaz y alcance

La oferta en Pinia se normaliza por ID, se conserva en memoria y tiene una caché de diez segundos. El botón de actualización fuerza la consulta. El cambio de usuario invalida el estado. La clave de una solicitud sin respuesta se conserva en sessionStorage, asociada al usuario y curso. Los tokens de acceso permanecen en memoria.

Se retiraron las pantallas y endpoints de perfiles extensos, soporte y solicitudes de créditos adicionales. Se conserva el límite de créditos y se simplificó la captura de calificaciones a una nota final para el historial académico. Los campos históricos de cortes siguen en PostgreSQL para conservar datos existentes.

El periodo vigente se calcula con la fecha de PostgreSQL y la división enero-junio o julio-diciembre. La administración configura la apertura y el cierre de ese periodo. Al cerrar, los trabajos todavía sin confirmar se rechazan al procesarse.

Los resultados locales de carga describen el equipo y el generador utilizados. El despliegue debe medirse en su propio entorno.
