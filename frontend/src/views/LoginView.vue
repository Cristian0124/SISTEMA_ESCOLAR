<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const correo = ref('')
const password = ref('')

async function iniciarSesion() {
  const inicioCorrecto = await auth.iniciarSesion({
    correo: correo.value.trim(),
    password: password.value,
  })

  if (inicioCorrecto) password.value = ''
}

async function cerrarSesion() {
  await auth.cerrarSesion()
}
</script>

<template>
  <main class="login-page">
    <section class="campus-panel" aria-label="Campus del Sistema Escolar">
      <img
        class="campus-image"
        src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1500&q=85"
        alt="Estudiantes compartiendo en el campus universitario"
      />
      <div class="campus-shade" aria-hidden="true"></div>
      <div class="campus-content">
        <a class="wordmark" href="/login" aria-label="Sistema Escolar, inicio">
          <span class="wordmark-icon">S</span>
          <span>Sistema Escolar</span>
        </a>
        <div class="campus-caption">
          <p class="eyebrow">COMUNIDAD · APRENDIZAJE · FUTURO</p>
          <h1>Un nuevo ciclo comienza con una decisión.</h1>
          <p>Tu espacio para organizar el próximo paso de tu vida académica.</p>
        </div>
        <span class="image-credit">Vida en el campus</span>
      </div>
    </section>

    <section class="form-panel">
      <div class="form-content">
        <template v-if="auth.autenticado && auth.usuario">
          <div class="success-mark" aria-hidden="true">✓</div>
          <p class="eyebrow form-eyebrow">CONEXIÓN ESTABLECIDA</p>
          <h2>Bienvenido, {{ auth.usuario.nombre }}.</h2>
          <p class="form-description">
            Iniciaste sesión como {{ auth.usuario.rol === 'admin' ? 'administrador' : 'estudiante' }}.
          </p>
          <div class="session-summary">
            <span class="session-dot" aria-hidden="true"></span>
            <span>Sesión activa</span>
            <strong>{{ auth.usuario.rol }}</strong>
          </div>
          <button class="submit-button secondary-button" type="button" @click="cerrarSesion">
            Cerrar sesión
          </button>
        </template>

        <template v-else>
          <p class="eyebrow form-eyebrow">PORTAL ACADÉMICO</p>
          <h2>Iniciar sesión</h2>
          <p class="form-description">Ingresa con tu cuenta institucional para continuar.</p>

          <form class="login-form" @submit.prevent="iniciarSesion">
            <label for="correo">Correo institucional</label>
            <input
              id="correo"
              v-model="correo"
              name="correo"
              type="email"
              autocomplete="username"
              placeholder="nombre@escuela.edu"
              required
              autofocus
            />

            <div class="password-label-row">
              <label for="password">Contraseña</label>
            </div>
            <input
              id="password"
              v-model="password"
              name="password"
              type="password"
              autocomplete="current-password"
              placeholder="Ingresa tu contraseña"
              required
            />

            <p v-if="auth.error" class="form-error" role="alert">{{ auth.error }}</p>

            <button class="submit-button" type="submit" :disabled="auth.cargando">
              <span>{{ auth.cargando ? 'Verificando acceso…' : 'Entrar al portal' }}</span>
              <span class="button-arrow" aria-hidden="true">→</span>
            </button>
          </form>

          <p class="form-footnote">Acceso seguro al Sistema Escolar</p>
        </template>
      </div>
      <footer class="page-footer">
        <span>© 2026 Sistema Escolar</span>
        <span>Acceso institucional</span>
      </footer>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  --ink: #183a32;
  --muted: #6d7b75;
  --paper: #fbfcf8;
  --line: #dce4dd;
  --accent: #c95336;
  display: grid;
  grid-template-columns: minmax(320px, 0.95fr) minmax(440px, 1.05fr);
  min-height: 100vh;
  color: var(--ink);
  background: var(--paper);
  font-family: 'Trebuchet MS', 'Aptos', sans-serif;
}

