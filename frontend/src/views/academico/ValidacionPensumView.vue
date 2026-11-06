<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { isAxiosError } from 'axios'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import {
  listarCarreras, consultarPrerrequisitos, guardarPrerrequisitos,
  type Carrera, type RevisionPensum,
} from '@/api/academico.api'

const route = useRoute()
const carreras = ref<Carrera[]>([])
const seleccion = ref('')
const revision = ref<RevisionPensum | null>(null)
const asignaturas = ref<RevisionPensum['asignaturas']>([])
const cargandoCarreras = ref(false)
const cargandoRevision = ref(false)
const guardando = ref(false)
const revisionConfirmada = ref(false)
const cambiosPendientes = ref(false)
const error = ref('')
const mensaje = ref('')
let solicitud = 0

function prerrequisitosPosteriores(asignatura: RevisionPensum['asignaturas'][number]) {
  return asignaturas.value.filter(requisito =>
    asignatura.prerrequisitos.includes(requisito.codigo) && requisito.semestre > asignatura.semestre,
  )
}

const hayPrerrequisitosPosteriores = computed(() => asignaturas.value.some(asignatura =>
  prerrequisitosPosteriores(asignatura).length > 0,
))

function opcionesPrerrequisitos(asignatura: RevisionPensum['asignaturas'][number]) {
  return asignaturas.value.filter(requisito => requisito.codigo !== asignatura.codigo
    && (requisito.semestre <= asignatura.semestre || asignatura.prerrequisitos.includes(requisito.codigo)))
}

function quitarPrerrequisitosPosteriores(asignatura: RevisionPensum['asignaturas'][number]) {
  const posteriores = new Set(prerrequisitosPosteriores(asignatura).map(requisito => requisito.codigo))
  asignatura.prerrequisitos = asignatura.prerrequisitos.filter(codigo => !posteriores.has(codigo))
  editarPrerrequisitos()
}

function mensajeDeError(fallo: unknown, alternativo: string): string {
  if (!isAxiosError(fallo)) return alternativo
  const mensajeServidor: unknown = fallo.response?.data?.mensaje
  return typeof mensajeServidor === 'string' ? mensajeServidor : alternativo
}

function establecerRevision(datos: RevisionPensum) {
  revision.value = datos
  asignaturas.value = datos.asignaturas.map(asignatura => ({
    ...asignatura, prerrequisitos: [...asignatura.prerrequisitos],
  }))
  revisionConfirmada.value = false
  cambiosPendientes.value = false
}

async function cargarRevision() {
  const actual = ++solicitud
  revision.value = null
  asignaturas.value = []
  revisionConfirmada.value = false
  cambiosPendientes.value = false
  mensaje.value = ''
  error.value = ''
  cargandoRevision.value = false
  if (!seleccion.value) return
  cargandoRevision.value = true
  try {
    const datos = await consultarPrerrequisitos(seleccion.value)
    if (actual === solicitud) establecerRevision(datos)
  } catch (fallo) {
    if (actual === solicitud) error.value = mensajeDeError(fallo, 'No fue posible cargar la revisión del pénsum.')
  } finally {
    if (actual === solicitud) cargandoRevision.value = false
  }
}

async function cargarCarreras() {
  cargandoCarreras.value = true
  error.value = ''
  try {
    carreras.value = await listarCarreras()
    const solicitada = route.query.carrera
    seleccion.value = carreras.value.find(carrera => carrera.codigo === solicitada)?.codigo
      ?? carreras.value[0]?.codigo ?? ''
    await cargarRevision()
  } catch (fallo) {
    error.value = mensajeDeError(fallo, 'No fue posible consultar las carreras.')
  } finally {
    cargandoCarreras.value = false
  }
}

function editarPrerrequisitos() {
  revisionConfirmada.value = false
  cambiosPendientes.value = true
  mensaje.value = ''
}

