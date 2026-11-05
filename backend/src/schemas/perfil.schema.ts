import { z } from 'zod';

const texto = (max: number) => z.string().trim().max(max);

export const esquemaDatos = z.object({
  nombre: texto(150).min(1),
  correo: z.string().trim().email().max(254).transform(valor => valor.toLowerCase()),
  nacionalidad: texto(100).min(1),
  ciudad: texto(100), direccion: texto(250), telefono: texto(32), celular: texto(32),
  tipoSangre: z.enum(['', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'No conozco mi tipo de sangre']),
}).strict();

export const esquemaHoja = z.object({
  descripcion: texto(700),
  foto: z.string().max(1400000).refine(valor => {
    if (!valor) return true;
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(valor);
    if (!match || match[2].length % 4 !== 0) return false;
    const bytes = Buffer.from(match[2], 'base64');
    if (bytes.length > 1024 * 1024) return false;
    if (match[1] === 'png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (match[1] === 'jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  }, 'Usa una foto PNG, JPEG o WebP de hasta 1 MB'),
  estudios: z.array(z.object({
    titulo: texto(150), institucion: texto(200),
    estado: z.enum(['', 'En curso', 'Finalizado', 'En pausa']), periodo: texto(100),
  }).strict()).max(20),
}).strict();

export type DatosPersonales = z.infer<typeof esquemaDatos>;
export type HojaDeVida = z.infer<typeof esquemaHoja>;
