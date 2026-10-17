<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { loadDraft, profileStorageKey, saveDraft } from '@/services/profileStorage'

interface Estudio {
  titulo: string
  institucion: string
  estado: string
  periodo: string
}

interface HojaDeVida {
  descripcion: string
  foto: string
  estudios: Estudio[]
}

const auth = useAuthStore()
const hoja = reactive<HojaDeVida>({ descripcion: '', foto: '', estudios: [] })
const guardado = ref(false)
const error = ref('')
const storageKey = () => profileStorageKey('hoja-de-vida', auth.usuario?.id ?? 'local')
const maxPhotoBytes = 1024 * 1024

onMounted(() => {
  try {
    Object.assign(hoja, loadDraft(storageKey(), { ...hoja }))
  } catch {
    error.value = 'No se pudo leer la hoja de vida guardada. Puedes corregirla y guardarla nuevamente.'
  }
})

function agregarEstudio(): void {
  hoja.estudios.push({ titulo: '', institucion: '', estado: '', periodo: '' })
}

function quitarEstudio(indice: number): void {
  hoja.estudios.splice(indice, 1)
}

function seleccionarFoto(evento: Event): void {
  const input = evento.target
  if (!(input instanceof HTMLInputElement)) return
  const archivo = input.files?.[0]
  if (!archivo) return

  guardado.value = false
  error.value = ''
  if (!archivo.type.startsWith('image/')) {
    error.value = 'Selecciona un archivo de imagen.'
    input.value = ''
    return
  }
  if (archivo.size > maxPhotoBytes) {
    error.value = 'La foto debe pesar menos de 1 MB.'
    input.value = ''
    return
  }

  const lector = new FileReader()
  lector.addEventListener('load', () => {
    if (typeof lector.result === 'string') hoja.foto = lector.result
  })
  lector.addEventListener('error', () => {
    error.value = 'No se pudo leer la foto seleccionada.'
  })
  lector.readAsDataURL(archivo)
}

function guardar(): void {
  error.value = ''
  guardado.value = false
  try {
    saveDraft(storageKey(), hoja)
    guardado.value = true
  } catch {
    error.value = 'No se pudo guardar la hoja de vida en este dispositivo. Prueba con una foto más pequeña.'
  }
}
</script>

<template>
  <main class="resume-page">
    <RouterLink class="back-link" to="/inicio">← Volver al inicio</RouterLink>
    <header class="page-heading">
      <p class="eyebrow">Mi perfil</p>
      <h1>Hoja de vida</h1>
      <p>Presenta tu perfil y tu trayectoria académica.</p>
    </header>

    <form class="resume-form" @submit.prevent="guardar">
      <section class="intro-section">
        <div>
          <h2>Sobre mí</h2>
          <p>Escribe una breve descripción sobre ti, tus intereses y tus objetivos.</p>
        </div>
        <div class="photo-field">
          <div class="photo-preview" :class="{ 'has-photo': hoja.foto }">
            <img v-if="hoja.foto" :src="hoja.foto" alt="Foto de perfil seleccionada" />
            <span v-else aria-hidden="true">+</span>
          </div>
          <label class="photo-button">Subir foto
            <input class="file-input" type="file" accept="image/*" @change="seleccionarFoto" />
          </label>
          <button v-if="hoja.foto" class="remove-photo" type="button" @click="hoja.foto = ''; guardado = false">Quitar foto</button>
          <small>Imagen de hasta 1 MB, guardada en este navegador.</small>
        </div>
      </section>

      <label class="description-field">Descripción breve
        <textarea v-model.trim="hoja.descripcion" rows="5" maxlength="700" placeholder="Cuéntanos quién eres, qué te interesa y cuáles son tus metas." />
        <small>{{ hoja.descripcion.length }}/700 caracteres</small>
      </label>

      <section class="studies-section">
        <div class="section-heading">
          <div>
            <h2>Estudios y formación</h2>
            <p>Agrega tu formación académica y su estado actual.</p>
          </div>
          <button class="secondary-button" type="button" @click="agregarEstudio">+ Agregar estudio</button>
        </div>

        <div v-if="hoja.estudios.length" class="study-list">
          <fieldset v-for="(estudio, indice) in hoja.estudios" :key="indice" class="study-card">
            <legend>Estudio {{ indice + 1 }}</legend>
            <button class="remove-study" type="button" :aria-label="`Quitar estudio ${indice + 1}`" @click="quitarEstudio(indice)">Quitar</button>
            <div class="fields">
              <label>Título o programa<input v-model.trim="estudio.titulo" placeholder="Ej. Ingeniería de Sistemas" /></label>
              <label>Institución<input v-model.trim="estudio.institucion" placeholder="Nombre de la institución" /></label>
              <label>Estado
                <select v-model="estudio.estado">
                  <option value="">Selecciona</option>
                  <option>En curso</option><option>Finalizado</option><option>En pausa</option>
                </select>
              </label>
              <label>Periodo<input v-model.trim="estudio.periodo" placeholder="Ej. 2022 - actualidad" /></label>
            </div>
          </fieldset>
        </div>
        <p v-else class="empty-studies">Aún no agregas estudios. Usa “Agregar estudio” para comenzar.</p>
      </section>

      <p v-if="error" class="message error" role="alert">{{ error }}</p>
      <p v-if="guardado" class="message success" role="status">Tu hoja de vida se guardó en este dispositivo.</p>
      <div class="actions">
        <RouterLink to="/inicio">Cancelar</RouterLink>
        <button class="primary-button" type="submit">Guardar hoja de vida</button>
      </div>
      <p class="storage-note">La información y la foto se guardan localmente en este navegador y no se envían al servidor.</p>
    </form>
  </main>
