# Migraciones

El catálogo ordenado de migraciones está en `migraciones.ts`. Lo consumen la
comprobación del esquema, el ejecutor general y la preparación de las pruebas.
No se debe mantener una lista paralela de archivos SQL.

Desde `backend`, `npm.cmd run db:check` inspecciona el esquema sin modificarlo.
`npm.cmd run db:migrate` aplica las migraciones pendientes bajo bloqueo asesor,
cada una dentro de una transacción. Estos comandos son explícitos: el servidor
no aplica migraciones al arrancar.

Se conservan los nombres históricos, incluidos los prefijos repetidos `002` y
`005`. El orden del catálogo es el orden de instalación. Para nuevos cambios,
usar el siguiente número libre y agregar el archivo al catálogo. Los archivos
`.down.sql` no forman parte de la instalación.

La detección actual comprueba objetos del esquema; no mantiene un historial
persistente de migraciones ejecutadas. No debe usarse para certificar que todas
las restricciones y datos históricos coinciden. Incorporar ese historial requiere
definir antes cómo registrar las bases ya instaladas sin repetir sus seeds.

La migración de asignación docente utiliza `current_schema()` para funcionar
tanto en el esquema de la aplicación como en los esquemas aislados de pruebas.
El antiguo ejecutor exclusivo de la migración 007 fue retirado: usar el ejecutor
general para todas las instalaciones.
