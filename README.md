# Marketplace Moa

Marketplace local de compra/venta para Moa, Holguín, Cuba. Los vendedores
publican productos con fotos, los compradores navegan el feed, chatean con los
vendedores y guardan favoritos. **Ya está en producción** (no es un prototipo).

## Arquitectura

```
┌─────────────────────────┐        ┌──────────────────────────┐        ┌──────────────┐
│  Frontend Next.js (App  │  REST ─▶│  Backend Express 5      │  Prisma│  PostgreSQL  │
│  Router, React 19, e ────┤  HTTPS │  + Prisma + JWT          │────────▶│  Neon        │
│  Cloudflare Workers     │        └───────┬──────────────────┘        └──────────────┘
│  (OpenNext)             │                │
└─────────────────────────┘   Cloudinary (fotos) · Firebase Cloud Messaging (push)
```

- **Frontend:** Next.js 15.5 (App Router, TS, Tailwind 4) → **Cloudflare Workers**
  vía OpenNext. Producción: `https://moa-frontend.luisiking89.workers.dev`
- **Backend:** Node + Express 5 + Prisma → **Render** (free tier).
  Producción: `https://moa-api-8y3i.onrender.com`
- **Base de datos:** PostgreSQL en **Neon**.
- **Fotos:** Cloudinary (`f_auto`, `q_auto`).
- **Notificaciones:** Firebase Cloud Messaging (web push).
- **Auth:** Google OAuth (GIS) + email/teléfono con contraseña (bcrypt, hash
  salado; sin contraseña en claro), JWT (access 15 min) + refresh token (cookie
  httpOnly 30 días).

## Decisiones técnicas fijas (y por qué)

- **Nunca Vercel**: el dashboard exige verificación telefónica y geo-bloquea
  desde Cuba. Cloudflare Workers (gratuito, sin esas restricciones) es la casa
  del frontend.
- **Polling en vez de WebSockets**: el free tier de Render duerme el backend;
  WebSockets morirían con el sleep. Mensajería usa polling (ver `frontend/lib/`).
- **Access token en memoria, nunca localStorage**: el token vive en el Context de
  React; sobrevive solo lo que dura la pestaña. La sesión se restaura con el
  refresh cookie al cargar la app.
- **CORS multi-origen por variable**: el backend acepta una lista de orígenes en
  `FRONTEND_URL` separada por comas (p. ej. local + producción), con `credentials:
  true`. Sin `origin` (Postman / server-to-server) se acepta.
- **CI nunca expuesto**: el job diario se protege con `X-Job-Key` (ver `JOB_SECRET_KEY`).
- **Base64 directo a Cloudinary**: el frontend sube imágenes en base64 y el
  backend las procesa — sin endpoints intermedios de upload (límite de JSON 15 MB).
- **Sin WebSockets / sin `next/image`**: el worker no usa ISR ni R2 (aplicación
  "estática+API"), ver `frontend/docs/HANDOFF-CLOUDFLARE.md`.

## Cómo correr en local

### Backend

```bash
cd backend
cp .env.example .env   # (si existe) o crea .env con las vars de abajo
npm install
npm run prisma:generate
npm run dev            # arranca en http://localhost:3001
```

### Frontend

Requisito en **Windows**: los scripts ya cargan `preload-swc.js` vía
`--require`, que precarga el binario nativo de SWC (`@next/swc-win32-x64-msvc`).
Solo aplica en win32/x64; en Linux/Mac no hace nada. No lo borres.

```bash
cd frontend
pnpm install             # pnpm 12 (usa pnpm-workspace.yaml)
pnpm dev                 # http://localhost:3000
```

Si el backend se corre en otro puerto, setea `NEXT_PUBLIC_API_URL`.

### Build/deploy (worker)

```bash
cd frontend
npx opennextjs-cloudflare build    # build para Workers
pnpm preview                        # corre la worker localmente
pnpm deploy                         # despliega a Cloudflare (CI ya lo hace solo)
```

> En Windows el build de OpenNext falla por un bug de esbuild con symlinks de
> pnpm. Descartado; usar el CI de GitHub Actions (ver sección CI/CD).

## Variables de entorno

### Backend (`backend/.env`, en Render)

`names` (valores reales solo en el dashboard de Render):

| Variable | Nota |
|---|---|
| `DATABASE_URL` | cadena de conexión Neon (Prisma) |
| `JWT_SECRET` | firma del access token |
| `REFRESH_TOKEN_SECRET` | firma del refresh token |
| `JOB_SECRET_KEY` | clave del job diario (X-Job-Key) |
| `FRONTEND_URL` | orígenes CORS permitidos, **separados por comas** (p. ej. `http://localhost:3000,https://moa-frontend.luisiking89.workers.dev`) |
| `COOKIE_SECURE` | `true` en prod |
| `COOKIE_SAME_SITE` | `none` en prod (para cross-site) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | fotos |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | push |
| `GOOGLE_CLIENT_ID` | verificación del idToken de Google |
| `PORT` | opcional (Render lo asigna) |
| `NODE_ENV` | `production` en prod |