async function guardar(validar: boolean) {
  if (!revision.value || guardando.value || cargandoRevision.value || !asignaturas.value.length) return
  if (hayPrerrequisitosPosteriores.value) {
    error.value = 'Corrige los prerrequisitos de semestres posteriores antes de guardar.'
    return
  }
  if (validar && !revisionConfirmada.value) return
  guardando.value = true
  error.value = ''
  mensaje.value = ''
  try {
    const datos = await guardarPrerrequisitos(revision.value.codigo, {
      version: revision.value.version,
      asignaturas: asignaturas.value.map(asignatura => ({
        codigo: asignatura.codigo, prerrequisitos: [...asignatura.prerrequisitos],
      })),
      validar,
      revisionConfirmada: revisionConfirmada.value,
    })
    establecerRevision(datos)
    const carrera = carreras.value.find(carrera => carrera.codigo === datos.codigo)
    if (carrera) carrera.prerrequisitosVerificados = datos.prerrequisitosVerificados
    mensaje.value = validar
      ? 'Pénsum validado. Los estudiantes pueden matricular los grupos disponibles que cumplan los requisitos.'
      : 'Prerrequisitos guardados como pendientes. La matrícula de esta carrera queda pendiente de validación.'
  } catch (fallo) {
    error.value = mensajeDeError(fallo, 'No fue posible guardar los prerrequisitos. Revisa los datos e intenta nuevamente.')
  } finally {
    guardando.value = false
  }
}

onMounted(cargarCarreras)
</script>

<template>
  <main class="validation-page">
    <EncabezadoPagina titulo="Validación del pénsum" seccion="Administración académica"
      descripcion="Revisa las asignaturas y sus prerrequisitos oficiales antes de habilitar la matrícula de una carrera."
      volver-a="/admin/home" texto-volver="Volver al panel administrativo" />

    <label class="career-field">Carrera
      <select v-model="seleccion" :disabled="guardando || cargandoCarreras || cambiosPendientes" @change="cargarRevision">
        <option disabled value="">Selecciona una carrera</option>
        <option v-for="carrera in carreras" :key="carrera.codigo" :value="carrera.codigo">
          {{ carrera.nombre }} · {{ carrera.modalidad }} · {{ carrera.prerrequisitosVerificados ? 'Validado' : 'Pendiente' }}
        </option>
      </select>
    </label>
    <p v-if="cambiosPendientes">Guarda o descarta los cambios para cambiar de carrera.</p>
    <p v-if="cargandoCarreras || cargandoRevision" role="status">Consultando el pénsum…</p>
    <div v-if="error" class="notice error" role="alert">
      <p>{{ error }}</p>
      <button type="button" :disabled="guardando || cargandoRevision || cargandoCarreras"
        @click="carreras.length ? cargarRevision() : cargarCarreras()">Recargar datos guardados</button>
      <p v-if="revision">Recargar reemplaza la edición con los últimos datos guardados.</p>
    </div>
    <p v-if="mensaje" class="notice success" role="status">{{ mensaje }}</p>

    <section v-if="revision && !cargandoRevision" aria-labelledby="revision-heading">
      <h2 id="revision-heading">{{ revision.nombre }}</h2>
      <p class="notice" role="status">
        {{ revision.prerrequisitosVerificados ? 'Estado guardado: pénsum validado.' : 'Estado guardado: pendiente de validación.' }}
        <span v-if="cambiosPendientes"> Hay cambios por guardar.</span>
      </p>
      <p>Selecciona las materias que se deben aprobar antes de cursar cada asignatura. Una selección vacía indica que la asignatura no tiene prerrequisitos.</p>
      <p>Una asignatura puede exigir materias de su mismo semestre o de semestres anteriores. Las relaciones existentes con semestres posteriores aparecen señaladas para corregirlas.</p>
      <p>Guardar como pendiente deja la matrícula de esta carrera pendiente de validación. Guardar y validar habilita la comprobación del plan con los prerrequisitos revisados.</p>
      <p v-if="!asignaturas.length" role="status">Esta carrera todavía no tiene asignaturas para revisar.</p>

      <form v-else @submit.prevent="guardar(true)">
        <fieldset :disabled="guardando">
          <legend class="visually-hidden">Prerrequisitos del pénsum</legend>
          <div class="subjects">
            <article v-for="asignatura in asignaturas" :key="asignatura.codigo" class="subject">
              <div>
                <h3>{{ asignatura.codigo }} · {{ asignatura.nombre }}</h3>
                <p>Semestre {{ asignatura.semestre }} · {{ asignatura.creditos }} créditos</p>
                <p>{{ asignatura.prerrequisitos.length ? `${asignatura.prerrequisitos.length} prerrequisitos seleccionados` : 'Sin prerrequisitos' }}</p>
                <div v-if="prerrequisitosPosteriores(asignatura).length" class="notice error" role="alert">
                  <p>Esta asignatura tiene prerrequisitos de semestres posteriores que debes corregir.</p>
                  <ul>
                    <li v-for="requisito in prerrequisitosPosteriores(asignatura)" :key="requisito.codigo">
                      {{ requisito.codigo }} · {{ requisito.nombre }} · Semestre {{ requisito.semestre }}
                    </li>
                  </ul>
                  <button type="button" @click="quitarPrerrequisitosPosteriores(asignatura)">Quitar prerrequisitos posteriores</button>
                </div>
              </div>
              <label>Prerrequisitos de {{ asignatura.codigo }}
                <select v-model="asignatura.prerrequisitos" multiple :size="4" @change="editarPrerrequisitos">
                  <option v-for="requisito in opcionesPrerrequisitos(asignatura)"
                    :key="requisito.codigo" :value="requisito.codigo" :disabled="requisito.semestre > asignatura.semestre">
                    {{ requisito.codigo }} · {{ requisito.nombre }} · Semestre {{ requisito.semestre }}
                  </option>
                </select>
                <button v-if="asignatura.prerrequisitos.length" type="button"
                  @click="asignatura.prerrequisitos = []; editarPrerrequisitos()">Quitar prerrequisitos</button>
              </label>
            </article>
          </div>

          <label class="confirmation">
            <input v-model="revisionConfirmada" type="checkbox">
            Confirmo que revisé todas las asignaturas con la información académica oficial, incluidas las que no tienen prerrequisitos.
          </label>
          <div class="actions">
            <button type="button" :disabled="guardando || hayPrerrequisitosPosteriores" @click="guardar(false)">Guardar como pendiente</button>
            <button type="submit" :disabled="guardando || !revisionConfirmada || hayPrerrequisitosPosteriores">Guardar y validar pénsum</button>
            <button v-if="cambiosPendientes" type="button" :disabled="guardando" @click="cargarRevision">Descartar cambios</button>
          </div>
        </fieldset>
      </form>
    </section>
    <p v-if="guardando" role="status">Guardando la revisión del pénsum…</p>
    <p v-if="!cargandoCarreras && !carreras.length && !error" role="status">No hay carreras registradas.</p>
  </main>
