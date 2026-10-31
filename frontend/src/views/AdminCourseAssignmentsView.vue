<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import axios from 'axios'
import { consultarPensum, listarCarreras, listarFacultades, type Asignatura, type Carrera, type Facultad } from '@/api/academico.api'
import { asignarProfesor, crearCurso, listarCursos, listarProfesores, type Curso, type ProfesorDisponible } from '@/api/courses.api'

const cursos = ref<Curso[]>([])
const profesores = ref<ProfesorDisponible[]>([])
const facultades = ref<Facultad[]>([])
const carreras = ref<Carrera[]>([])
const asignaturas = ref<Asignatura[]>([])
const seleccionados = reactive<Record<number, number | ''>>({})
const formulario = reactive({ facultadCodigo: '', carreraCodigo: '', codigoPensum: '', profesorId: 0, cuposTotales: 30 })
const sesiones = ref([{ dia: 1, horaInicio: '', horaFin: '' }])
const dias = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
const cargando = ref(true)
const cargandoPensum = ref(false)
const creando = ref(false)
const error = ref('')
const mensaje = ref('')
const guardandoCursoId = ref<number | null>(null)

const carrerasDisponibles = computed(() => carreras.value.filter((carrera) => carrera.facultadCodigo === formulario.facultadCodigo))

function mensajeDeError(fallo: unknown, alternativo: string): string {
  return axios.isAxiosError(fallo) ? fallo.response?.data?.mensaje ?? alternativo : alternativo
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = ''
  try {
    const [listaCursos, listaProfesores, listaFacultades, listaCarreras] = await Promise.all([
      listarCursos(), listarProfesores(), listarFacultades(), listarCarreras()
    ])
    cursos.value = listaCursos
    profesores.value = listaProfesores
    facultades.value = listaFacultades
    carreras.value = listaCarreras
    for (const curso of listaCursos) seleccionados[curso.id] = curso.docenteId ?? ''
  } catch (fallo) {
    error.value = mensajeDeError(fallo, 'No fue posible cargar la oferta académica y los profesores.')
  } finally {
    cargando.value = false
  }
}

async function cambiarCarrera(): Promise<void> {
  formulario.codigoPensum = ''
  asignaturas.value = []
  if (!formulario.carreraCodigo) return
  cargandoPensum.value = true
  error.value = ''
  try {
    asignaturas.value = await consultarPensum(formulario.carreraCodigo)
  } catch (fallo) {
    error.value = mensajeDeError(fallo, 'No fue posible cargar el pensum de esta carrera.')
  } finally {
    cargandoPensum.value = false
  }
}

function cambiarFacultad(): void {
  formulario.carreraCodigo = ''
  formulario.codigoPensum = ''
  asignaturas.value = []
}

async function crear(): Promise<void> {
  error.value = ''
  mensaje.value = ''
  creando.value = true
  try {
    const curso = await crearCurso({
      codigoPensum: formulario.codigoPensum,
      profesorId: formulario.profesorId,
      sesiones: sesiones.value,
      cuposTotales: formulario.cuposTotales
    })
    cursos.value.unshift(curso)
    seleccionados[curso.id] = curso.docenteId ?? ''
    mensaje.value = `Se creó el grupo ${curso.codigo} para ${curso.carreraNombre}, asignado a ${curso.docente}.`
    sesiones.value = [{ dia: 1, horaInicio: '', horaFin: '' }]
  } catch (fallo) {
    error.value = mensajeDeError(fallo, 'No fue posible crear el grupo y asignarlo al profesor.')
  } finally {
    creando.value = false
  }
}

async function guardar(curso: Curso): Promise<void> {
  const profesorId = seleccionados[curso.id]
  if (typeof profesorId !== 'number') return

  guardandoCursoId.value = curso.id
  error.value = ''
  mensaje.value = ''
  try {
    await asignarProfesor(curso.id, profesorId)
    const profesor = profesores.value.find((item) => item.id === profesorId)
    if (profesor) {
      curso.docente = profesor.nombre
      curso.docenteId = profesor.id
    }
    mensaje.value = `Se asignó ${profesor?.nombre ?? 'el profesor'} a ${curso.codigo}.`
  } catch (fallo) {
    error.value = mensajeDeError(fallo, `No fue posible asignar el curso ${curso.codigo}.`)
  } finally {
    guardandoCursoId.value = null
  }
}

onMounted(() => void cargar())
</script>

