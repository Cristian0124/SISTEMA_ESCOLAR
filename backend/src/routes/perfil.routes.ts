import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { autenticar, autorizar, type UsuarioAutenticado } from '../middlewares/auth.middleware';
import { HttpError } from '../types/http-error';
import { obtenerResumenCreditos } from '../repositorios/creditos.repository';

const router = Router();
router.use(autenticar, autorizar('estudiante'));
router.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
const texto=(max:number)=>z.string().trim().max(max);
const esquemaDatos=z.object({
  nombre:texto(150).min(1),correo:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),
  nacionalidad:texto(100).min(1),ciudad:texto(100),direccion:texto(250),telefono:texto(32),celular:texto(32),
  tipoSangre:z.enum(['','O+','O-','A+','A-','B+','B-','AB+','AB-','No conozco mi tipo de sangre']),
}).strict();
const esquemaHoja=z.object({
  descripcion:texto(700),
  foto:z.string().max(1400000).refine(v=>{
    if (!v) return true;
    const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(v);
    if (!match || match[2].length%4!==0) return false;
    const bytes=Buffer.from(match[2],'base64');
    return bytes.length<=1024*1024 && (match[1]==='png' ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : match[1]==='jpeg' ? bytes[0]===255 && bytes[1]===216 && bytes[2]===255
      : bytes.subarray(0,4).toString()==='RIFF' && bytes.subarray(8,12).toString()==='WEBP');
  },'Usa una foto PNG, JPEG o WebP de hasta 1 MB'),
  estudios:z.array(z.object({titulo:texto(150),institucion:texto(200),estado:z.enum(['','En curso','Finalizado','En pausa']),periodo:texto(100)}).strict()).max(20),
}).strict();

router.get('/datos',async(_req,res)=>{
  const id=(res.locals.usuario as UsuarioAutenticado).id;
  const r=await pool.query(`SELECT u.nombre,u.correo,u.nacionalidad,
    COALESCE(EXTRACT(YEAR FROM age(u.fecha_nacimiento))::text,'') AS edad,
    COALESCE(c.nombre,'Carrera pendiente de asignación') AS estudio,
    COALESCE(p.datos_contacto,'{}'::jsonb) AS contacto
    FROM usuarios u LEFT JOIN carreras c ON c.codigo=u.carrera_codigo
    LEFT JOIN perfiles_usuarios p ON p.usuario_id=u.id WHERE u.id=$1`,[id]);
  const {contacto,...datos}=r.rows[0];
  const {semestre}=await obtenerResumenCreditos(id);
  res.json({ciudad:'',direccion:'',telefono:'',celular:'',tipoSangre:'',...contacto,...datos,semestre:String(semestre)});
});
router.put('/datos',async(req,res)=>{
  const datos=esquemaDatos.safeParse(req.body);
  if (!datos.success) throw new HttpError(400,'DATOS_INVALIDOS','Revisa los datos personales y el correo');
  const id=(res.locals.usuario as UsuarioAutenticado).id;
  const {nombre,correo,nacionalidad,...contacto}=datos.data;
  const cliente=await pool.connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query('UPDATE usuarios SET nombre=$2,correo=$3,nacionalidad=$4 WHERE id=$1',[id,nombre,correo,nacionalidad]);
    await cliente.query(`INSERT INTO perfiles_usuarios(usuario_id,datos_contacto) VALUES($1,$2::jsonb)
      ON CONFLICT(usuario_id) DO UPDATE SET datos_contacto=EXCLUDED.datos_contacto,actualizado_en=NOW()`,[id,JSON.stringify(contacto)]);
    await cliente.query('COMMIT');
    res.json({nombre,correo,nacionalidad,...contacto});
  } catch(error) {
    await cliente.query('ROLLBACK');
    if ((error as {code?:string}).code==='23505') throw new HttpError(409,'CORREO_EXISTENTE','Ese correo ya está registrado en otra cuenta');
    throw error;
  } finally {cliente.release();}
});
router.get('/hoja-de-vida',async(_req,res)=>{
  const id=(res.locals.usuario as UsuarioAutenticado).id;
  const r=await pool.query('SELECT hoja_vida FROM perfiles_usuarios WHERE usuario_id=$1',[id]);
  res.json({descripcion:'',foto:'',estudios:[],...r.rows[0]?.hoja_vida});
});
router.put('/hoja-de-vida',async(req,res)=>{
  const datos=esquemaHoja.safeParse(req.body);
  if (!datos.success) throw new HttpError(400,'HOJA_INVALIDA','Revisa la descripción, los estudios y la foto (PNG, JPEG o WebP de hasta 1 MB)');
  const id=(res.locals.usuario as UsuarioAutenticado).id;
  await pool.query(`INSERT INTO perfiles_usuarios(usuario_id,hoja_vida) VALUES($1,$2::jsonb)
    ON CONFLICT(usuario_id) DO UPDATE SET hoja_vida=EXCLUDED.hoja_vida,actualizado_en=NOW()`,[id,JSON.stringify(datos.data)]);
  res.json(datos.data);
});
export default router;