</template>

<style scoped>
.validation-page { max-width: 1120px; margin: auto; padding: 30px 20px; color: var(--school-ink); }
.career-field, .subject label { display: grid; gap: 8px; }
.career-field { margin-bottom: 24px; }
select { width: 100%; min-width: 0; padding: 10px; color: inherit; background: var(--school-surface); border: 1px solid var(--school-border); border-radius: 6px; font: inherit; }
select[multiple] { min-height: 110px; }
h2 { margin-top: 20px; }
h3 { margin: 0; font-size: 16px; }
p { line-height: 1.6; }
.notice, .subject { padding: 16px; background: var(--school-surface); border: 1px solid var(--school-border); border-radius: 8px; }
.error { color: #8d3028; background: #fff4f2; }
.success { color: #426a50; background: #edf3e9; }
fieldset { margin: 0; padding: 0; border: 0; min-width: 0; }
.subjects { display: grid; gap: 16px; margin: 20px 0; }
.subject { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; }
.subject p { color: var(--school-muted); margin: 8px 0; }
.confirmation { display: flex; align-items: flex-start; gap: 10px; margin: 24px 0; }
.confirmation input { flex-shrink: 0; margin-top: 5px; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; }
button { min-height: 40px; padding: 9px 14px; border: 1px solid var(--school-blue); border-radius: 6px; background: var(--school-blue); color: var(--school-surface); font: inherit; cursor: pointer; }
button:disabled { cursor: not-allowed; opacity: .55; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
@media (max-width: 640px) { .subject { grid-template-columns: minmax(0, 1fr); } }
</style>
