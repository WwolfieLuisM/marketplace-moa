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
  En el frontend lo dispara `lib/google.ts` (render del botón oficial de GIS en
  `#google-button`, Client ID público `NEXT_PUBLIC_GOOGLE_CLIENT_ID`); el idToken
  se envía **tal cual, sin decodificar**, a `POST /auth/google`
  (ver `docs/integracion-google.md`).
- `POST /auth/refresh` → `200 { accessToken, user }` + **cookie rotada**.
  Lee la cookie, no el body.
- `POST /auth/logout` → `204`, borra la cookie.
- `GET /auth/me` → `{ user }` (protegido con Bearer).

Cookie de refresh: `refresh_token`, httpOnly, `secure` en producción,
`sameSite: none`, `maxAge` 30 días, **path `/auth`** (solo se envía en rutas `/auth/*`).

Access token: JWT, TTL **15 min** (`expiresIn` en `auth.service.js:8`), claims
`{ sub, rol }`. El frontend **NUNCA** lo guarda en localStorage: vive en el
Context (`AuthProvider`) y en memoria.

## Login / Registro en el frontend

- `app/login/` y `app/registro/` = página server (solo `metadata` + `<Script>`
  o `<Form/>`) + componente client con el formulario.
- El formulario NUNCA usa `fetch` suelto: pasa por `lib/api.ts` y el Context
  (`useAuth().login / registrar / loginGoogle`), que aplican la sesión
  (`setAccessToken` + `setUsuario`).
- Tras login/registro exitoso → `router.replace("/feed")`. Si ya hay sesión
  activa, `/login` y `/registro` redirigen a `/feed`.
- `registrar()` acepta `DatosRegistro`
  (`{ nombre, apellidos, email, password, telefono?, reparto? }`) → body de
  `/auth/register`; el campo es `email` (register), mientras que el **login**
  manda `cuenta` (gotcha nº2).
- Reparto en `/registro`: `select` con `REPARTOS_MOA`
  (`frontend/lib/types.ts`), campo obligatorio.

## Parámetros públicos del frontend (Cloudflare Pages)

- `NEXT_PUBLIC_API_URL` (backend) y `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (clave
  pública) en `.env.local`; ambos deben configurarse también en Cloudflare
  Pages, y el dominio final agregarse en el OAuth client de Google.

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

## Estado actual

Checkpoint 3 aprobado + páginas públicas funcionando contra el backend de prod:

- Capa única API con refresh silencioso **probado 5/5** contra
  `moa-api-8y3i.onrender.com`.
- AuthProvider, tipos, íconos, componentes base, favicon casa naranja,
  layout con `<AuthProvider>`, ruta humo `app/ping/page.tsx`.
- `/feed` construido (`app/feed/page.tsx`): buscador con debounce
  (`/feed/productos?q=`), filtros reparto/categoría, grid de `ProductCard`
  (2/3/4 cols), "Cargar más", el cliente NO reordena (el backend ordena por
  score). Contrato abajo. **Seed en prod**: 3 vendedores demo
  (`tienda.cabana.seed@example.com`, `panaderia.donacarmen.seed@example.com`,
  `moda.express.seed@example.com`, pass `Demo1234!`) con 3 publicaciones →
  7 productos; creados vía API + `UPDATE vendedor_perfil SET estado_licencia='aprobado'`
  en Neon (para publicar se exige licencia aprobada; el feed solo filtra por
  suscripción demo/activo/exento).
  Forma real de `/feed`: `{ feed: [{ id, titulo, reparto, conDomicilio, telefonoFijo, telefonoMovil, estado, creadoEn, score, vendedor: { user: { nombre, apellidos } }, productos: [{ id, nombre, descripcion, precio (string), cantidad, categoria { id, nombre }, orden, estado, fotos: [{ id, cloudinaryPublicId, orden, url }] }] }], page }`;
  `/feed/categorias` → `{ categorias }`; `/feed/productos?q=&page=` →
  `{ productos: [... + score + publicacion {...}], page }` (PAGE_SIZE 20).
- `/login` (`app/login/`) con email/contraseña + botón GIS.
- `/registro` (`app/registro/`) con nombre, apellidos, teléfono, email,
  contraseña y selector de reparto.
- Env vars locales: `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
- `outputFileTracingRoot` ya configurado (`next.config.ts`) → warning de
  workspace root silenciado.

## Pendientes

- `/mensajes` (lista + hilo; polling ~12 s), `/publicaciones/nueva`,
  `/publicaciones/:id`, `/vendedor/solicitud`, `/vendedor/perfil`,
  `/vendedor/[id]`, `/admin/*`, `/perfil`, `/favoritos`.
- Migrar `frontend/prototipo-mensajes.html`; borrar junto con
  `prototipo-login.html` y `prototipo-feed.html` (ya migrados).
- Ajustes de responsive móvil que surjan al probar en el teléfono.
- Deploy a Cloudflare Pages al final (crear proyecto, setear las 2 env vars y
  agregar el dominio al OAuth client de Google).