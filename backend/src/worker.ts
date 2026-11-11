import { pool } from "./config/database";
import { verificarEsquema } from "./config/schema";
import { iniciarWorker } from "./colas/matriculas.worker";

async function main() {
  await verificarEsquema();
  const detener = iniciarWorker();
  console.log("Worker de matrícula activo.");
  let cerrando = false;
  async function cerrar() {
    if (cerrando) return;
    cerrando = true;
    await detener();
    await pool.end();
  }
  process.on("SIGINT", () => { void cerrar(); });
  process.on("SIGTERM", () => { void cerrar(); });
}
main().catch(async () => {
  console.error("No fue posible iniciar el worker.");
  process.exitCode = 1;
  await pool.end();
});