<template>
  <main class="assignment-page">
    <RouterLink class="back-link" to="/admin/home">← Volver al panel administrativo</RouterLink>
    <header class="page-heading">
      <p class="eyebrow">Administración académica</p>
      <h1>Oferta y asignación de cursos</h1>
      <p>Elige una facultad, una carrera y una asignatura del pensum. Crea el grupo con horario y cupos, y asígnalo a un profesor activo.</p>
    </header>

    <p v-if="cargando" class="notice" role="status">Cargando facultades, pensums y profesores…</p>
    <section v-else-if="error && !facultades.length" class="notice notice-error" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="cargar">Intentar de nuevo</button>
    </section>
    <template v-else>
      <p v-if="mensaje" class="notice notice-success" role="status">{{ mensaje }}</p>
      <p v-if="error" class="notice notice-error" role="alert">{{ error }}</p>

      <section class="create-panel" aria-labelledby="create-course-heading">
        <div class="section-heading">
          <p class="eyebrow">Nueva oferta</p>
          <h2 id="create-course-heading">Crear grupo y asignar profesor</h2>
          <p>La asignatura queda vinculada a su carrera y facultad según el pensum seleccionado.</p>
        </div>

        <form class="course-form" @submit.prevent="crear">
          <label>Facultad
            <select v-model="formulario.facultadCodigo" required @change="cambiarFacultad">
              <option value="">Selecciona una facultad</option>
              <option v-for="facultad in facultades" :key="facultad.codigo" :value="facultad.codigo">{{ facultad.nombre }}</option>
            </select>
          </label>
          <label>Carrera
            <select v-model="formulario.carreraCodigo" required :disabled="!formulario.facultadCodigo" @change="cambiarCarrera">
              <option value="">Selecciona una carrera</option>
              <option v-for="carrera in carrerasDisponibles" :key="carrera.codigo" :value="carrera.codigo">{{ carrera.nombre }}</option>
            </select>
          </label>
          <label>Asignatura del pensum
            <select v-model="formulario.codigoPensum" required :disabled="!formulario.carreraCodigo || cargandoPensum">
              <option value="">{{ cargandoPensum ? 'Cargando pensum…' : 'Selecciona una asignatura' }}</option>
              <option v-for="asignatura in asignaturas" :key="asignatura.codigo" :value="asignatura.codigo">
                {{ asignatura.semestre }}° · {{ asignatura.nombre }} · {{ asignatura.creditos }} créditos
              </option>
            </select>
          </label>
          <label>Profesor activo
            <select v-model.number="formulario.profesorId" required :disabled="!profesores.length">
              <option :value="0" disabled>Selecciona un profesor</option>
              <option v-for="profesor in profesores" :key="profesor.id" :value="profesor.id">{{ profesor.nombre }} · {{ profesor.correo }}</option>
            </select>
          </label>
          <fieldset class="sessions">
            <legend>Sesiones semanales</legend>
            <div v-for="(sesion, indice) in sesiones" :key="indice" class="session-fields">
              <label>Día<select v-model.number="sesion.dia" required><option v-for="(dia,i) in dias" :key="dia" :value="i+1">{{ dia }}</option></select></label>
              <label>Hora inicial<input v-model="sesion.horaInicio" type="time" required></label>
              <label>Hora final<input v-model="sesion.horaFin" type="time" :min="sesion.horaInicio" required></label>
              <button v-if="sesiones.length > 1" type="button" :aria-label="`Quitar sesión ${indice+1}`" @click="sesiones.splice(indice,1)">Quitar</button>
            </div>
            <button type="button" :disabled="sesiones.length >= 21" @click="sesiones.push({dia:1,horaInicio:'',horaFin:''})">Agregar sesión</button>
          </fieldset>
          <label>Cupos
            <input v-model.number="formulario.cuposTotales" type="number" min="1" max="5000" required>
          </label>
          <button class="create-button" type="submit" :disabled="creando || !profesores.length || !asignaturas.length">
            {{ creando ? 'Creando grupo…' : 'Crear y asignar' }}
          </button>
          <p v-if="!profesores.length" class="form-note">Registra primero un profesor activo.</p>
          <p v-else-if="formulario.carreraCodigo && !asignaturas.length && !cargandoPensum" class="form-note">Esta carrera no tiene asignaturas disponibles en su pensum.</p>
        </form>
      </section>

      <section class="offering-section">
        <div class="section-heading">
          <p class="eyebrow">Grupos existentes</p>
          <h2>Administrar asignaciones</h2>
          <p>También puedes cambiar el profesor de cualquier grupo ya creado.</p>
        </div>
        <div v-if="!profesores.length" class="notice">
          <strong>No hay profesores activos registrados.</strong>
          <p>Registra un usuario con rol profesor desde el panel administrativo.</p>
          <RouterLink to="/admin/usuarios/nuevo">Registrar usuario</RouterLink>
        </div>
        <div v-else class="table-wrap">
          <table>
            <thead><tr><th>Facultad y carrera</th><th>Curso</th><th>Horario y cupos</th><th>Profesor asignado</th><th>Acción</th></tr></thead>
            <tbody>
              <tr v-for="curso in cursos" :key="curso.id">
                <td>
                  <strong>{{ curso.facultadNombre ?? 'Catálogo legado' }}</strong>
                  <small>{{ curso.carreraNombre ?? 'Sin carrera asociada' }}</small>
                </td>
                <td><strong>{{ curso.codigo }} · {{ curso.nombre }}</strong><small>{{ curso.codigoPensum }} · {{ curso.semestre }}° semestre · {{ curso.creditos }} créditos</small></td>
                <td>{{ curso.horario }}<small>{{ curso.cuposDisponibles }} de {{ curso.cuposTotales }} cupos disponibles</small></td>
                <td>
                  <select v-model.number="seleccionados[curso.id]" :aria-label="`Profesor para ${curso.codigo}`">
                    <option value="">Selecciona un profesor</option>
                    <option v-for="profesor in profesores" :key="profesor.id" :value="profesor.id">{{ profesor.nombre }} · {{ profesor.correo }}</option>
                  </select>
                </td>
                <td><button type="button" :disabled="typeof seleccionados[curso.id] !== 'number' || guardandoCursoId !== null" @click="guardar(curso)">
                  {{ guardandoCursoId === curso.id ? 'Guardando…' : 'Guardar' }}
                </button></td>
              </tr>
            </tbody>
          </table>
          <p v-if="!cursos.length" class="empty">Todavía no hay grupos creados. Usa el formulario para ofrecer la primera asignatura.</p>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.assignment-page { max-width: 1240px; margin: 0 auto; padding: 30px clamp(16px, 4vw, 42px); color: #243a3c; }
.back-link { color: #176d85; font-size: 13px; text-decoration: none; }
.page-heading { margin: 22px 0; }
.eyebrow { margin: 0 0 7px; color: #1685a2; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
h1 { margin: 0; font-size: clamp(24px, 4vw, 32px); }
.page-heading > p:last-child, .section-heading > p:last-child { color: #718083; font-size: 14px; line-height: 1.5; }
.create-panel, .table-wrap, .notice { border: 1px solid #dce3e3; border-radius: 7px; background: #fff; }
.create-panel { margin: 22px 0; padding: 20px; }
.section-heading { margin-bottom: 16px; }
.section-heading h2 { margin: 0; font-size: 19px; }
.section-heading > p:last-child { margin-bottom: 0; font-size: 13px; }
.course-form { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: end; }
.course-form label { display: grid; gap: 6px; color: #506467; font-size: 12px; font-weight: 700; }
.sessions { grid-column: 1 / -1; margin: 0; padding: 14px; border: 1px solid #cbd7d8; }
.session-fields { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; margin-bottom: 12px; }
.session-fields label { flex: 1 1 120px; }
select, input { width: 100%; min-height: 39px; padding: 8px 10px; border: 1px solid #cbd7d8; border-radius: 4px; background: #fff; color: #243a3c; font: inherit; font-size: 12px; }
select:disabled { background: #f3f6f6; color: #879496; }
button { min-height: 36px; padding: 0 13px; border: 0; border-radius: 4px; color: white; background: #176d85; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; }
button:disabled { cursor: not-allowed; opacity: .55; }
.create-button { min-height: 39px; }
.form-note { grid-column: 1 / -1; margin: -5px 0 0; color: #718083; font-size: 12px; }
.offering-section { margin-top: 30px; }
.table-wrap { overflow-x: auto; }
table { width: 100%; min-width: 900px; border-collapse: collapse; text-align: left; }
th, td { padding: 13px 15px; border-bottom: 1px solid #e8eeee; font-size: 12px; }
th { color: #617477; background: #f5f8f8; font-size: 10px; text-transform: uppercase; }
td strong, td small { display: block; }
td small { margin-top: 4px; color: #879496; }
td select { min-width: 210px; }
.notice { margin: 16px 0; padding: 16px; font-size: 13px; }
.notice-error { color: #8d3028; background: #fff4f2; }.notice-success { color: #246c4a; background: #eaf5ee; }
.notice p { margin: 6px 0; }.notice a { color: #176d85; }
.empty { padding: 20px; color: #718083; text-align: center; }
@media (max-width: 850px) { .course-form { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 540px) { .course-form { grid-template-columns: 1fr; } .form-note { grid-column: auto; } }
</style>
