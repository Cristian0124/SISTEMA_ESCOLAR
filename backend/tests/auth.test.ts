import { crearBaseAislada } from './database.fixture';
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import app from "../src/app";
import { JWT_ACCESS_SECRET } from "../src/config/env";
import { pool } from "../src/config/database";
import { crearAdministrador, crearUsuarioAdministrado } from "../src/repositorios/auth.repository";

const sufijo = randomUUID().replaceAll("-", "");
const correo = `registro.${sufijo}@example.test`;
const cedula = `T${sufijo.slice(0, 31)}`;
const correoAdmin = `admin.${sufijo}@example.test`;
const cedulaAdmin = `A${sufijo.slice(0, 31)}`;
const correoProfesor = `profesor.${sufijo}@example.test`;
const cedulaProfesor = `P${sufijo.slice(0, 31)}`;
const correoProfesorSinAsignacion = `profesor.sin.asignacion.${sufijo}@example.test`;
const cedulaProfesorSinAsignacion = `N${sufijo.slice(0, 31)}`;
const password = "PruebaSegura123!";
const datosRegistro = {
  nombre: "Usuario de prueba",
  correo,
  password,
  cedula,
  fechaNacimiento: "2005-01-10",
  fechaIngreso: new Date().toISOString().slice(0, 10),
  nacionalidad: "Prueba",
  genero: "Prefiero no indicar",
  carreraCodigo: "SIS"
};

let servidor: Server;
let baseUrl: string;
let estudianteId: number;
let administradorId: number;
let profesorId: number;
let profesorSinAsignacionId: number;

function tokenPara(id: number, rol: "admin" | "estudiante" | "profesor") {
  return jwt.sign({ id, nombre: "Usuario de prueba", rol }, JWT_ACCESS_SECRET);
}

let limpiarBase: (() => Promise<void>) | undefined;
before(async () => {
  limpiarBase = await crearBaseAislada();
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

  const profesor = await crearUsuarioAdministrado({
    nombre: "Laura Gómez",
    correo: correoProfesor,
    cedula: cedulaProfesor,
    fechaNacimiento: "1985-01-01",
    fechaIngreso: new Date().toISOString().slice(0, 10),
    nacionalidad: "Prueba",
    genero: "Prefiero no indicar"
  }, await bcrypt.hash("ProfesorPrueba123!", 4), "profesor");
  assert.ok(profesor);
  profesorId = profesor.id;
  await pool.query('UPDATE cursos SET docente_id = $1 WHERE id = 2', [profesorId]);

  const profesorSinAsignacion = await crearUsuarioAdministrado({
    nombre: "Profesor sin cursos",
    correo: correoProfesorSinAsignacion,
    cedula: cedulaProfesorSinAsignacion,
    fechaNacimiento: "1985-01-01",
    fechaIngreso: new Date().toISOString().slice(0, 10),
    nacionalidad: "Prueba",
    genero: "Prefiero no indicar"
  }, await bcrypt.hash("ProfesorPrueba456!", 4), "profesor");
  assert.ok(profesorSinAsignacion);
  profesorSinAsignacionId = profesorSinAsignacion.id;

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
    if (limpiarBase) await limpiarBase();
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
    // Las pruebas siguientes verifican la compatibilidad con estudiantes del plan anterior.
    await pool.query("UPDATE usuarios SET carrera_codigo = NULL WHERE id = $1", [estudianteId]);

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

  await contexto.test("el profesor asignado solo ve sus matriculados y puede calificarlos", async () => {
    const tokenProfesor = `Bearer ${tokenPara(profesorId, "profesor")}`;
    const matricula = await fetch(`${baseUrl}/api/matriculas`, {
      method: "POST",
      headers: { authorization: `Bearer ${tokenPara(estudianteId, "estudiante")}`, "content-type": "application/json" },
      body: JSON.stringify({ cursoId: 2 })
    });
    assert.equal(matricula.status, 201);

    const cursosRespuesta = await fetch(`${baseUrl}/api/matriculas/docente/cursos`, {
      headers: { authorization: tokenProfesor }
    });
    const cursosAsignados = await cursosRespuesta.json() as Array<{ id: number; codigoPensum: string }>;
    assert.equal(cursosRespuesta.status, 200);
    assert.deepEqual(cursosAsignados.map((curso) => curso.id), [2]);

    const listaRespuesta = await fetch(`${baseUrl}/api/matriculas/docente/cursos/2/estudiantes`, {
      headers: { authorization: tokenProfesor }
    });
    const estudiantes = await listaRespuesta.json() as Array<{ id: number; nombre: string; cedula: string; nota: number | null }>;
    assert.equal(listaRespuesta.status, 200);
    assert.equal(estudiantes.length, 1);
    assert.equal(estudiantes[0].id, estudianteId);
    assert.equal(estudiantes[0].nota, null);

    const noAsignado = await fetch(`${baseUrl}/api/matriculas/docente/cursos/2/estudiantes`, {
      headers: { authorization: `Bearer ${tokenPara(profesorSinAsignacionId, "profesor")}` }
    });
    assert.equal(noAsignado.status, 403);

    const calificacion = await fetch(`${baseUrl}/api/matriculas/calificaciones/${estudianteId}/ISI05`, {
      method: "PUT",
      headers: { authorization: tokenProfesor, "content-type": "application/json" },
      body: JSON.stringify({ corte1: 4.1, corte2: 4.1, corte3: 4.1 })
    });
    assert.equal(calificacion.status, 200);

    const resultado = await pool.query<{ registrada_por: number }>(
      "SELECT registrada_por FROM calificaciones WHERE usuario_id = $1 AND codigo_materia = 'ISI05'",
      [estudianteId]
    );
    assert.equal(resultado.rows[0].registrada_por, profesorId);
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
        body: JSON.stringify({ corte1: nota, corte2: nota, corte3: nota })
      }
    );

    const noAprobada = await registrarNota(2.9);
    assert.equal(noAprobada.status, 200);

    const respuestaBloqueada = await fetch(`${baseUrl}/api/matriculas/avance`, {
      headers: { authorization: `Bearer ${tokenPara(estudianteId, "estudiante")}` }
    });
    const avanceBloqueado = await respuestaBloqueada.json() as Array<{ codigo: string; bloqueada: boolean }>;
    assert.equal(avanceBloqueado.find((materia) => materia.codigo === "ISI06")?.bloqueada, true);

    const aprobada = await registrarNota(3.0);
    assert.equal(aprobada.status, 200);

    const respuestaDisponible = await fetch(`${baseUrl}/api/matriculas/avance`, {
      headers: { authorization: `Bearer ${tokenPara(estudianteId, "estudiante")}` }
    });
    const avanceDisponible = await respuestaDisponible.json() as Array<{ codigo: string; aprobada: boolean; bloqueada: boolean }>;
    const calculo = avanceDisponible.find((materia) => materia.codigo === "ISI06");
    assert.equal(calculo?.aprobada, false);
    assert.equal(calculo?.bloqueada, false);
  });

});
