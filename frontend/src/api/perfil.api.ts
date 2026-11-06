import api from './axios'

export interface DatosPersonales {
  nombre: string; correo: string; ciudad: string; estudio: string; semestre: string; edad: string
  direccion: string; telefono: string; celular: string; tipoSangre: string; nacionalidad: string
  foto: string
}
export async function consultarDatos() { return (await api.get<DatosPersonales>('/perfil/datos')).data }
export async function guardarDatos(datos: DatosPersonales) {
  const {estudio:_estudio,semestre:_semestre,edad:_edad,...personales}=datos
  return (await api.put('/perfil/datos',personales)).data
}