.campus-panel {
  position: relative;
  min-height: 700px;
  overflow: hidden;
  color: white;
  background: #315c4c;
}

.campus-image,
.campus-shade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.campus-image {
  object-fit: cover;
  object-position: center;
}

.campus-shade {
  background: rgba(18, 54, 44, 0.34);
}

.campus-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 700px;
  padding: 38px 42px 28px;
}

.wordmark {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  width: fit-content;
  color: white;
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;
}

.wordmark-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 4px;
  font-family: Georgia, serif;
  font-size: 20px;
}

.campus-caption {
  max-width: 490px;
  margin-bottom: 26px;
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.24);
}

.eyebrow {
  margin: 0 0 16px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
}

.campus-caption h1,
.form-content h2 {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-weight: 400;
  letter-spacing: 0;
}

.campus-caption h1 {
  max-width: 460px;
  font-size: 46px;
  line-height: 1.12;
}

.campus-caption > p:last-child {
  max-width: 390px;
  margin: 18px 0 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 15px;
  line-height: 1.6;
}

.image-credit {
  align-self: flex-end;
  color: rgba(255, 255, 255, 0.86);
  font-size: 11px;
}

.form-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100vh;
  padding: 68px clamp(40px, 8vw, 124px) 28px;
}

.form-content {
  width: 100%;
  max-width: 420px;
  margin: auto;
}

.form-eyebrow {
  margin-bottom: 14px;
  color: var(--accent);
}

.form-content h2 {
  font-size: 42px;
  line-height: 1.15;
}

.form-description {
  margin: 13px 0 34px;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.6;
}

.login-form {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.login-form label {
  margin: 0 0 9px;
  color: #263f37;
  font-size: 13px;
  font-weight: 700;
}

.login-form input {
  width: 100%;
  height: 50px;
  margin-bottom: 23px;
  padding: 0 14px;
  border: 1px solid #cbd6cd;
  border-radius: 4px;
  outline: none;
  color: var(--ink);
  background: white;
  font: inherit;
  font-size: 14px;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.login-form input::placeholder {
  color: #99a69f;
}

.login-form input:focus {
  border-color: #39705d;
  box-shadow: 0 0 0 3px rgba(57, 112, 93, 0.14);
}

.password-label-row {
  display: flex;
  justify-content: space-between;
}

.password-label-row label {
  margin-bottom: 9px;
}

.submit-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
  margin-top: 3px;
  padding: 0 17px;
  border: 1px solid #204c40;
  border-radius: 4px;
  color: white;
  background: #204c40;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  transition: background 150ms ease, transform 150ms ease;
}

.submit-button:hover:not(:disabled) {
  background: #173c32;
  transform: translateY(-1px);
}

.submit-button:focus-visible {
  outline: 3px solid rgba(57, 112, 93, 0.3);
  outline-offset: 3px;
}

.submit-button:disabled {
  cursor: wait;
  opacity: 0.72;
}

.button-arrow {
  font-size: 20px;
  font-weight: 400;
}

.form-error {
  margin: -7px 0 16px;
  padding: 11px 12px;
  border-left: 3px solid #c95336;
  color: #873b29;
  background: #fff0e9;
  font-size: 13px;
  line-height: 1.5;
}

.form-footnote {
  margin: 23px 0 0;
  color: #849189;
  font-size: 12px;
  text-align: center;
}

.success-mark {
  display: grid;
  width: 48px;
  height: 48px;
  margin-bottom: 28px;
  place-items: center;
  border-radius: 50%;
  color: #204c40;
  background: #e2eee4;
  font-size: 25px;
}

.session-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  margin: 28px 0 20px;
  padding: 0 13px;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--muted);
  font-size: 13px;
}

.session-summary strong {
  margin-left: auto;
  color: var(--ink);
  font-size: 12px;
  text-transform: capitalize;
}

.session-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #438567;
}

.secondary-button {
  justify-content: center;
  width: 100%;
  color: var(--ink);
  border-color: var(--line);
  background: transparent;
}

.secondary-button:hover:not(:disabled) {
  background: #edf2ec;
}

