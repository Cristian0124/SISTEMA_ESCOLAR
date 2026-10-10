import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { FRONT_ORIGIN, PORT } from "./config/env";
import { manejarError, rutaNoEncontrada } from "./middlewares/error.middleware";
import apiRoutes from "./routes/api.routes";

const app = express();

app.use(helmet());
app.use(cors({ origin: FRONT_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use("/api", apiRoutes);
app.use(rutaNoEncontrada);
app.use(manejarError);

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});

export default app;
