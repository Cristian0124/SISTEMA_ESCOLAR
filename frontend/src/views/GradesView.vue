<template>
  <main class="process-page">
    <RouterLink class="back-link" to="/inicio">← Volver al inicio</RouterLink>
    <header>
      <p class="eyebrow">Proceso académico</p>
      <h1>Notas registradas</h1>
      <p>Consulta las calificaciones asociadas a tus asignaturas.</p>
    </header>
    <section class="notice" aria-live="polite">
      <strong>Consulta de notas no disponible</strong>
      <p>Todavia no se puede proporcionar las calificaciones</p>
    </section>
  </main>
</template>

<style scoped>
.process-page { max-width: 1000px; margin: 0 auto; padding: 30px clamp(16px, 4vw, 42px); color: #243a3c; }
.back-link { display: inline-block; margin-bottom: 20px; color: #176d85; font-size: 13px; text-decoration: none; }
.back-link:hover { text-decoration: underline; }
.eyebrow { margin: 0 0 7px; color: #1685a2; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
h1 { margin: 0; font-size: clamp(24px, 4vw, 32px); }
header > p:last-child { color: #718083; font-size: 14px; }
.notice { margin-top: 24px; padding: 22px; border: 1px solid #dce3e3; border-radius: 8px; background: #fff; }
.notice strong { color: #405458; font-size: 15px; }
.notice p { color: #718083; font-size: 13px; line-height: 1.6; }
</style>
