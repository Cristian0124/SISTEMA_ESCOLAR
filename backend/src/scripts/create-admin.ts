import bcrypt from "bcrypt";
import { stdin, stdout } from "node:process";
import { emitKeypressEvents } from "node:readline";
import { createInterface } from "node:readline/promises";
import { z } from "zod";
import { pool } from "../config/database";
import { crearAdministrador, existeAdministrador } from "../repositorios/auth.repository";

const esquemaDatos = z.object({
  nombre: z.string().trim().min(1).max(150),
  correo: z.string().trim().email().max(254).transform((valor) => valor.toLowerCase()),
  cedula: z.string().trim().min(1).max(32),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaIngreso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nacionalidad: z.string().trim().min(1).max(100),
  genero: z.string().trim().min(1).max(50)
});

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

async function crearPrimerAdministrador() {
  if (await existeAdministrador()) {
    throw new Error("Ya existe un administrador. No se creó ninguna cuenta.");
  }

  const interfaz = createInterface({ input: stdin, output: stdout });
  const respuestas = {
    nombre: await interfaz.question("Nombre completo: "),
    correo: await interfaz.question("Correo: "),
    cedula: await interfaz.question("Cédula: "),
    fechaNacimiento: await interfaz.question("Fecha de nacimiento (AAAA-MM-DD): "),
    fechaIngreso: await interfaz.question("Fecha de ingreso (AAAA-MM-DD): "),
    nacionalidad: await interfaz.question("Nacionalidad: "),
    genero: await interfaz.question("Género: ")
  };
  interfaz.close();

  const validacion = esquemaDatos.safeParse(respuestas);
  if (!validacion.success) {
    throw new Error("Datos inválidos. Revisa el correo, los campos obligatorios y el formato de las fechas.");
  }

  const password = await preguntarSecreto("Contraseña (8-72 bytes): ");
  const confirmacion = await preguntarSecreto("Repite la contraseña: ");
  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("La contraseña debe tener entre 8 y 72 bytes.");
  }
  if (password !== confirmacion) {
    throw new Error("Las contraseñas no coinciden.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const administrador = await crearAdministrador(validacion.data, passwordHash);
  if (!administrador) {
    throw new Error("El correo o la cédula ya están registrados.");
  }

  console.log(`Administrador creado: ${administrador.correo}`);
}

crearPrimerAdministrador()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "No fue posible crear el administrador.");
    process.exitCode = 1;
  })
  .finally(() => pool.end());