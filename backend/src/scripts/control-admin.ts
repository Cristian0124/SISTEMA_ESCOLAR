// Herramienta interactiva para crear administradores y cambiar sus contraseñas.
import bcrypt from "bcrypt";
import { stdin, stdout } from "node:process";
import { emitKeypressEvents } from "node:readline";
import { createInterface } from "node:readline/promises";
import { z } from "zod";
import { pool } from "../config/database";
import { crearAdministrador } from "../repositorios/auth.repository";

const correoSchema = z.string().trim().email().max(254).transform((correo) => correo.toLowerCase());
const fechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((valor) => {
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
});
const passwordSchema = z.string().refine((valor) => {
  const bytes = Buffer.byteLength(valor, "utf8");
  return bytes >= 8 && bytes <= 72;
}, "La contraseña debe tener entre 8 y 72 bytes.");

function preguntar(mensaje: string): Promise<string> {
  const interfaz = createInterface({ input: stdin, output: stdout });
  return interfaz.question(mensaje).finally(() => interfaz.close());
}

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
        secreto = Array.from(secreto).slice(0, -1).join("");
        stdout.write("\b \b");
      } else if (caracter && !tecla.ctrl && caracter >= " ") {
        secreto += caracter;
        stdout.write("*");
      }
    };

    stdin.on("keypress", recibirTecla);
  });
}

async function pedirPassword(): Promise<string> {
  const password = passwordSchema.parse(await preguntarSecreto("Contraseña (8-72 bytes): "));
  const confirmacion = await preguntarSecreto("Repite la contraseña: ");
  if (password !== confirmacion) throw new Error("Las contraseñas no coinciden.");
  return password;
}

async function crear(): Promise<void> {
  const nombre = (await preguntar("Nombre completo: ")).trim();
  const correo = correoSchema.parse(await preguntar("Correo: "));
  const cedula = (await preguntar("Cédula: ")).trim();
  const fechaNacimiento = fechaSchema.parse(await preguntar("Fecha de nacimiento (AAAA-MM-DD): "));
  const fechaIngreso = fechaSchema.parse(await preguntar("Fecha de ingreso (AAAA-MM-DD): "));
  const nacionalidad = (await preguntar("Nacionalidad: ")).trim();
  const genero = (await preguntar("Género: ")).trim();

  const datos = z.object({
    nombre: z.string().min(1).max(150),
    correo: correoSchema,
    cedula: z.string().min(1).max(32),
    fechaNacimiento: fechaSchema,
    fechaIngreso: fechaSchema,
    nacionalidad: z.string().min(1).max(100),
    genero: z.string().min(1).max(50)
  }).parse({ nombre, correo, cedula, fechaNacimiento, fechaIngreso, nacionalidad, genero });

  const password = await pedirPassword();
  const administrador = await crearAdministrador(datos, await bcrypt.hash(password, 12));
  if (!administrador) throw new Error("El correo o la cédula ya están registrados; no se creó la cuenta.");
  console.log(`Administrador creado: ${administrador.correo}`);
}

async function cambiarPassword(): Promise<void> {
  const correo = correoSchema.parse(await preguntar("Correo del administrador: "));
  const password = await pedirPassword();
  const resultado = await pool.query<{ correo: string; activo: boolean }>(
    `UPDATE usuarios
     SET password_hash = $1
     WHERE LOWER(BTRIM(correo)) = $2 AND rol = 'admin'
     RETURNING correo, activo`,
    [await bcrypt.hash(password, 12), correo]
  );

  const administrador = resultado.rows[0];
  if (!administrador) throw new Error("No se encontró un administrador con ese correo.");
  console.log(`Contraseña actualizada para ${administrador.correo}${administrador.activo ? "." : "; la cuenta sigue inactiva."}`);
}

async function borrar(): Promise<void> {
  const correo = correoSchema.parse(await preguntar("Correo del administrador que quieres borrar: "));
  const confirmacion = (await preguntar(`Para confirmar, escribe ${correo}: `)).trim().toLowerCase();
  if (confirmacion !== correo) throw new Error("El correo no coincide; no se borró ninguna cuenta.");

  const cliente = await pool.connect();
  let transaccionAbierta = false;
  try {
    await cliente.query("BEGIN");
    transaccionAbierta = true;

    const administradores = await cliente.query<{ id: number; activo: boolean }>(
      "SELECT id, activo FROM usuarios WHERE rol = 'admin' FOR UPDATE"
    );
    if (administradores.rows.length <= 1) {
      throw new Error("No se puede borrar el último administrador.");
    }

    const resultado = await cliente.query<{ id: number; nombre: string; correo: string; activo: boolean }>(
      `SELECT id, nombre, correo, activo
       FROM usuarios
       WHERE LOWER(BTRIM(correo)) = $1 AND rol = 'admin'
       FOR UPDATE`,
      [correo]
    );
    const administrador = resultado.rows[0];
    if (!administrador) throw new Error("No se encontró un administrador con ese correo.");
    if (administrador.activo) {
      const activos = administradores.rows.filter((cuenta) => cuenta.activo).length;
      if (activos <= 1) throw new Error("No se puede borrar el último administrador activo.");
    }

    const referencias = await cliente.query<{ tiene_referencias: boolean }>(
      `SELECT
         EXISTS (SELECT 1 FROM matriculas WHERE usuario_id = $1)
         OR EXISTS (SELECT 1 FROM calificaciones WHERE usuario_id = $1 OR registrada_por = $1)
         OR EXISTS (SELECT 1 FROM solicitudes_creditos WHERE usuario_id = $1 OR revisado_por = $1)
         OR EXISTS (SELECT 1 FROM cursos WHERE docente_id = $1)
         AS tiene_referencias`,
      [administrador.id]
    );
    if (referencias.rows[0].tiene_referencias) {
      throw new Error("La cuenta tiene datos asociados; no se borró para conservar matrículas, notas y asignaciones.");
    }

    await cliente.query("DELETE FROM usuarios WHERE id = $1 AND rol = 'admin'", [administrador.id]);
    await cliente.query("COMMIT");
    transaccionAbierta = false;
    console.log(`Administrador borrado: ${administrador.correo}`);
  } catch (error) {
    if (transaccionAbierta) await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}

async function main(): Promise<void> {
  console.log("Administradores: 1) Crear cuenta  2) Cambiar contraseña  3) Borrar cuenta");
  const opcion = (await preguntar("Elige una opción: ")).trim();
  if (opcion === "1") return crear();
  if (opcion === "2") return cambiarPassword();
  if (opcion === "3") return borrar();
  throw new Error("Opción no válida. Ejecuta el comando de nuevo y elige 1, 2 o 3.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "No se pudo completar la operación.");
    process.exitCode = 1;
  })
  .finally(() => pool.end());
