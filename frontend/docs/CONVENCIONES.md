# Convenciones y contexto del proyecto

Este documento es la memoria operativa del frontend del Marketplace Moa.
Recopila decisiones, contratos reales con el backend y atajos conocidos para
no volver a diagnosticar dos veces lo mismo.

## Stack y despliegue

| Capa | Tecnología | Destino |
|---|---|---|
| Frontend | Next.js (App Router) + React 19 + Tailwind 4.3 | Cloudflare Pages |
| API | Node/Express + Prisma | Render (`https://moa-api-8y3i.onrender.com`) |
| Base de datos | PostgreSQL (Prisma) | Neon (pooler + pgbouncer) |
| Imágenes | Cloudinary | — |
| Push | Firebase | — |

Reglas de despliegue: **nunca Vercel**; el backend es dueño de auth/roles/
permisos; CI nunca ejecuta migraciones; los carnets nunca se exponen en la UI.

## Flujo de autenticación (contrato real del backend)

Todas las rutas bajo `/auth` (ver `backend/src/modules/auth/auth.routes.js`):

- `POST /auth/register` → `201 { accessToken, user }` + cookie `refresh_token`.
  Body: `{ nombre, apellidos, email, telefono, password, reparto }`.
- `POST /auth/login` → `200 { accessToken, user }` + cookie. Body: **`{ cuenta, password }`**
  — `cuenta` es email O teléfono. NO es `email` (ver Gotchas).
- `POST /auth/google` → body `{ idToken }` (GIS).
- `POST /auth/refresh` → `200 { accessToken, user }` + **cookie rotada**.
  Lee la cookie, no el body.
- `POST /auth/logout` → `204`, borra la cookie.
- `GET /auth/me` → `{ user }` (protegido con Bearer).

Cookie de refresh: `refresh_token`, httpOnly, `secure` en producción,
`sameSite: none`, `maxAge` 30 días, **path `/auth`** (solo se envía en rutas `/auth/*`).

Access token: JWT, TTL **15 min** (`expiresIn` en `auth.service.js:8`), claims
`{ sub, rol }`. El frontend **NUNCA** lo guarda en localStorage: vive en el
Context (`AuthProvider`) y en memoria.

## Reglas de la capa API del frontend (`frontend/lib/api.ts`)

- Todas las llamadas al backend pasan por `lib/api.ts` (nunca `fetch` suelto).
- `credentials: "include"` siempre → la cookie httpOnly viaja sola.
- Ante `401` (y no ser ruta auth): `POST /auth/refresh` con la cookie y
  reintenta la petición original **UNA vez** con el token nuevo. Si el refresh
  falla: `setAccessToken(null)` + `ApiError` 401 para redirigir a `/login`.
- `bindToken({ accessToken, setAccessToken })` conecta la capa API con el
  Context en el primer render (`lib/auth.tsx:34`).
- Base URL en `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`).

## Estilo de la UI

- Cero librerías de íconos: SVG inline escritos a mano en
  `frontend/components/icons.tsx` (~18 íconos).
- Cero emojis en la interfaz.
- Paleta (aprobada): brand `#ea580c`, brand-dark `#c2410c`, brand-light
  `#fdba74`, ink `#0f172a`, surface `#f8fafc`, avatar `#fed7aa`, success `#16a34a`.
  Definida como tokens en `frontend/app/globals.css` (`@theme`).
- Chat con polling (~12 s), no WebSockets.

## Gotchas conocidos (importante)

1. **SWC falla la 1.ª carga en cada proceso** (Windows 11 24H2):
   `next-swc.win32-x64-msvc.node` lanza
   "A dynamic link library (DLL) initialization routine failed" la primera vez
   que se `require`ea en un proceso nuevo; el segundo intento en el mismo
   proceso siempre funciona. El binario NO está corrupto (SHA256 coincide con
   el tarball verificado). Solución: `frontend/preload-swc.js` se precarga con
   `node --require ./preload-swc.js` (ver `package.json`) y reintenta hasta
   5 veces, dejando el binding en cache para que Next lo use.
   **Si `next dev` vuelve a dar 404 en rutas dinámicas, escribir el preload**
   en todos los scripts (`dev`, `build`, `start`).

2. **Login usa `cuenta`, no `email`**: `lib/auth.tsx` manda
   `{ cuenta: email, password }` porque el backend (auth.service.js) busca el
   campo `cuenta`. No revertir a `email`.

3. **Cookie con `path: /auth`**: solo viaja en peticiones a rutas que
   empiecen por `/auth`. Otros fetch del backend no llevan cookie (no hace
   falta: los demás endpoints usan Bearer con el access token).

4. **pnpm en lugar de npm**: con npm la instalación muere en los tarballs
   nativos de `@next/swc-*` (red inestable); pnpm descarga solo el binario de
   Windows y termina. Re-instalar SIEMPRE con pnpm.

5. **Warning de workspace root**: Next detecta lockfiles de fuera del proyecto
   (`C:\Users\rosal\package-lock.json`) al inferir la raíz. Silenciar con
   `outputFileTracingRoot` en `next.config.ts` cuando se cree.

## Estado actual (checkpoint 3 aprobado)

Base del frontend terminada y verificada contra el backend de prod:
- Capa única API con refresh silencioso **probado 5/5** contra
  `moa-api-8y3i.onrender.com` (registro → me válido → 401 con token forzado →
  refresh rota token → reintento 200 → sin cookie cierra sesión → logout).
- AuthProvider, tipos, íconos, componentes base (Button, Input, Avatar,
  ErrorBanner, Header, ProductCard), favicon casa naranja
  (`app/icon.svg` + `app/apple-icon.png`), layout con `<AuthProvider>`.
- Ruta humo `app/ping/page.tsx` → 200 "pong".

## Pendientes

- Silenciar warning workspace root (`outputFileTracingRoot`).
- Construir (`/feed` público, `/login` con GIS, `/registro`, `/mensajes`,
  `/publicaciones/nueva`, `/vendedor/*`, `/admin/*`).
- formma real de `/feed` (ver nota):
  `{ feed: [{ id, titulo, reparto, conDomicilio, telefonoFijo, telefonoMovil, estado, creadoEn, score, vendedor: { user: { nombre, apellidos } }, productos: [{ id, nombre, descripcion, precio (string), cantidad, categoria {id,nombre}, orden, estado, fotos: [{ id, cloudinaryPublicId, orden, url }] }] }] }`.
- Migrar los prototipos aprobados (`frontend/prototipo-login.html`,
  `frontend/prototipo-mensajes.html`) a React; borrarlos luego.
- Deploy a Cloudflare Pages al final.