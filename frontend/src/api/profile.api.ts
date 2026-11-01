import api from './axios'

export interface DatosPersonales {
  nombre: string; correo: string; ciudad: string; estudio: string; semestre: string; edad: string
  direccion: string; telefono: string; celular: string; tipoSangre: string; nacionalidad: string
}
export interface HojaDeVida {
  descripcion: string; foto: string
  estudios: { titulo: string; institucion: string; estado: string; periodo: string }[]
}
export async function consultarDatos() { return (await api.get<DatosPersonales>('/perfil/datos')).data }
export async function guardarDatos(datos: DatosPersonales) {
  const {estudio:_estudio,semestre:_semestre,edad:_edad,...personales}=datos
  return (await api.put('/perfil/datos',personales)).data
}
export async function consultarHoja() { return (await api.get<HojaDeVida>('/perfil/hoja-de-vida')).data }
export async function guardarHoja(hoja: HojaDeVida) { return (await api.put<HojaDeVida>('/perfil/hoja-de-vida',hoja)).data }
