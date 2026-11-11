import { fork, type ChildProcess } from "node:child_process";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool } from "../config/database";
import { HttpError } from "../types/http-error";

const entrada = z.object({
  estudiantes: z.number().int().min(20).max(2000),
  cupos: z.number().int().min(1).max(200),
  modoExposicion: z.boolean()
}).strict().refine(d => d.cupos <= d.estudiantes);
const contador = z.number().int().nonnegative();
const progresoSchema = z.object({
  fase: z.enum(["preparando","ejecutando","verificando"]),
  estudiantes:contador, cupos:contador, enviadas:contador, recibidas:contador,
  pendientes:contador, procesando:contador, confirmadas:contador, rechazadas:contador,
  reservas:contador, matriculas:contador, transcurridoMs:contador
});
const resultadoSchema = z.object({
  estudiantes:contador, cupos:contador, conexionesMaximas:contador,
  matriculas:contador, duplicadas:contador, idempotente:z.boolean(), correcto:z.boolean(),
  totalMs:contador, envioMs:contador, solicitudesPorSegundo:z.number(),
  pausaDemostracionMs:contador,
  latenciaHttpMs:z.object({p50:contador,p95:contador,p99:contador}),
  motivosRechazo:z.array(z.object({codigo_error:z.string().nullable(),cantidad:contador})),
  errores:z.record(z.number()), erroresTransporte:z.record(z.number())
});
type Progreso = z.infer<typeof progresoSchema>;
type Resultado = z.infer<typeof resultadoSchema>;
interface EstadoSimulacion {
  id:string | null;
  estado:"sin_iniciar" | "preparando" | "ejecutando" | "verificando" | "completada" | "fallida";
  estudiantes:number;
  cupos:number;
  modoExposicion:boolean;
  progreso:Progreso | null;
  resultado:Resultado | null;
  mensaje:string;
}
let estado: EstadoSimulacion = {
  id:null,estado:"sin_iniciar",estudiantes:0,cupos:0,modoExposicion:true,
  progreso:null,resultado:null,mensaje:"Configura la prueba y pulsa Iniciar demostración."
};
let proceso: ChildProcess | null = null;
let iniciando = false;
export function consultarSimulacion() { return estado; }

export async function iniciarSimulacion(datos:unknown) {
  const validacion=entrada.safeParse(datos);
  if (!validacion.success) throw new HttpError(400,"SIMULACION_INVALIDA","Usa entre 20 y 2000 estudiantes y hasta 200 cupos.");
  if (iniciando || proceso) throw new HttpError(409,"SIMULACION_ACTIVA","Ya hay una demostración en ejecución.");
  iniciando=true;
  const cliente=await pool.connect().catch(error => { iniciando=false; throw error; });
  let bloqueado=false;
  try {
    // Espacio propio para el simulador, separado de los bloqueos por estudiante.
    bloqueado=(await cliente.query<{libre:boolean}>(
      "SELECT pg_try_advisory_lock(20261112,1) AS libre"
    )).rows[0].libre;
    if (!bloqueado) throw new HttpError(409,"SIMULACION_ACTIVA","Hay otra demostración en ejecución en este servidor de base de datos.");
    const {estudiantes,cupos,modoExposicion}=validacion.data;
    estado={
      id:randomUUID(),estado:"preparando",estudiantes,cupos,modoExposicion,
      progreso:null,resultado:null,mensaje:"Preparando estudiantes y curso de prueba."
    };
    const script=path.resolve(__dirname,"../../../pruebas-carga/apertura-masiva.js");
    const hijo=fork(script,[],{
      cwd:path.resolve(__dirname,"../.."),
      execArgv:[],
      env:{...process.env,CARGA_ESTUDIANTES:String(estudiantes),CARGA_CUPOS:String(cupos),
        CARGA_CONEXIONES:"128",CARGA_PAUSA_MS:modoExposicion ? "40":"0"},
      stdio:["ignore","ignore","ignore","ipc"],
      windowsHide:true
    });
    proceso=hijo;
    let esquema:string | null=null;
    let cerrado=false;
    const limite=setTimeout(()=>{
      estado.mensaje="La prueba superó el tiempo máximo.";
      estado.estado="fallida";
      hijo.kill();
    },300000);
    limite.unref();
    hijo.on("message",(mensaje:unknown)=>{
      if (cerrado || !mensaje || typeof mensaje!=="object" || !("tipo" in mensaje)) return;
      const contenido=mensaje as {tipo:unknown;schema?:unknown;datos?:unknown;resultado?:unknown};
      if (contenido.tipo==="esquema" && typeof contenido.schema==="string" && /^carga_[a-f0-9]{32}$/.test(contenido.schema)) {
        esquema=contenido.schema;
      }
      if (contenido.tipo==="progreso") {
        const progreso=progresoSchema.safeParse(contenido.datos);
        if (progreso.success && estado.estado!=="fallida") {
          estado.progreso=progreso.data;
          estado.estado=progreso.data.fase;
          estado.mensaje="Observando solicitudes y cupos reales de la prueba.";
        }
      }
      if (contenido.tipo==="resultado") {
        const resultado=resultadoSchema.safeParse(contenido.resultado);
        if (resultado.success) {
          estado.resultado=resultado.data;
          estado.estado="verificando";
          estado.mensaje="Comprobando resultados y retirando los datos temporales.";
        }
      }
    });
    async function terminar(codigo:number | null) {
      if (cerrado) return;
      cerrado=true;
      clearTimeout(limite);
      let limpia=true;
      try {
        // El nombre proviene del hijo y se valida antes de usarlo como identificador.
        if (esquema && /^carga_[a-f0-9]{32}$/.test(esquema)) {
          await cliente.query(`DROP SCHEMA IF EXISTS "${esquema}" CASCADE`);
        }
      } catch { limpia=false; }
      finally {
        try { await cliente.query("SELECT pg_advisory_unlock(20261112,1)"); }
        catch { limpia=false; }
        finally { cliente.release(); proceso=null; }
      }
      if (codigo===0 && estado.resultado?.correcto && limpia) {
        estado.estado="completada";
        estado.mensaje="Prueba terminada y datos temporales retirados.";
      } else {
        estado.estado="fallida";
        estado.mensaje=limpia ? "La prueba no terminó correctamente. Revisa el resultado disponible o vuelve a intentarlo."
          : "La prueba terminó, pero no se pudo comprobar la limpieza del esquema temporal.";
      }
    }
    hijo.once("error",()=>{ void terminar(null); });
    hijo.once("exit",codigo=>{ void terminar(codigo); });
    return estado;
  } catch (error) {
    if (bloqueado) await cliente.query("SELECT pg_advisory_unlock(20261112,1)");
    cliente.release();
    throw error;
  } finally { iniciando=false; }
}
