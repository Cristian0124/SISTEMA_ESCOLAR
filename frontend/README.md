# Frontend — Sistema Escolar de Matrícula Masiva

Vue 3 + TypeScript + Pinia + vue-router + axios (Vite).

## Cómo correrlo

```
npm install
npm run dev
```

1. Edita `.env` y pon la URL del backend en `VITE_API_URL`.
2. El backend debe permitir CORS con `credentials: true` para el origen del front
   (por defecto `http://localhost:5173`), porque el refresh token viaja en una cookie.

## Estructura

- `layouts/MainLayout.vue` — encabezado, menú persistente por rol, búsqueda, menú plegable en celular y cierre de sesión. Contiene el `RouterView` de las rutas privadas.
- `layouts/navigation.ts` — opciones de navegación por rol; también alimenta los accesos de los inicios administrativo y docente.
- `views/` — contenido de las pantallas. Los inicios ya no repiten encabezado, menú ni pie de página. El login queda fuera del layout.
- `stores/auth.ts` — sesión (access token solo en memoria)
- `services/` — una función axios por endpoint
- `api/axios.ts` — instancia con interceptores (token + refresh automático)
- `router/index.ts` — rutas anidadas bajo el layout + guard de acceso
- `types/index.ts` — contrato con el backend
- `assets/base.css` — estilos globales cargados desde `main.ts`.

## Contrato supuesto con el backend

- `POST /auth/login` recibe `{ correo, password }` y responde `{ accessToken, usuario }`
- `POST /auth/refresh` (cookie) responde igual
- `POST /auth/logout`
- `usuario.rol` es `'estudiante'`, `'profesor'` o `'admin'`.

## Verificar navegación y layout

```powershell
npm.cmd run build
npm.cmd test -- --run
```

Las pruebas cubren persistencia del layout entre pantallas, opciones y restricciones por rol, enlace activo, búsqueda, apertura y cierre del menú móvil, acceso sin sesión y cierre de sesión. Las direcciones existentes se mantienen bajo la ruta padre del layout; el login es una ruta independiente. El menú del estudiante no incluye «Facultades y carreras».
