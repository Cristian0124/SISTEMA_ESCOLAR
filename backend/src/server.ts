import app from "./app";
import { PORT } from "./config/env";
import { verificarEsquema } from "./config/schema";
import { pool } from "./config/database";
import { iniciarWorker } from "./colas/matriculas.worker";

async function main() {
  await verificarEsquema();
  const detenerWorker = process.env.WORKER_EMBEBIDO === "false" ? null : iniciarWorker();
  const servidor = app.listen(PORT, () => console.log(`Servidor activo en http://localhost:${PORT}`));
  let cerrando = false;
  async function cerrar() {
    if (cerrando) return;
    cerrando = true;
    const cierreHttp = new Promise<void>((resolve,reject) => servidor.close(error => error ? reject(error):resolve()));
    if (detenerWorker) await detenerWorker();
    await cierreHttp;
    await pool.end();
  }
  process.on("SIGINT", () => { void cerrar(); });
  process.on("SIGTERM", () => { void cerrar(); });
}
main().catch(async () => {
  console.error("No fue posible iniciar el servidor. Comprueba la conexión y las migraciones.");
  process.exitCode = 1;
  await pool.end();
});