### Frontend (`frontend/.env.local` y workflow CI)

`names` (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`):

| Variable | Dónde | Nota |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `.env.local` + workflow | `https://moa-api-8y3i.onrender.com` en prod |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `.env.local` + workflow | client de OAuth de Google |

## Estructura de carpetas

```
backend/
  src/
    app.js                 # Express: CORS multi-origen, cookies, mount de rutas
    index.js               # arranque
    middleware/auth.js     # requireAuth, requireRoles
    lib/prisma.js, lib/cloudinary.js, lib/firebase.js
    modules/
      auth/                # register, login, google, refresh, logout, me
      vendedores/          # solicitud, perfil, administración, publico
      publicaciones/       # crear, detalle, marcar producto, soft-delete
      feed/                # feed rankeado, búsqueda, categorias
      mensajes/            # conversaciones, hilos, no-leidos
      notificaciones/      # device-tokens, bandeja, leídas
      favoritos/           # ids, listar, agregar, quitar
      admin/               # resumen
      jobs/                # revisar-suscripciones
  prisma/schema.prisma     # User, VendedorPerfil, Publicacion, Producto, ...
frontend/
  app/                     # rutas Next (admin, favoritos, feed, login, ...)
  lib/                     # api.ts, auth.tsx, google.ts, favoritos.ts, feed.ts, ...
  components/              # 8 componentes compartidos
  preload-swc.js           # workaround Windows para SWC (no borrar)
  open-next.config.ts      # config de OpenNext (Cloudflare)
  wrangler.jsonc           # worker moa-frontend
.github/workflows/         # deploy-frontend.yml · revisar-suscripciones.yml
```

## CI/CD

- **Backend → Render:** push a `main` redepliega automáticamente en Render
  (conexión del repo en el dashboard; procesos con `npm run start` y
  `prisma migrate` en el arranque si está configurado).
- **Frontend → Cloudflare Workers:** GitHub Action
  `.github/workflows/deploy-frontend.yml`. Se dispara en push a `main` cuando
  hay cambios bajo `frontend/**` (o manualmente con *Run workflow*). Corre en
  un runner Ubuntu (Node 22): `pnpm install --frozen-lockfile` +
  `pnpm run deploy`, autenticando a wrangler con el secret
  `CLOUDFLARE_API_TOKEN`. Detalles y solución de problemas en
  `frontend/docs/HANDOFF-CLOUDFLARE.md`.
- **Job diario → backend:** Action `revisar-suscripciones.yml` (cron a las 00:00)
  llama a `POST /admin/jobs/revisar-suscripciones` con `X-Job-Key: JOB_SECRET_KEY`.

## Estado actual

### Backend (en producción)

| Módulo | Estado | Datos clave |
|---|---|---|
| Auth | ✅ | Google idToken, email/teléfono con contraseña (bcrypt), JWT 15 min + refresh 30 días httpOnly |
| Vendedores | ✅ | Solicitud → revisión admin → `aprobado` (demo 2 días / exento / activo) |
| Publicaciones | ✅ | 1–3 productos/ publicación; fotos base64→Cloudinary; demo: 5/día y 10 total |
| Feed | ✅ | score `0.5·suscripción + 0.35·recencia + 0.15·reparto`; filtros, paginado |
| Búsqueda | ✅ | `GET /feed/productos?q=` (pg_trgm) |
| Mensajería | ✅ | Comprador↔vendedor, polling (sin WebSockets) |
| Notificaciones | ✅ | `Notificacion` + `DeviceToken`, push FCM al escribir mensaje |
| Favoritos | ✅ | toggle por producto |
| Admin | ✅ | `GET /admin/resumen` (solo rol admin) |
| Job diario | ✅ | vencec spin `demo` y `activo` (→`vencido`, pausa publicaciones); `vencido` +7 días → elimina; resetea contador diario |

Modelos definidos sin endpoints aún: `Reporte`, `ZonaDomicilio`. El worker de
Cloudflare ya sirve el frontend completo (ruta `https://moa-frontend.luisiking89.workers.dev`).

### Frontend (en producción)

Rutas desplegadas: `/login`, `/registro`, `/feed`, `/publicaciones/*`,
`/mensajes/*`, `/favoritos`, `/perfil`, `/vendedor/*`, `/admin/*`. El login con
Google requiere que el dominio del worker esté registrado en Google Cloud
Console (Authorized JavaScript origins + redirect URIs) — pendiente si aún no
está.

### Roadmap / pendientes

- Reportar contenido: modelo `Reporte` definido pero sin endpoints ni UI.
- Reportes (`Reporte`) sin endpoints (módulo de reportar contenido).
- Registro del dominio del worker en Google Cloud Console para OAuth si no está.