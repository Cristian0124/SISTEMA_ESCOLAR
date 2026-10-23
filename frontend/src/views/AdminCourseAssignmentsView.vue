<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import axios from 'axios'
import { asignarProfesor, listarCursos, listarProfesores, type Curso, type ProfesorDisponible } from '@/api/courses.api'

const cursos = ref<Curso[]>([])
const profesores = ref<ProfesorDisponible[]>([])
const seleccionados = reactive<Record<number, number | ''>>({})
const cargando = ref(true)
const error = ref('')
const mensaje = ref('')
const guardandoCursoId = ref<number | null>(null)

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = ''
  try {
    const [listaCursos, listaProfesores] = await Promise.all([listarCursos(), listarProfesores()])
    cursos.value = listaCursos
    profesores.value = listaProfesores
    for (const curso of listaCursos) {
      seleccionados[curso.id] = curso.docenteId ?? ''
    }
  } catch (fallo) {
    error.value = axios.isAxiosError(fallo)
      ? fallo.response?.data?.mensaje ?? 'No fue posible cargar cursos y profesores.'
      : 'No fue posible cargar cursos y profesores.'
  } finally {
    cargando.value = false
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
    error.value = axios.isAxiosError(fallo)
      ? fallo.response?.data?.mensaje ?? `No fue posible asignar el curso ${curso.codigo}.`
      : `No fue posible asignar el curso ${curso.codigo}.`
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
      <h1>Asignar profesores a cursos</h1>
      <p>Selecciona un profesor activo para cada curso. La asignación habilita el curso en su espacio docente.</p>
    </header>

    <p v-if="cargando" class="notice" role="status">Cargando cursos y profesores…</p>
    <section v-else-if="error" class="notice notice-error" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="cargar">Intentar de nuevo</button>
    </section>
    <section v-else-if="!profesores.length" class="notice" role="status">
      <strong>No hay profesores activos registrados.</strong>
      <p>Registra primero un usuario con rol profesor desde el panel administrativo.</p>
      <RouterLink to="/admin/usuarios/nuevo">Registrar usuario</RouterLink>
    </section>
    <template v-else>
      <p v-if="mensaje" class="notice notice-success" role="status">{{ mensaje }}</p>
      <p v-if="error" class="notice notice-error" role="alert">{{ error }}</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Curso</th><th>Horario</th><th>Profesor asignado</th><th>Acción</th></tr></thead>
          <tbody>
            <tr v-for="curso in cursos" :key="curso.id">
              <td><strong>{{ curso.codigo }} · {{ curso.nombre }}</strong><small>{{ curso.semestre }}° semestre</small></td>
              <td>{{ curso.horario }}</td>
              <td>
                <select v-model.number="seleccionados[curso.id]" :aria-label="`Profesor para ${curso.codigo}`">
                  <option value="">Selecciona un profesor</option>
                  <option v-for="profesor in profesores" :key="profesor.id" :value="profesor.id">
                    {{ profesor.nombre }} · {{ profesor.correo }}
                  </option>
                </select>
              </td>
              <td><button type="button" :disabled="typeof seleccionados[curso.id] !== 'number' || guardandoCursoId !== null" @click="guardar(curso)">
                {{ guardandoCursoId === curso.id ? 'Guardando…' : 'Guardar' }}
              </button></td>
            </tr>
          </tbody>
        </table>
        <p v-if="!cursos.length" class="empty">No hay cursos disponibles para asignar.</p>
      </div>
    </template>
  </main>
</template>

<style scoped>
.assignment-page { max-width: 1120px; margin: 0 auto; padding: 30px clamp(16px, 4vw, 42px); color: #243a3c; }
.back-link { color: #176d85; font-size: 13px; text-decoration: none; }
.page-heading { margin: 22px 0; }
.eyebrow { margin: 0 0 7px; color: #1685a2; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
h1 { margin: 0; font-size: clamp(24px, 4vw, 32px); }
.page-heading > p:last-child { color: #718083; font-size: 14px; line-height: 1.5; }
.table-wrap, .notice { overflow-x: auto; border: 1px solid #dce3e3; border-radius: 7px; background: #fff; }
table { width: 100%; border-collapse: collapse; text-align: left; }
th, td { padding: 13px 15px; border-bottom: 1px solid #e8eeee; font-size: 12px; }
th { color: #617477; background: #f5f8f8; font-size: 10px; text-transform: uppercase; }
td:first-child { min-width: 220px; } td:first-child small { display: block; margin-top: 4px; color: #879496; }
select { width: 100%; min-width: 220px; min-height: 38px; padding: 7px 9px; border: 1px solid #cbd7d8; border-radius: 4px; background: #fff; color: #243a3c; font: inherit; font-size: 12px; }
button { min-height: 36px; padding: 0 13px; border: 0; border-radius: 4px; color: white; background: #176d85; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; }
button:disabled { cursor: not-allowed; opacity: .55; }
.notice { margin: 16px 0; padding: 16px; font-size: 13px; }
.notice-error { color: #8d3028; background: #fff4f2; }.notice-success { color: #246c4a; background: #eaf5ee; }
.notice p { margin: 6px 0; }.notice a { color: #176d85; }
.empty { padding: 20px; color: #718083; text-align: center; }
@media (max-width: 640px) { th, td { padding: 10px; } }
</style>
