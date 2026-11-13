# Diagrama 3. Control de cupos durante la matrícula masiva

Describe cómo las consultas SQL, los bloqueos, las reservas temporales y las transacciones protegen la capacidad del curso durante solicitudes simultáneas. También muestra el rechazo, el reintento y la recuperación de operaciones interrumpidas.

Úsalo para explicar el objetivo principal del proyecto desde la base de datos.

El objetivo es que las solicitudes simultáneas respeten la capacidad del curso. Por ejemplo, si 2000 estudiantes compiten por 30 cupos, deben confirmarse como máximo 30 matrículas.

Las flechas muestran el flujo de operaciones de base de datos. Cada bloque identifica el archivo responsable de su SQL.

![Diagrama 3. Control de cupos durante la matrícula masiva](imagenes/03-control-cupos.png)

<details>
<summary>Ver el diagrama editable en Mermaid</summary>

```mermaid
flowchart TD
    A["solicitudes.repository.ts<br/>Guarda las solicitudes en<br/>solicitudes_matricula"]
    B["solicitudes.repository.ts<br/>Toma una solicitud pendiente<br/>FOR UPDATE SKIP LOCKED"]
    C["reservas.service.ts<br/>Bloquea la fila del curso con FOR UPDATE<br/>Cuenta matrículas y reservas vigentes"]
    D{"¿Hay capacidad libre?"}
    E["reservas.service.ts<br/>INSERT en reservas_cupos<br/>Cupo temporal con vencimiento"]
    F["matriculas.repository.ts<br/>BEGIN<br/>Valida condiciones y vigencia de la reserva<br/>INSERT en matriculas<br/>UPDATE de la solicitud a confirmada<br/>DELETE de su reserva<br/>COMMIT"]
    G["Resultado<br/>Las matrículas confirmadas<br/>respetan el límite del curso"]
    H["solicitudes.repository.ts<br/>Actualiza la solicitud para<br/>reintentar o rechazar, según la causa"]
    I["ROLLBACK<br/>Revierte los cambios de<br/>la confirmación fallida"]
    J["reservas/reconciliacion.ts<br/>Retira reservas vencidas y<br/>recupera trabajos interrumpidos"]

    A --> B --> C --> D
    D -->|"Sí"| E
    D -->|"Capacidad ocupada o reservada"| H
    E --> F --> G
    F -.->|"Si la operación falla"| I
    I --> H
    E -.->|"Si vence sin confirmación"| J
    J -->|"Reencola cuando corresponde"| B
    H -.->|"Si corresponde reintentar"| B

    classDef cola fill:#e8effc,stroke:#5579b8,color:#243e67
    classDef reserva fill:#fff2d8,stroke:#bd852c,color:#674715
    classDef confirmado fill:#e3f3ec,stroke:#27836b,color:#163e33
    class A,B cola
    class C,D,E reserva
    class F,G confirmado
```

</details>

El bloqueo de la fila del curso coordina el conteo de matrículas y reservas con la creación de nuevas reservas. SKIP LOCKED permite tomar trabajos distintos de la cola.

La matrícula, el estado confirmado de la solicitud y la eliminación de su reserva se guardan dentro de una misma transacción. Si la confirmación falla, ROLLBACK revierte sus cambios y el procesamiento registra el resultado o reintento.

La restricción UNIQUE de usuario, curso y periodo evita matrículas duplicadas. La capacidad se protege mediante el conteo bajo bloqueo y las comprobaciones de la transacción.

Las tablas principales son solicitudes_matricula, reservas_cupos, cursos y matriculas. Sus definiciones están en 001_esquema.sql y 003_matricula_masiva.sql.

Los bloqueos se liberan al cerrar la transacción. Las reservas son registros con vencimiento que pueden recuperarse después de un fallo.
