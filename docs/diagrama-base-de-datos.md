# Diagrama 1. Conexión de los archivos de base de datos

Describe cómo los repositorios y los archivos de reservas utilizan la conexión compartida con PostgreSQL. Permite identificar qué archivo consulta cada parte del proceso y cómo se carga la configuración de conexión.

Úsalo para presentar la organización de tu parte de base de datos antes de explicar las consultas.

## Conexión entre los archivos de consultas

Las flechas indican qué archivo utiliza a otro. Todos los accesos a PostgreSQL pasan por el pool definido en config/database.ts.

![Diagrama 1. Conexión de los archivos de base de datos](imagenes/01-conexion-archivos-bd.png)

<details>
<summary>Ver el diagrama editable en Mermaid</summary>

```mermaid
flowchart TB
    subgraph PRINCIPALES["Consultas principales de matrícula"]
        PER["repositorios/periodos.repository.ts"]
        SOL["repositorios/solicitudes.repository.ts"]
        MAT["repositorios/matriculas.repository.ts"]
        RES["reservas/reservas.service.ts"]
        REC["reservas/reconciliacion.ts"]
    end

    SOL -->|"Comprueba apertura"| PER
    MAT -->|"Valida el intento y confirma la solicitud"| SOL
    RES -->|"Valida el intento de procesamiento"| SOL

    PER --> POOL
    SOL --> POOL
    MAT --> POOL
    RES --> POOL
    REC --> POOL

    OTROS["Otros repositorios<br/>auth.repository.ts<br/>sesiones.repository.ts<br/>academico.repository.ts<br/>cursos.repository.ts<br/>calificaciones.repository.ts<br/>creditos.repository.ts"] --> POOL

    ENV["backend/.env<br/>DATABASE_URL y DB_SSL"] --> CONF["config/env.ts<br/>Carga la configuración"]
    CONF --> POOL["config/database.ts<br/>Crea y exporta pool"]
    POOL --> BD[("PostgreSQL<br/>Tablas y registros")]

    classDef consulta fill:#e7effb,stroke:#5c7eae,color:#233c5c
    classDef conexion fill:#e6f3ec,stroke:#39856b,color:#1e4d3c
    class PER,SOL,MAT,RES,REC consulta
    class POOL,BD conexion
```

</details>

Los nombres del diagrama son relativos a backend/src, salvo backend/.env.

## Qué debes explicar de los archivos principales

| Archivo | Qué hace en la base de datos |
| --- | --- |
| config/database.ts | Crea el pool que reutiliza conexiones con PostgreSQL |
| periodos.repository.ts | Consulta y guarda el periodo y comprueba su apertura |
| solicitudes.repository.ts | Inserta solicitudes, toma trabajos con SKIP LOCKED y actualiza estados |
| reservas.service.ts | Bloquea el curso, cuenta matrículas y reservas y crea una reserva temporal |
| matriculas.repository.ts | Consulta condiciones académicas y confirma la matrícula y la solicitud en una transacción |
| reconciliacion.ts | Recupera trabajos vencidos y retira reservas expiradas |

Las consultas de reservas están dentro de reservas.service.ts. Ese archivo forma parte de la explicación de SQL y protección de cupos.

La creación de las tablas se explica en el [diagrama de migraciones](diagrama-migraciones.md).

## Los otros repositorios

| Archivo | Datos que maneja |
| --- | --- |
| auth.repository.ts | Usuarios |
| sesiones.repository.ts | Sesiones de autenticación |
| academico.repository.ts | Facultades, carreras y pensums |
| cursos.repository.ts | Grupos, docentes, horarios y cupos |
| calificaciones.repository.ts | Notas y materias aprobadas |
| creditos.repository.ts | Resumen de créditos |

## Orden para la exposición

1. Mostrar los SQL y explicar las tablas principales.
2. Abrir config/database.ts y explicar el pool.
3. Mostrar cómo solicitudes.repository.ts guarda y toma una solicitud.
4. Mostrar cómo reservas.service.ts cuenta y reserva los cupos.
5. Mostrar cómo matriculas.repository.ts confirma los cambios con COMMIT o los revierte con ROLLBACK.
6. Explicar que reconciliacion.ts permite recuperar operaciones interrumpidas.

Los workers y los controladores llaman a estas operaciones desde el backend. En esta parte de la exposición se estudian la estructura, las consultas y las garantías de PostgreSQL.
