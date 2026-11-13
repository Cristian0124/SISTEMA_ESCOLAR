# Modelo relacional de PostgreSQL

Diagrama ER de las tablas definidas por las migraciones `001_esquema.sql`, `002_catalogo_academico.sql`, `003_matricula_masiva.sql` y `004_telemetria_carga.sql`. Las relaciones representan claves foráneas; los campos JSONB se muestran como datos embebidos y no como relaciones.

```mermaid
erDiagram
    FACULTADES {
        varchar codigo PK
        varchar nombre
    }

    CARRERAS {
        varchar codigo PK
        varchar facultad_codigo FK
        varchar nombre
        varchar nivel
        varchar modalidad
        text fuente
        date consultado_en
    }

    USUARIOS {
        int id PK
        varchar nombre
        varchar correo UK
        text password_hash
        varchar rol
        boolean activo
        varchar cedula UK
        date fecha_nacimiento
        date fecha_ingreso
        varchar nacionalidad
        varchar genero
        varchar carrera_codigo FK
    }

    MATERIAS {
        varchar codigo PK
        varchar nombre
    }

    MATERIAS_PENSUM {
        varchar carrera_codigo PK, FK
        varchar codigo PK, FK
        smallint semestre
        smallint creditos
    }

    PRERREQUISITOS_MATERIA {
        varchar carrera_codigo PK, FK
        varchar codigo_materia PK, FK
        varchar codigo_requisito PK, FK
    }

    CURSOS {
        int id PK
        varchar codigo UK
        varchar codigo_pensum FK
        int docente_id FK
        varchar horario
        int cupos_totales
        int cupos_disponibles
    }

    CURSO_HORARIOS {
        int id PK
        int curso_id FK
        smallint dia
        time hora_inicio
        time hora_fin
    }

    MATRICULAS {
        int id PK
        int usuario_id FK
        int curso_id FK
        jsonb curso
        varchar estado
        timestamptz fecha
        varchar periodo
    }

    CALIFICACIONES {
        int usuario_id PK, FK
        varchar codigo_materia PK, FK
        numeric corte_1
        numeric corte_2
        numeric corte_3
        numeric nota
        int registrada_por FK
        timestamptz actualizada_en
    }

    SOLICITUDES_CREDITOS {
        int id PK
        int usuario_id FK
        varchar periodo
        int creditos
        text motivo
        varchar estado
        timestamptz solicitado_en
        int revisado_por FK
        timestamptz revisado_en
    }

    SOLICITUDES_SOPORTE {
        int id PK
        int usuario_id FK
        text mensaje
        timestamptz creado_en
        text respuesta
        int respondido_por FK
        timestamptz respondido_en
    }

    SESIONES_AUTH {
        bigint id PK
        int usuario_id FK
        char refresh_hash UK
        timestamptz vence_en
        timestamptz revocada_en
        timestamptz creada_en
    }

    PERFILES_USUARIOS {
        int usuario_id PK, FK
        jsonb datos_contacto
        jsonb hoja_vida
        timestamptz actualizado_en
    }

    PERIODOS_MATRICULA {
        varchar codigo PK
        timestamptz apertura
        timestamptz cierre
        boolean habilitado
    }

    SOLICITUDES_MATRICULA {
        uuid id PK
        int usuario_id FK
        int curso_id FK
        varchar periodo FK
        uuid clave
        varchar correlacion
        varchar estado
        int intentos
        timestamptz disponible_en
        uuid token
        timestamptz vence_en
        int matricula_id FK
        text motivo
        varchar codigo_error
        timestamptz creada_en
        timestamptz terminada_en
    }

    RESERVAS_CUPOS {
        uuid solicitud_id PK, FK
        int curso_id FK
        varchar periodo
        uuid token
        timestamptz vence_en
    }

    WORKERS_MATRICULA {
        uuid id PK
        timestamptz actualizado_en
    }

    LIMITES_HTTP {
        text clave PK
        int cantidad
        timestamptz vence_en
    }

    SIS_MIGRACIONES {
        text archivo PK
        timestamptz aplicada_en
    }

    TELEMETRIA_PRUEBAS_CARGA {
        uuid id PK
        text estado
        int estudiantes
        int cupos
        int conexiones
        int pausa_ms
        int pid
        jsonb progreso
        jsonb proceso
        jsonb resultado
        text mensaje
        timestamptz iniciada_en
        timestamptz actualizada_en
        timestamptz terminada_en
    }

    FACULTADES ||--o{ CARRERAS : organiza
    CARRERAS o|--o{ USUARIOS : asigna
    CARRERAS ||--o{ MATERIAS_PENSUM : incluye
    MATERIAS ||--o{ MATERIAS_PENSUM : programa
    MATERIAS_PENSUM ||--o{ PRERREQUISITOS_MATERIA : requiere
    MATERIAS_PENSUM ||--o{ PRERREQUISITOS_MATERIA : es_requisito
    MATERIAS ||--o{ CURSOS : se_oferta_en
    USUARIOS o|--o{ CURSOS : docente
    CURSOS ||--o{ CURSO_HORARIOS : tiene
    USUARIOS ||--o{ MATRICULAS : realiza
    CURSOS ||--o{ MATRICULAS : recibe
    USUARIOS ||--o{ CALIFICACIONES : obtiene
    MATERIAS ||--o{ CALIFICACIONES : evalua
    USUARIOS o|--o{ CALIFICACIONES : registra
    USUARIOS ||--o{ SOLICITUDES_CREDITOS : solicita
    USUARIOS o|--o{ SOLICITUDES_CREDITOS : revisa
    USUARIOS ||--o{ SOLICITUDES_SOPORTE : crea
    USUARIOS o|--o{ SOLICITUDES_SOPORTE : responde
    USUARIOS ||--o{ SESIONES_AUTH : inicia
    USUARIOS ||--o| PERFILES_USUARIOS : tiene
    USUARIOS ||--o{ SOLICITUDES_MATRICULA : solicita
    CURSOS ||--o{ SOLICITUDES_MATRICULA : solicitado_para
    PERIODOS_MATRICULA ||--o{ SOLICITUDES_MATRICULA : abre
    MATRICULAS o|--o{ SOLICITUDES_MATRICULA : resultado
    SOLICITUDES_MATRICULA ||--o| RESERVAS_CUPOS : reserva
    CURSOS ||--o{ RESERVAS_CUPOS : aparta
```

## Notas de lectura

- `MATERIAS_PENSUM` asocia cada materia con una carrera; su clave primaria es compuesta por `carrera_codigo` y `codigo`.
- `PRERREQUISITOS_MATERIA` tiene dos referencias a esa clave compuesta. Así un prerrequisito pertenece al mismo plan que la materia dependiente.
- `CALIFICACIONES` usa `(usuario_id, codigo_materia)` como clave primaria, por lo que hay una calificación final por materia y estudiante.
- `CURSOS.codigo_pensum` referencia `MATERIAS.codigo`; el servicio comprueba además que la materia pertenezca a la carrera del estudiante.
- `MATRICULAS.curso` es una copia JSONB del curso al momento de inscripción. La relación vigente se mantiene por `curso_id`.
- `SOLICITUDES_MATRICULA.periodo` referencia `PERIODOS_MATRICULA.codigo`. `MATRICULAS.periodo` y `RESERVAS_CUPOS.periodo` son valores de periodo sin clave foránea declarada.
- `WORKERS_MATRICULA`, `LIMITES_HTTP`, `SIS_MIGRACIONES` y `TELEMETRIA_PRUEBAS_CARGA` no tienen relaciones foráneas en estas migraciones.
