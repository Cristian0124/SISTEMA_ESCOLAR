import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import app from "../src/app";
import { pool } from "../src/config/database";

const sufijo = randomUUID().replaceAll("-", "");
const correo = `registro.${sufijo}@example.test`;
const cedula = `T${sufijo.slice(0, 31)}`;
const password = "PruebaSegura123!";
const datosRegistro = {
  nombre: "Usuario de prueba",
  correo,
  password,
  cedula,
  fechaNacimiento: "2005-01-10",
  fechaIngreso: new Date().toISOString().slice(0, 10),
  nacionalidad: "Prueba",
  genero: "Prefiero no indicar"
};

let servidor: Server;
let baseUrl: string;

before(async () => {
  servidor = app.listen(0);
  await new Promise<void>((resolve, reject) => {
    servidor.once("listening", resolve);
    servidor.once("error", reject);
  });

  const direccion = servidor.address();
  assert.ok(direccion && typeof direccion !== "string");
  baseUrl = `http://127.0.0.1:${direccion.port}`;
});

after(async () => {
  try {
    await pool.query("DELETE FROM usuarios WHERE correo = $1", [correo]);
  } finally {
    if (servidor?.listening) {
      await new Promise<void>((resolve, reject) => {
        servidor.close((error) => error ? reject(error) : resolve());
      });
    }
    await pool.end();
  }
});

test("registro y autenticación", async (contexto) => {
  await contexto.test("registra correctamente con rol estudiante y hash bcrypt", async () => {
    const respuesta = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(datosRegistro)
    });
    const cuerpo = await respuesta.json() as { usuario: { id: number; rol: string; password_hash?: string } };

    assert.equal(respuesta.status, 201);
    assert.equal(cuerpo.usuario.rol, "estudiante");
    assert.equal("password_hash" in cuerpo.usuario, false);

    const resultado = await pool.query<{ password_hash: string }>(
      "SELECT password_hash FROM usuarios WHERE correo = $1",
      [correo]
    );
    assert.match(resultado.rows[0].password_hash, /^\$2[aby]\$12\$/);
  });

  await contexto.test("rechaza un correo duplicado", async () => {
    const respuesta = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...datosRegistro, cedula: `D${sufijo.slice(0, 31)}` })
    });
    const cuerpo = await respuesta.json() as { codigo: string };

    assert.equal(respuesta.status, 409);
    assert.equal(cuerpo.codigo, "USUARIO_EXISTENTE");
  });

  await contexto.test("rechaza campos inválidos", async () => {
    const respuesta = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...datosRegistro, correo: "no-es-correo", password: "corta" })
    });
    const cuerpo = await respuesta.json() as { codigo: string };

    assert.equal(respuesta.status, 400);
    assert.equal(cuerpo.codigo, "DATOS_INVALIDOS");
  });

  await contexto.test("rechaza credenciales incorrectas", async () => {
    const respuesta = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ correo, password: "Incorrecta123!" })
    });
    const cuerpo = await respuesta.json() as { codigo: string };

    assert.equal(respuesta.status, 401);
    assert.equal(cuerpo.codigo, "CREDENCIALES_INVALIDAS");
  });
});