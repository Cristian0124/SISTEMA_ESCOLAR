import { Pool } from "pg";
import "./env";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL es obligatoria para conectar con PostgreSQL");
}

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DB_SSL === "true"
    ? { rejectUnauthorized: false }
    : undefined
});
