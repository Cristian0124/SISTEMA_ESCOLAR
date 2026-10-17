<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { loadDraft, profileStorageKey, saveDraft } from '@/services/profileStorage'

interface DatosPersonales {
  nombre: string
  correo: string
  ciudad: string
  estudio: string
  semestre: string
  edad: string
  direccion: string
  telefono: string
  celular: string
  tipoSangre: string
  nacionalidad: string
}

const auth = useAuthStore()
const datos = reactive<DatosPersonales>({
  nombre: auth.usuario?.nombre ?? '',
  correo: '',
  ciudad: '',
  estudio: '',
  semestre: '',
  edad: '',
  direccion: '',
  telefono: '',
  celular: '',
  tipoSangre: '',
  nacionalidad: '',
})
const guardado = ref(false)
const error = ref('')

const storageKey = () => profileStorageKey('datos-personales', auth.usuario?.id ?? 'local')

onMounted(() => {
  try {
    Object.assign(datos, loadDraft(storageKey(), { ...datos }))
  } catch {
    error.value = 'No se pudieron leer los datos guardados. Puedes corregirlos y guardarlos nuevamente.'
  }
})

function guardar(): void {
  error.value = ''
  guardado.value = false
  try {
    saveDraft(storageKey(), datos)
    guardado.value = true
  } catch {
    error.value = 'No se pudieron guardar los cambios en este dispositivo.'
  }
}
</script>

<template>
  <main class="profile-page">
    <RouterLink class="back-link" to="/inicio">← Volver al inicio</RouterLink>
    <header class="page-heading">
      <p class="eyebrow">Mi perfil</p>
      <h1>Actualización de datos personales</h1>
      <p>Completa y mantén actualizada tu información de contacto y académica.</p>
    </header>

    <form class="profile-form" @submit.prevent="guardar">
      <section>
        <h2>Información personal</h2>
        <div class="fields">
          <label>Nombre completo<input v-model.trim="datos.nombre" autocomplete="name" required /></label>
          <label>Correo electrónico<input v-model.trim="datos.correo" type="email" autocomplete="email" /></label>
          <label>Edad<input v-model="datos.edad" type="number" min="0" max="120" inputmode="numeric" /></label>
          <label>Ciudad<input v-model.trim="datos.ciudad" autocomplete="address-level2" /></label>
          <label>Dirección<input v-model.trim="datos.direccion" autocomplete="street-address" /></label>
          <label>Tipo de sangre
            <select v-model="datos.tipoSangre">
              <option value="">Selecciona una opción</option>
              <option v-for="tipo in ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']" :key="tipo">{{ tipo }}</option>
              <option>No conozco mi tipo de sangre</option>
            </select>
          </label>
          <label>Teléfono fijo<input v-model.trim="datos.telefono" type="tel" autocomplete="tel" /></label>
          <label>Teléfono celular<input v-model.trim="datos.celular" type="tel" autocomplete="tel" /></label>
          <label>Nacionalidad<input v-model.trim="datos.nacionalidad" autocomplete="country-name" /></label>
        </div>
      </section>

      <section>
        <h2>Información académica</h2>
        <div class="fields">
          <label>Estudio o programa<input v-model.trim="datos.estudio" placeholder="Ej. Ingeniería de Sistemas" /></label>
          <label>Semestre actual
            <select v-model="datos.semestre">
              <option value="">Selecciona un semestre</option>
              <option v-for="semestre in 10" :key="semestre" :value="String(semestre)">{{ semestre }}° semestre</option>
            </select>
          </label>
        </div>
      </section>

      <p v-if="error" class="message error" role="alert">{{ error }}</p>
      <p v-if="guardado" class="message success" role="status">Tus datos se guardaron en este dispositivo.</p>
      <div class="actions">
        <RouterLink to="/inicio">Cancelar</RouterLink>
        <button type="submit">Guardar cambios</button>
      </div>
      <p class="storage-note">Esta información se guarda localmente en este navegador y no se envía al servidor.</p>
    </form>
  </main>
</template>

<style scoped>
.profile-page { max-width: 940px; margin: 0 auto; padding: 30px clamp(16px, 4vw, 42px); color: #243a3c; }
.back-link { color: #176d85; font-size: 13px; text-decoration: none; }
.page-heading { margin: 22px 0; }
.eyebrow { margin: 0 0 7px; color: #1685a2; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
h1 { margin: 0; font-size: clamp(24px, 4vw, 32px); }
.page-heading > p:last-child { color: #718083; font-size: 14px; }
.profile-form { display: grid; gap: 27px; padding: clamp(18px, 4vw, 30px); border: 1px solid #dce3e3; border-radius: 8px; background: #fff; }
h2 { margin: 0 0 16px; padding-bottom: 10px; border-bottom: 1px solid #e5ebeb; color: #176d85; font-size: 16px; }
.fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
label { display: grid; gap: 7px; color: #405458; font-size: 13px; font-weight: 600; }
input, select { width: 100%; min-height: 40px; padding: 8px 10px; border: 1px solid #cbd7d8; border-radius: 4px; color: #243a3c; background: white; font: inherit; font-weight: 400; }
input:focus, select:focus { outline: 2px solid #1685a244; border-color: #1685a2; }
.actions { display: flex; justify-content: flex-end; align-items: center; gap: 18px; }
.actions a { color: #52696c; font-size: 13px; text-decoration: none; }
button { min-height: 40px; padding: 0 18px; border: 0; border-radius: 4px; color: #fff; background: #176d85; font: inherit; font-weight: 700; cursor: pointer; }
.message { margin: 0; font-size: 13px; }.success { color: #22754f; }.error { color: #a43f39; }.storage-note { margin: -16px 0 0; color: #718083; font-size: 11px; }
@media (max-width: 580px) { .fields { grid-template-columns: 1fr; gap: 13px; }.actions { justify-content: space-between; } }
</style>
