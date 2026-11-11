# Interfaz de SIS 2.0

Configura VITE_API_URL en .env. El ejemplo apunta a http://localhost:3001/api.
npm.cmd run dev inicia Vite en http://localhost:5174.
npm.cmd run build comprueba los tipos y genera dist.
npm.cmd test -- --run ejecuta las pruebas de interfaz.

El estudiante consulta la oferta, solicita matrículas y sigue sus estados. El administrador configura el periodo, crea grupos y supervisa el monitoreo.

Las rutas /admin/periodos y /admin/monitoreo requieren rol admin. /matricula presenta el flujo de solicitudes y /schedule muestra el horario confirmado.

Los estados de solicitudes se actualizan cada tres segundos y las métricas cada dos. Los sondeos se detienen al salir de las vistas. La caché del catálogo dura diez segundos y se invalida al cambiar de usuario.

Los tokens de acceso viven en memoria y la renovación usa una cookie HttpOnly. Las claves de idempotencia sin respuesta se conservan en sessionStorage.
