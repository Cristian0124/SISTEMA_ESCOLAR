import app from "./app";
import { PORT } from "./config/env";
import { verificarEsquema } from "./config/schema";
import { pool } from "./config/database";

verificarEsquema().then(() => {
  app.listen(PORT, () => console.log(`Servidor activo en http://localhost:${PORT}`));
}).catch(async error => {
  console.error(error instanceof Error ? error.message : 'No fue posible conectar con la base de datos');
  await pool.end();
  process.exitCode = 1;
});
