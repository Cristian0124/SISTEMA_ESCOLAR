import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import app from "../src/app";
import { JWT_ACCESS_SECRET } from "../src/config/env";
import { pool } from "../src/config/database";
import { crearAdministrador } from "../src/repositorios/auth.repository";

const sufijo = randomUUID().replaceAll("-", "");
const correo = `registro.${sufijo}@example.test`;
const cedula = `T${sufijo.slice(0, 31)}`;
const correoAdmin = `admin.${sufijo}@example.test`;
const cedulaAdmin = `A${sufijo.slice(0, 31)}`;
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
let estudianteId: number;
let administradorId: number;

function tokenPara(id: number, rol: "admin" | "estudiante") {
  return jwt.sign({ id, nombre: "Usuario de prueba", rol }, JWT_ACCESS_SECRET);
}

before(async () => {
  const administrador = await crearAdministrador({
    nombre: "Admin de pruebas",
    correo: correoAdmin,
    cedula: cedulaAdmin,
    fechaNacimiento: "1980-01-01",
    fechaIngreso: new Date().toISOString().slice(0, 10),
    nacionalidad: "Prueba",
    genero: "Prefiero no indicar"
  }, await bcrypt.hash("AdminPrueba123!", 4));
  assert.ok(administrador);
  administradorId = administrador.id;

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
    await pool.query("DELETE FROM usuarios WHERE correo = ANY($1::text[])", [[correo, correoAdmin]]);
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
    estudianteId = cuerpo.usuario.id;

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

  await contexto.test("bloquea una matrícula si falta aprobar el prerrequisito", async () => {
    const respuesta = await fetch(`${baseUrl}/api/matriculas`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${tokenPara(estudianteId, "estudiante")}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ cursoId: 3 })
    });
    const cuerpo = await respuesta.json() as { codigo: string; mensaje: string };

    assert.equal(respuesta.status, 409);
    assert.equal(cuerpo.codigo, "PRERREQUISITOS_PENDIENTES");
    assert.match(cuerpo.mensaje, /ISI01/);
  });

  await contexto.test("desbloquea Cálculo I cuando se aprueba ISI01 con 3.0", async () => {
    const autorizacion = `Bearer ${tokenPara(administradorId, "admin")}`;
    const registrarNota = (nota: number) => fetch(
      `${baseUrl}/api/matriculas/calificaciones/${estudianteId}/ISI01`,
      {
        method: "PUT",
        headers: { authorization: autorizacion, "content-type": "application/json" },
        body: JSON.stringify({ nota })
      }
    );

    const noAprobada = await registrarNota(2.9);
    assert.equal(noAprobada.status, 204);

    const respuestaBloqueada = await fetch(`${baseUrl}/api/matriculas/avance`, {
      headers: { authorization: `Bearer ${tokenPara(estudianteId, "estudiante")}` }
    });
    const avanceBloqueado = await respuestaBloqueada.json() as Array<{ codigo: string; bloqueada: boolean }>;
    assert.equal(avanceBloqueado.find((materia) => materia.codigo === "ISI06")?.bloqueada, true);

    const aprobada = await registrarNota(3.0);
    assert.equal(aprobada.status, 204);

    const respuestaDisponible = await fetch(`${baseUrl}/api/matriculas/avance`, {
      headers: { authorization: `Bearer ${tokenPara(estudianteId, "estudiante")}` }
    });
    const avanceDisponible = await respuestaDisponible.json() as Array<{ codigo: string; aprobada: boolean; bloqueada: boolean }>;
    const calculo = avanceDisponible.find((materia) => materia.codigo === "ISI06");
    assert.equal(calculo?.aprobada, false);
    assert.equal(calculo?.bloqueada, false);
  });
});