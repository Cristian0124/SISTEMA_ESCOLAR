# Pruebas de rendimiento

Desde la raíz de SIS ejecuta npm.cmd run test:carga. El escenario crea un esquema temporal, aplica las migraciones, genera estudiantes y un curso, inicia una API y cuatro consumidores y envía solicitudes HTTP.

Usa JWT válidos firmados para cuentas de prueba. El tiempo de login con bcrypt queda fuera del escenario. Los datos de la aplicación y las cuentas reales se conservan.

## Parámetros

CARGA_ESTUDIANTES admite entre 1 y 10000 y su valor predeterminado es 1000.
CARGA_CUPOS indica la capacidad del curso y su valor predeterminado es 30.
CARGA_CONEXIONES limita las conexiones HTTP del generador y su valor predeterminado es 128.

Todos los estudiantes generan su solicitud en la misma ráfaga. El agente HTTP distribuye el envío entre las conexiones permitidas. La cantidad de estudiantes y el máximo de conexiones se registran por separado.

## Verificaciones

El resultado debe tener tantas matrículas confirmadas como cupos, ninguna matrícula duplicada y una respuesta idempotente al repetir una solicitud. Las solicitudes restantes deben terminar rechazadas por falta de cupo.

Se registran latencias HTTP p50, p95 y p99, duración hasta terminar, estados, solicitudes por segundo, errores HTTP y errores de transporte. El generador reintenta errores de transporte con la misma clave de idempotencia y los registra en erroresTransporte.

Los JSON se guardan en pruebas-carga/resultados. correcto indica que las verificaciones de integridad y finalización pasaron. La interpretación del rendimiento requiere revisar también los tiempos y los errores.

## Resultado local

La ejecución apertura-1794421409172.json usó 2000 estudiantes, 128 conexiones HTTP máximas, 30 cupos, cuatro consumidores y un pool de diez conexiones.

Se confirmaron 30 matrículas y se rechazaron 1970 solicitudes. No hubo duplicados ni errores HTTP o de transporte. El envío tardó 7299 ms y todas las solicitudes terminaron en 11583 ms. El p95 HTTP fue 6774 ms y el p95 desde persistencia hasta terminación fue 6350 ms.

API, generador y consumidores se ejecutaron en el mismo equipo Windows con Node v24.21.0. Estas cifras corresponden a esa prueba local.

Las ráfagas iniciales con 1000 o 2000 conexiones sin limitar encontraron ECONNREFUSED. Por ello el generador permite limitar conexiones y separa esa cantidad de los estudiantes simulados. El archivo apertura-1794421062316.json conserva la ejecución anterior de 1000 estudiantes que necesitó reintentos de transporte.

## Recuperación

backend/tests/masiva.test.ts cubre duplicados simultáneos, competencia por cupos, reserva vencida, arrendamiento vencido, recuperación, permisos, pertenencia de solicitudes, cierre de periodo y rate limiting.

## Vista para exposición

/admin/simulacion permite iniciar la prueba desde el panel administrativo y observar muestras reales de PostgreSQL. Se actualiza aproximadamente cada 750 ms y representa la cola, las reservas y las matrículas del esquema temporal.

El modo exposición usa CARGA_PAUSA_MS=40. La ejecución normal usa cero. Los resultados nuevos incluyen pausaDemostracionMs y motivosRechazo. La validación exige que todos los rechazos esperados tengan el código SIN_CUPOS.

La API ejecuta el escenario en un proceso hijo y coordina una única prueba por base mediante un bloqueo de sesión. Al terminar se elimina el esquema temporal. El JSON de la última ejecución puede descargarse desde la vista. Las pruebas de interfaz y de integración cubren permisos, muestras, verificaciones e independencia de los datos habituales.

## Seguimiento desde Monitoreo en vivo

Las ejecuciones por terminal publican muestras en telemetria_pruebas_carga. El panel administrativo las consulta cada dos segundos y conserva el resultado final después de la limpieza. Se muestran las últimas cinco ejecuciones iniciadas durante las últimas 24 horas.

Las métricas del proceso de carga incluyen solicitudes HTTP, errores 5xx, tiempo HTTP promedio, memoria y conexiones de su pool. Los contadores de la API que sirve el panel aparecen en su propia sección. La demostración visual mantiene su canal de seguimiento específico.

Si se interrumpe una ejecución y deja de enviar muestras durante veinte segundos, aparece un aviso de falta de actualización.
