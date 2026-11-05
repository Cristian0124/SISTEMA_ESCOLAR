<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import { consultarDatos, guardarDatos, type DatosPersonales } from '@/api/perfil.api'
import axios from 'axios'
import { useAutenticacionStore } from '@/stores/autenticacion.store'
import { cargarBorrador, claveBorradorPerfil, guardarBorrador } from '@/services/borradores-perfil'

const auth = useAutenticacionStore()
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
const cargando = ref(true)
const cargado = ref(false)
const guardando = ref(false)
const hayBorrador = ref(false)

const storageKey = () => claveBorradorPerfil('datos-personales', auth.usuario?.id ?? 'local')

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    Object.assign(datos, await consultarDatos())
    cargado.value = true
  } catch {
    error.value = 'No fue posible cargar tus datos. Intenta nuevamente.'
  } finally { cargando.value = false }
}
onMounted(async () => {
  try { hayBorrador.value = localStorage.getItem(storageKey()) !== null } catch { /* El servidor no depende del almacenamiento local. */ }
  await cargar()
})
function recuperarBorrador() {
  try {
    const borrador = cargarBorrador(storageKey(), { ...datos })
    for (const campo of ['nombre','correo','ciudad','direccion','telefono','celular','tipoSangre','nacionalidad'] as const) {
      if (typeof borrador[campo] === 'string') datos[campo] = borrador[campo]
    }
    guardado.value = false
  } catch { error.value = 'No fue posible recuperar el borrador local.' }
}

async function guardar() {
  if (!cargado.value || guardando.value) return
  guardando.value = true
  error.value = ''
  guardado.value = false
  try {
    await guardarDatos(datos)
    if (auth.usuario) auth.usuario.nombre = datos.nombre
    guardado.value = true
    try { localStorage.removeItem(storageKey()); hayBorrador.value = false } catch { /* Guardado en servidor completado. */ }
  } catch (e) {
    error.value = axios.isAxiosError(e) ? e.response?.data?.mensaje ?? 'No fue posible guardar tus datos en el servidor.' : 'No fue posible guardar tus datos.'
    try { guardarBorrador(storageKey(), datos); hayBorrador.value = true } catch { /* El error principal se muestra arriba. */ }
  } finally { guardando.value = false }
}
</script>

<template>
  <main class="profile-page">
    <EncabezadoPagina titulo="Actualización de datos personales" seccion="Mi perfil"
      descripcion="Completa y mantén actualizada tu información de contacto y académica." />

    <p v-if="cargando" role="status">Cargando tus datos…</p>
    <form v-else class="profile-form" @submit.prevent="guardar">
      <button v-if="!cargado" type="button" @click="cargar">Reintentar carga</button>
      <button v-if="hayBorrador && cargado" type="button" @click="recuperarBorrador">Recuperar borrador de este navegador</button>
      <section>
        <h2>Información personal</h2>
        <div class="fields">
          <label>Nombre completo<input v-model.trim="datos.nombre" autocomplete="name" required /></label>
          <label>Correo electrónico<input v-model.trim="datos.correo" type="email" autocomplete="email" /></label>
          <label>Edad<input :value="datos.edad" readonly /></label>
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
          <label>Estudio o programa<input :value="datos.estudio" readonly placeholder="Ej. Ingeniería de Sistemas" /></label>
          <label>Semestre actual
            <input :value="datos.semestre" readonly />
          </label>
        </div>
      </section>

      <p v-if="error" class="message error" role="alert">{{ error }}</p>
      <p v-if="guardado" class="message success" role="status">Tus datos se guardaron correctamente en el servidor.</p>
      <div class="actions">
        <RouterLink to="/inicio">Cancelar</RouterLink>
        <button type="submit" :disabled="guardando || !cargado">{{ guardando ? 'Guardando…' : 'Guardar cambios' }}</button>
      </div>
      <p class="storage-note">Los datos guardados estarán disponibles al iniciar sesión desde otro dispositivo.</p>
    </form>
  </main>
</template>

<style scoped>
.profile-page { max-width: 940px; margin: 0 auto; padding: 30px clamp(16px, 4vw, 42px); color: var(--school-ink); }
.profile-form { display: grid; gap: 27px; padding: clamp(18px, 4vw, 30px); border: 1px solid var(--school-border); border-radius: 8px; background: #fff; }
h2 { margin: 0 0 16px; padding-bottom: 10px; border-bottom: 1px solid #e5ebeb; color: var(--school-blue); font-size: 16px; }
.fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
label { display: grid; gap: 7px; color: #493550; font-size: 13px; font-weight: 600; }
input, select { width: 100%; min-height: 40px; padding: 8px 10px; border: 1px solid #d2c6d4; border-radius: 4px; color: var(--school-ink); background: white; font: inherit; font-weight: 400; }
input:focus, select:focus { outline: 2px solid #9466a044; border-color: #9466a0; }
.actions { display: flex; justify-content: flex-end; align-items: center; gap: 18px; }
.actions a { color: #493550; font-size: 13px; text-decoration: none; }
button { min-height: 40px; padding: 0 18px; border: 0; border-radius: 4px; color: #fff; background: var(--school-blue); font: inherit; font-weight: 700; cursor: pointer; }
.message { margin: 0; font-size: 13px; }.success { color: #22754f; }.error { color: #a43f39; }.storage-note { margin: -16px 0 0; color: var(--school-muted); font-size: 11px; }
@media (max-width: 580px) { .fields { grid-template-columns: 1fr; gap: 13px; }.actions { justify-content: space-between; } }
</style>
