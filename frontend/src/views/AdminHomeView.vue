<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { modulosAdmin as modulos } from '@/layouts/navigation'
const auth = useAuthStore()
</script>

<template>
  <main class="main-content">
    <div class="home-tab"><span aria-hidden="true">⌂</span> Inicio</div>
    <section class="welcome-row">
      <div>
        <h1>Inicio administrativo</h1>
        <p class="welcome-copy">Bienvenido, {{ auth.usuario?.nombre }}. Perfil: Administrador</p>
      </div>
    </section>

    <section class="modules-section">
      <div class="section-heading">
        <h2>Procesos disponibles</h2>
      </div>

      <div class="module-list">
        <div class="module-list-header" aria-hidden="true">
          <span></span>
          <span>Proceso</span>
          <span>Descripción</span>
          <span>Acción</span>
        </div>
        <RouterLink
          v-for="modulo in modulos"
          :key="modulo.titulo"
          class="module-row"
          :to="modulo.ruta"
        >
          <span class="module-icon" aria-hidden="true">{{ modulo.icono }}</span>
          <strong>{{ modulo.titulo }}</strong>
          <span class="module-description">{{ modulo.descripcion }}</span>
          <span class="card-action">Abrir</span>
        </RouterLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.main-content {
  width: min(100%, 1240px);
  margin: 0 auto;
  padding: 25px clamp(18px, 3vw, 36px) 25px;
}

.welcome-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.welcome-row h1 {
  margin: 0;
  color: #334d57;
  font-family: Arial, sans-serif;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.15;
}

.welcome-copy {
  margin: 7px 0 0;
  color: #707e84;
  font-size: 12px;
  line-height: 1.5;
}

.modules-section {
  margin-top: 23px;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 15px;
}

.section-heading h2 {
  margin: 0;
  color: #354e57;
  font-family: Arial, sans-serif;
  font-size: 17px;
  font-weight: 600;
}

.module-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 0;
  font-size: 18px;
}

.card-action {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: auto;
  padding-top: 10px;
  color: #356f87;
  font-size: 10px;
  font-weight: 700;
}

@media (max-width: 900px) {
.main-content {
    padding-right: 25px;
    padding-left: 25px;
  }
}

@media (max-width: 680px) {
.main-content {
    padding: 27px 16px;
  }

.welcome-row {
    align-items: flex-start;
  }

.welcome-row h1 {
    font-size: 29px;
  }
}

@media (max-width: 390px) {
.welcome-row {
    flex-direction: column;
  }
}

.main-content {
  width: 100%;
  margin: 0;
  padding: 10px 14px 24px;
}

.home-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  min-width: 82px;
  padding: 7px 10px;
  border: 1px solid #ccd6da;
  border-bottom-color: #fff;
  color: #31728c;
  background: #fff;
  font-size: 11px;
}

.home-tab span {
  font-size: 14px;
}

.welcome-row {
  display: block;
  padding: 15px 4px 13px;
  border-top: 1px solid #ccd6da;
  border-bottom: 1px solid #d9e0e2;
}

.welcome-row h1 {
  color: #344c55;
  font-family: Arial, sans-serif;
  font-size: 18px;
  font-weight: 600;
}

.welcome-copy {
  margin-top: 5px;
  font-size: 11px;
}

.modules-section {
  margin-top: 16px;
}

.section-heading {
  margin-bottom: 0;
  padding: 0 4px 7px;
  border-bottom: 1px solid #cfd8dc;
}

.section-heading h2 {
  color: #3e5e6b;
  font-family: Arial, sans-serif;
  font-size: 12px;
  font-weight: 700;
}

.module-list {
  border: 1px solid #d1dadd;
  border-top: 0;
  background: #fff;
}

.module-list-header,
.module-row {
  display: grid;
  grid-template-columns: 22px minmax(145px, 0.85fr) minmax(180px, 1.5fr) 52px;
  align-items: center;
  gap: 8px;
}

.module-list-header {
  min-height: 28px;
  padding: 0 9px;
  border-bottom: 1px solid #d7dfe2;
  color: #65777e;
  background: #eef2f3;
  font-size: 10px;
  font-weight: 700;
}

.module-row {
  min-height: 39px;
  padding: 5px 9px;
  border-bottom: 1px solid #e2e7e9;
  color: #344b54;
  font-size: 11px;
  text-decoration: none;
}

.module-row:last-child {
  border-bottom: 0;
}

.module-row:hover {
  background: #f2f7f8;
}

.module-row strong {
  font-size: 11px;
  font-weight: 400;
}

.module-icon {
  width: auto;
  height: auto;
  color: #2180a0;
  background: transparent;
  font-size: 13px;
}

.module-description {
  color: #718087;
  font-size: 10px;
}

.card-action {
  margin: 0;
  padding: 0;
  color: #28728c;
  font-size: 10px;
  font-weight: 400;
  text-decoration: underline;
}

@media (max-width: 680px) {
.module-list-header,
.module-row {
    grid-template-columns: 20px minmax(110px, 0.9fr) minmax(105px, 1.2fr) 45px;
    gap: 5px;
    padding-right: 6px;
    padding-left: 6px;
  }

.module-list-header {
    font-size: 9px;
  }

.module-row strong {
    font-size: 10px;
  }

.module-description,
.card-action {
    font-size: 9px;
  }
}

@media (max-width: 390px) {
.module-list-header,
.module-row {
    grid-template-columns: 18px minmax(0, 1fr) 44px;
  }

.module-list-header span:nth-child(3),
.module-description {
    display: none;
  }
}
</style>
