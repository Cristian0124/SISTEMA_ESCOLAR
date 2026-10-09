import express from "express";
import helmet from "helmet";

const app = express();
const PORT = 3000;

app.use(helmet());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Backend del Sistema Escolar funcionando"
  });
});

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});
