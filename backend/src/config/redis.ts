// Esta versión usa PostgreSQL como cola duradera y almacén de reservas.
// Redis no es una dependencia de ejecución. Su configuración queda reservada
// para un transporte futuro que deberá preservar idempotencia y recuperación.
export interface ConfiguracionRedis {
  url: string;
  prefijo: string;
}
