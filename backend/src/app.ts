import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { FRONT_ORIGIN, NODE_ENV } from "./config/env";
import { manejarError, rutaNoEncontrada } from "./middlewares/error.middleware";
import apiRoutes from "./routes/api.routes";

import { correlacion } from "./middlewares/correlacion.middleware";
import { medirHttp } from "./monitoreo/metricas";
import { limitarSolicitudes } from "./middlewares/rate-limit.middleware";
const app = express();
app.use(correlacion);
app.use(medirHttp);
app.use("/api/auth/login", limitarSolicitudes("login", 20, 60));

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
  exposedHeaders: ["x-correlation-id"],
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({limit:'2mb'}));
app.use("/api", apiRoutes);
app.use(rutaNoEncontrada);
app.use(manejarError);

export default app;
