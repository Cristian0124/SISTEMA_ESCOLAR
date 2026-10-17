import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { FRONT_ORIGIN, NODE_ENV } from "./config/env";
import { manejarError, rutaNoEncontrada } from "./middlewares/error.middleware";
import apiRoutes from "./routes/api.routes";

const app = express();

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const origenLocalDeDesarrollo = NODE_ENV !== "production"
      && /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin ?? "");
    if (!origin || origin === FRONT_ORIGIN || origenLocalDeDesarrollo) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use("/api", apiRoutes);
app.use(rutaNoEncontrada);
app.use(manejarError);

export default app;