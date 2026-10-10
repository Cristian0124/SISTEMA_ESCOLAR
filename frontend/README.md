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

- `layouts/MainLayout.vue` — único layout (menú + `router-view`)
- `views/` — Login (fuera del layout), Matrícula, Mis matrículas, Telemetría (provisionales)
- `stores/auth.ts` — sesión (access token solo en memoria)
- `services/` — una función axios por endpoint
- `api/axios.ts` — instancia con interceptores (token + refresh automático)
- `router/index.ts` — rutas anidadas bajo el layout + guard de acceso
- `types/index.ts` — contrato con el backend

## Contrato supuesto con el backend

- `POST /auth/login` recibe `{ correo, password }` y responde `{ accessToken, usuario }`
- `POST /auth/refresh` (cookie) responde igual
- `POST /auth/logout`
- `usuario.rol` es `'estudiante'` o `'admin'`
