# SIS 2.0

Sistema de matrícula con solicitudes persistentes, procesamiento asíncrono, reservas atómicas y monitoreo.

La API y el worker usan PostgreSQL como cola duradera y almacén de reservas. Redis queda como una extensión opcional. El worker embebido se inicia con el backend durante el desarrollo.

## Ejecución

1. Ejecuta npm.cmd install y npm.cmd run install:all desde la raíz de SIS.
2. Configura backend/.env y frontend/.env a partir de sus ejemplos. Usa una base exclusiva como sistema_escolar_v2.
3. Desde backend ejecuta npm.cmd run db:migrate y npm.cmd run db:check.
4. Crea un administrador desde backend con npm.cmd run control-admin.
5. Desde la raíz de SIS ejecuta npm.cmd run dev.

La configuración de ejemplo usa la interfaz en http://localhost:5174 y la API en http://localhost:3001/api.

En el panel administrativo abre Apertura de matrícula, establece las fechas y habilita el periodo. Crea cursos con horarios y cupos desde Administración académica. Monitoreo en vivo muestra la actividad de la cola.

El estudiante entra a Matrícula masiva, envía solicitudes y consulta sus estados. La matrícula y el horario se actualizan al confirmar el trabajo.

## Comprobación

npm.cmd run build compila ambos proyectos.
npm.cmd test ejecuta las pruebas del backend y de la interfaz.
npm.cmd run test:carga compila el backend y ejecuta el escenario de carga sobre un esquema temporal.

Para un worker separado configura WORKER_EMBEBIDO=false en backend/.env, inicia la API y ejecuta npm.cmd run worker desde backend. En producción se puede usar npm.cmd run worker:prod después del build.

Consulta docs/arquitectura.md, docs/base-de-datos.md y docs/pruebas-de-rendimiento.md para estudiar la implementación y los resultados.

## Demostración visual

Entra como administrador y abre Demostración visual o /admin/simulacion. Elige estudiantes y cupos y pulsa Iniciar demostración. El servidor ejecuta el escenario real de carga en un esquema temporal y publica muestras del avance.

El modo exposición añade pausas de 40 ms para observar reservas y procesamiento. Desactívalo para medir la prueba sin esas pausas. Los tiempos incluyen la configuración elegida. El panel permite descargar el resultado y explica cada comprobación.

El proceso requiere permisos para crear esquemas y mantiene una sola demostración activa por base de datos. La API conserva el estado de la última demostración en memoria mientras siga ejecutándose.
