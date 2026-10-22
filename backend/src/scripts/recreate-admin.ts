import bcrypt from "bcrypt";
import { stdin, stdout } from "node:process";
import { emitKeypressEvents } from "node:readline";
import { createInterface } from "node:readline/promises";
import { z } from "zod";
import { pool } from "../config/database";

const emailSchema = z.string().trim().email().max(254).transform((email) => email.toLowerCase());

function preguntarSecreto(mensaje: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    return Promise.reject(new Error("Ejecuta este comando desde una terminal interactiva."));
  }

  emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  stdout.write(mensaje);

  return new Promise((resolve, reject) => {
    let secreto = "";
    const finalizar = (error?: Error) => {
      stdin.off("keypress", recibirTecla);
      stdin.setRawMode(false);
      stdout.write("\n");
      if (error) reject(error);
      else resolve(secreto);
    };

    const recibirTecla = (caracter: string | undefined, tecla: { name?: string; ctrl?: boolean }) => {
      if (tecla.ctrl && tecla.name === "c") {
        finalizar(new Error("Operación cancelada."));
      } else if (tecla.name === "return" || tecla.name === "enter") {
        finalizar();
      } else if (tecla.name === "backspace") {
        secreto = secreto.slice(0, -1);
        stdout.write("\b \b");
      } else if (caracter && !tecla.ctrl && caracter >= " ") {
        secreto += caracter;
        stdout.write("*");
      }
    };

    stdin.on("keypress", recibirTecla);
  });
}

async function recrearAdministrador() {
  const interfaz = createInterface({ input: stdin, output: stdout });
  const correoIngresado = await interfaz.question("Correo del administrador actual: ");
  interfaz.close();

  const validacionCorreo = emailSchema.safeParse(correoIngresado);
  if (!validacionCorreo.success) {
    throw new Error("El correo no tiene un formato válido.");
  }

  const password = await preguntarSecreto("Nueva contraseña (8-72 bytes): ");
  const confirmacion = await preguntarSecreto("Repite la nueva contraseña: ");
  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("La contraseña debe tener entre 8 y 72 bytes.");
  }
  if (password !== confirmacion) {
    throw new Error("Las contraseñas no coinciden.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const cliente = await pool.connect();
  let transaccionAbierta = false;

  try {
    await cliente.query("BEGIN");
    transaccionAbierta = true;

    const existente = await cliente.query<{
      id: number;
      nombre: string;
      correo: string;
      activo: boolean;
      cedula: string;
      fecha_nacimiento: Date;
      fecha_ingreso: Date;
      nacionalidad: string;
      genero: string;
    }>(
      `SELECT id, nombre, correo, activo, cedula, fecha_nacimiento,
              fecha_ingreso, nacionalidad, genero
       FROM usuarios
       WHERE LOWER(BTRIM(correo)) = $1 AND rol = 'admin'
       FOR UPDATE`,
      [validacionCorreo.data]
    );

    const administrador = existente.rows[0];
    if (!administrador) {
      throw new Error("No se encontró un administrador con ese correo.");
    }
    if (!administrador.activo) {
      throw new Error("La cuenta administradora está inactiva; no se modificó.");
    }

    const referencias = await cliente.query<{ tiene_referencias: boolean }>(
      `SELECT
         EXISTS (SELECT 1 FROM matriculas WHERE usuario_id = $1)
         OR EXISTS (SELECT 1 FROM calificaciones WHERE usuario_id = $1 OR registrada_por = $1)
         AS tiene_referencias`,
      [administrador.id]
    );
    if (referencias.rows[0].tiene_referencias) {
      throw new Error("El administrador tiene matrículas o calificaciones asociadas; no se modificó.");
    }

    await cliente.query(
      "DELETE FROM usuarios WHERE id = $1 AND rol = 'admin'",
      [administrador.id]
    );
    await cliente.query(
      `INSERT INTO usuarios (
        id, nombre, correo, password_hash, rol, activo, cedula,
        fecha_nacimiento, fecha_ingreso, nacionalidad, genero
      ) VALUES ($1, $2, $3, $4, 'admin', $5, $6, $7, $8, $9, $10)`,
      [
        administrador.id,
        administrador.nombre,
        administrador.correo,
        passwordHash,
        administrador.activo,
        administrador.cedula,
        administrador.fecha_nacimiento,
        administrador.fecha_ingreso,
        administrador.nacionalidad,
        administrador.genero
      ]
    );

    await cliente.query("COMMIT");
    transaccionAbierta = false;
    console.log("Administrador eliminado y recreado con el mismo perfil e identificador.");
  } catch (error) {
    if (transaccionAbierta) await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}

recrearAdministrador()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "No fue posible recrear el administrador.");
    process.exitCode = 1;
  })
  .finally(() => pool.end());