</template>

<style scoped>
.resume-page { max-width: 940px; margin: 0 auto; padding: 30px clamp(16px, 4vw, 42px); color: #243a3c; }
.back-link { color: #176d85; font-size: 13px; text-decoration: none; }
.page-heading { margin: 22px 0; }
.eyebrow { margin: 0 0 7px; color: #1685a2; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
h1 { margin: 0; font-size: clamp(24px, 4vw, 32px); }
.page-heading > p:last-child, section > div > p { color: #718083; font-size: 14px; }
.resume-form { display: grid; gap: 25px; padding: clamp(18px, 4vw, 30px); border: 1px solid #dce3e3; border-radius: 8px; background: #fff; }
.intro-section { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
h2 { margin: 0 0 8px; color: #176d85; font-size: 16px; }
.intro-section p, .section-heading p { margin: 0; color: #718083; font-size: 13px; }
.photo-field { display: grid; flex: 0 0 150px; justify-items: center; gap: 8px; }
.photo-preview { display: grid; width: 116px; height: 116px; overflow: hidden; place-items: center; border: 1px dashed #aebfc1; border-radius: 50%; color: #698184; background: #f5f8f8; font-size: 32px; }
.photo-preview img { width: 100%; height: 100%; object-fit: cover; }
.photo-button, .secondary-button, .primary-button { display: inline-flex; min-height: 38px; align-items: center; justify-content: center; padding: 0 13px; border: 1px solid #176d85; border-radius: 4px; color: #176d85; background: #fff; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
.file-input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
.photo-field small, .description-field small, .storage-note { color: #718083; font-size: 11px; text-align: center; }
.remove-photo, .remove-study { border: 0; color: #9d453c; background: transparent; font: inherit; font-size: 12px; cursor: pointer; }
.description-field, .fields label { display: grid; gap: 8px; color: #405458; font-size: 13px; font-weight: 600; }
textarea, input, select { width: 100%; padding: 10px; border: 1px solid #cbd7d8; border-radius: 4px; color: #243a3c; background: #fff; font: inherit; font-weight: 400; }
textarea { resize: vertical; line-height: 1.5; }
textarea:focus, input:focus, select:focus { outline: 2px solid #1685a244; border-color: #1685a2; }
.description-field small { text-align: right; }
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.study-list { display: grid; gap: 14px; }
.study-card { position: relative; display: grid; gap: 14px; margin: 0; padding: 18px; border: 1px solid #dce3e3; border-radius: 6px; }
.study-card legend { padding: 0 6px; color: #405458; font-size: 13px; font-weight: 700; }
.remove-study { position: absolute; top: 9px; right: 12px; }
.fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.empty-studies { padding: 18px; border: 1px dashed #cbd7d8; border-radius: 5px; color: #718083; font-size: 13px; text-align: center; }
.actions { display: flex; justify-content: flex-end; align-items: center; gap: 18px; }
.actions a { color: #52696c; font-size: 13px; text-decoration: none; }
.primary-button { min-height: 40px; padding: 0 18px; color: white; background: #176d85; }
.message { margin: 0; font-size: 13px; }.success { color: #22754f; }.error { color: #a43f39; }
.storage-note { margin: -14px 0 0; }
@media (max-width: 620px) { .intro-section { flex-direction: column-reverse; }.photo-field { align-self: center; }.fields { grid-template-columns: 1fr; }.section-heading { align-items: flex-start; flex-direction: column; }.actions { justify-content: space-between; } }
</style>
