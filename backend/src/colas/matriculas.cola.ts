// La cola es persistente en PostgreSQL. SKIP LOCKED reparte trabajos atómicamente
// entre consumidores y el token por intento impide confirmar trabajos vencidos.
export { encolarSolicitud, tomarSolicitud } from "../repositorios/solicitudes.repository";
