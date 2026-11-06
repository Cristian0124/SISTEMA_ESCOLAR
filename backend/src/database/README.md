# Migraciones

Las migraciones se aplican en el orden de `migraciones.ts`.

1. `001_esquema.sql` crea las tablas, restricciones y funciones de PostgreSQL.
2. `002_catalogo_academico.sql` carga las carreras, los planes y los prerrequisitos.

Desde `backend`, configura `DATABASE_URL` para una base vacía y ejecuta
`npm.cmd run db:migrate`. El ejecutor aplica cada archivo en una transacción
y toma un bloqueo para evitar instalaciones simultáneas. Con
`npm.cmd run db:check` puedes comprobar el esquema antes de iniciar la app.

Estas dos migraciones sustituyen el conjunto anterior. Para instalar esta
versión desde una base antigua, crea una nueva y cambia `DATABASE_URL`.
El ejecutor detecta el esquema anterior y se detiene sin modificarlo.