.page-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #89948d;
  font-size: 11px;
}

@media (max-width: 900px) {
  .login-page {
    grid-template-columns: minmax(260px, 0.8fr) minmax(390px, 1.2fr);
  }

  .campus-content {
    padding: 30px 26px 22px;
  }

  .campus-caption h1 {
    font-size: 38px;
  }

  .form-panel {
    padding-right: 44px;
    padding-left: 44px;
  }
}

@media (max-width: 680px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .campus-panel,
  .campus-content {
    min-height: 250px;
  }

  .campus-content {
    padding: 20px 22px;
  }

  .campus-caption {
    margin: 38px 0 0;
  }

  .campus-caption .eyebrow,
  .campus-caption > p:last-child,
  .image-credit {
    display: none;
  }

  .campus-caption h1 {
    max-width: 360px;
    font-size: 30px;
  }

  .form-panel {
    min-height: auto;
    padding: 42px 24px 22px;
  }

  .form-content h2 {
    font-size: 36px;
  }

  .page-footer {
    margin-top: 54px;
  }
}

.login-page {
  --ink: #263238;
  --muted: #66727a;
  --paper: #f0f2f4;
  --line: #d1d7dc;
  --accent: #356b94;
  display: grid;
  grid-template-columns: 1fr;
  place-items: center;
  min-height: 100vh;
  padding: 24px;
  color: var(--ink);
  background: var(--paper);
  font-family: Arial, sans-serif;
}

:global(body) {
  margin: 0;
}

:global(*),
:global(*::before),
:global(*::after) {
  box-sizing: border-box;
}

.campus-panel {
  display: none;
}

.form-panel {
  display: flex;
  width: min(100%, 430px);
  min-height: 0;
  padding: 32px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: white;
  box-shadow: none;
}

.form-content {
  max-width: none;
  margin: 0;
}

.eyebrow {
  margin-bottom: 10px;
  color: #58656d;
  font-size: 12px;
  letter-spacing: 0;
}

.form-eyebrow {
  color: var(--accent);
}

.form-content h2 {
  font-family: Arial, sans-serif;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.25;
}

.form-description {
  margin: 10px 0 24px;
  font-size: 14px;
  line-height: 1.5;
}

.login-form label {
  color: var(--ink);
  font-size: 14px;
}

.login-form input {
  height: 44px;
  margin-bottom: 18px;
  padding: 0 11px;
  border-color: #bfc8ce;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 120ms ease;
}

.login-form input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(53, 107, 148, 0.15);
}

.submit-button {
  min-height: 44px;
  padding: 0 13px;
  border-color: var(--accent);
  border-radius: 4px;
  background: var(--accent);
  font-size: 14px;
  transition: background 120ms ease;
}

.submit-button:hover:not(:disabled) {
  background: #285778;
  transform: none;
}

.submit-button:focus-visible {
  outline-color: rgba(53, 107, 148, 0.35);
}

.button-arrow {
  font-size: 18px;
}

.form-error {
  border-left-color: #bd3e35;
  color: #8a302a;
  background: #fff0ef;
}

.form-footnote {
  margin-top: 18px;
  color: #707b82;
}

.success-mark {
  width: 42px;
  height: 42px;
  margin-bottom: 20px;
  color: #356b4b;
  background: #e8f1e9;
  font-size: 22px;
}

.session-summary {
  min-height: 46px;
  margin: 22px 0 16px;
  border-radius: 4px;
}

.session-dot {
  background: #50845b;
}

.secondary-button {
  color: var(--ink);
  border-color: #bfc8ce;
  background: #f7f8f9;
}

.secondary-button:hover:not(:disabled) {
  background: #e9edef;
}

.page-footer {
  margin-top: 24px;
  color: #737e85;
  font-size: 12px;
}

@media (max-width: 480px) {
  .login-page {
    padding: 14px;
  }

  .form-panel {
    padding: 24px 20px;
  }

  .page-footer {
    gap: 8px;
    font-size: 11px;
  }
}
</style>
