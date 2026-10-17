<script setup lang="ts">
import { reactive, ref } from 'vue'
import axios from 'axios'
import api from '@/api/axios'

const formulario = reactive({
  nombre: '', correo: '', password: '', rol: 'estudiante', cedula: '', fechaNacimiento: '',
  fechaIngreso: '', nacionalidad: '', genero: '',
})
const guardando = ref(false)
const mensaje = ref('')
const error = ref('')

async function registrar() {
  guardando.value = true
  mensaje.value = ''
  error.value = ''
  try {
    await api.post('/auth/usuarios', formulario)
    mensaje.value = 'Usuario registrado correctamente.'
    Object.assign(formulario, { nombre: '', correo: '', password: '', rol: 'estudiante', cedula: '', fechaNacimiento: '', fechaIngreso: '', nacionalidad: '', genero: '' })
  } catch (e) {
    if (axios.isAxiosError(e)) {
      error.value = e.response?.data?.mensaje ?? 'No fue posible registrar el usuario.'
    } else {
      error.value = 'No fue posible registrar el usuario.'
    }
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <section class="registration-page">
    <header>
      <p class="eyebrow">Administración de usuarios</p>
      <h1>Registrar usuario</h1>
      <p>Registra una cuenta de estudiante o profesor.</p>
    </header>

    <form class="registration-form" @submit.prevent="registrar">
      <h2>Datos personales</h2>
      <div class="fields">
        <label>Tipo de usuario
          <select v-model="formulario.rol" required>
            <option value="estudiante">Estudiante</option>
            <option value="profesor">Profesor</option>
          </select>
        </label>
        <label>Nombre completo<input v-model.trim="formulario.nombre" required autocomplete="name" /></label>
        <label>Cédula<input v-model.trim="formulario.cedula" required inputmode="numeric" /></label>
        <label>Fecha de nacimiento<input v-model="formulario.fechaNacimiento" type="date" required /></label>
        <label>Fecha de ingreso<input v-model="formulario.fechaIngreso" type="date" required /></label>
        <label>Nacionalidad<input v-model.trim="formulario.nacionalidad" required autocomplete="country-name" /></label>
        <label>Género
          <select v-model="formulario.genero" required>
            <option disabled value="">Selecciona una opción</option>
            <option>Femenino</option><option>Masculino</option><option>No binario</option><option>Prefiero no indicar</option>
          </select>
        </label>
      </div>

      <h2>Acceso al sistema</h2>
      <div class="fields">
        <label>Correo electrónico<input v-model.trim="formulario.correo" type="email" required autocomplete="email" /></label>
        <label>Contraseña<input v-model="formulario.password" type="password" required minlength="8" autocomplete="new-password" /></label>
      </div>
      <p v-if="mensaje" class="notice success" role="status">{{ mensaje }}</p>
      <p v-if="error" class="notice failure" role="alert">{{ error }}</p>
      <div class="actions">
        <RouterLink class="cancel" to="/inicio">Cancelar</RouterLink>
        <button type="submit" :disabled="guardando">{{ guardando ? 'Guardando…' : 'Registrar usuario' }}</button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.registration-page { max-width: 900px; margin: 0 auto; padding: 34px clamp(18px, 5vw, 56px); color: #243a3c; }
header { margin-bottom: 24px; }
.eyebrow { margin: 0 0 7px; color: #1685a2; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
h1 { margin: 0; font-size: clamp(25px, 4vw, 34px); }
header > p:last-child { color: #718083; }
.registration-form { padding: 26px; border: 1px solid #dce3e3; border-radius: 8px; background: #fff; box-shadow: 0 8px 24px #203a3c0b; }
h2 { margin: 0 0 16px; padding-bottom: 9px; border-bottom: 1px solid #e5ebeb; color: #176d85; font-size: 16px; }
h2:not(:first-child) { margin-top: 28px; }
.fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
label { display: grid; gap: 7px; color: #405458; font-size: 13px; font-weight: 600; }
input, select { width: 100%; min-height: 40px; padding: 8px 10px; border: 1px solid #cbd7d8; border-radius: 4px; color: #243a3c; background: white; font: inherit; font-weight: 400; }
input:focus, select:focus { outline: 2px solid #1685a244; border-color: #1685a2; }
.actions { display: flex; justify-content: flex-end; align-items: center; gap: 16px; margin-top: 24px; }
.actions a { color: #52696c; text-decoration: none; font-size: 14px; }
button { min-height: 40px; padding: 0 18px; border: 0; border-radius: 4px; color: white; background: #176d85; font: inherit; font-weight: 700; cursor: pointer; }
button:disabled { opacity: .65; cursor: wait; }
.notice { margin: 18px 0 0; font-size: 14px; }
.success { color: #22754f; }.failure { color: #a43f39; }
@media (max-width: 560px) { .registration-form { padding: 19px; }.fields { grid-template-columns: 1fr; gap: 13px; } }
</style>
