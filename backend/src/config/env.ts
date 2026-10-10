import dotenv from "dotenv";

dotenv.config();

const enProduccion = process.env.NODE_ENV === "production";
if (enProduccion && (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET)) {
  throw new Error("JWT_ACCESS_SECRET y JWT_REFRESH_SECRET son obligatorios en produccion");
}

export const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);
export const FRONT_ORIGIN = process.env.FRONT_ORIGIN ?? "http://localhost:5173";
export const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "clave-access-local-no-usar-en-produccion";
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "clave-refresh-local-no-usar-en-produccion";
export const NODE_ENV = process.env.NODE_ENV ?? "development";