# Migraciones

001_esquema.sql crea la estructura académica.
002_catalogo_academico.sql carga el catálogo.
003_matricula_masiva.sql agrega periodos, solicitudes, reservas, workers y límites.

Desde backend ejecuta npm.cmd run db:migrate y npm.cmd run db:check. El ejecutor bloquea instalaciones simultáneas, aplica cada archivo en una transacción y registra su versión en sis_migraciones.

Una instalación de la versión anterior con las tablas académicas completas recibe la migración 003 sin borrar sus datos.

004_telemetria_carga.sql agrega el registro compartido de telemetría de las pruebas por terminal.
