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

6. **`POST /mensajes` cuerpo**: `{ destinatarioId, productoId?, contenido }`.
   `productoId` es **opcional** (backend acepta `null`); el componente hilo lo
   envía desde el query `?producto=` que pasó el ProductCard ("Contactar
   vendedor") o desde el último mensaje con producto en hilos existentes. Si
   se omite, enviar explícitamente `productoId: null` para que el backend lo
   reciba como `undefined` y no como string `"null"`.

7. **`GET /mensajes/conversaciones/:otroUserId` (hilo) y `leido`**: ejecuta
   `findMany` antes de `updateMany` dentro de la misma transacción, así que
   la primera respuesta devuelve mensajes **con `leido` falso** aunque el
   side-effect sí se aplicó. La siguiente llamada (poll 12 s o recarga) sí
   refleja `leido: true`. El componente solo usa el flag en mis mensajes, así
   que no afecta la UX, pero ojo al consumirlo en otra parte.

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
- **Backend tweak mínimo** (`publicaciones.service.js`): `detallePublico` ahora
  expone `vendedor.user.id` (necesario para abrir chat desde el feed).
- `/mensajes` (`app/mensajes/page.tsx`): lista de conversaciones con
  no-leidos por hilo; `?publicacion=X` resuelve vendedor por detalle público
  y redirige al hilo con contexto del primer producto.
- `/mensajes/[conversacionId]` (`app/mensajes/[conversacionId]/page.tsx`):
  hilo estilo prototipo (max-w-[480px]), polling 12 s, contexto de producto
  fijo arriba, enviar con `POST /mensajes { destinatarioId, productoId?, contenido }`,
  burbujas con día/Hoy/fecha + checks leído. Marca leído al abrir el hilo
  (llamada backend con side-effect).
- `Header` actualizado: badge de no-leídos en el icono Chat (polling 30 s) y
  botón Publicar (`IconPlus` → `/publicaciones/nueva`) para usuarios logueados.
- `lib/fecha.ts`: helpers `formatearHora`, `claveDia`, `formatearLista`.
- `/publicaciones/nueva` (`app/publicaciones/nueva/`): formulario de creación
  con título, reparto, envío a domicilio, teléfonos y 1–3 productos (nombre,
  descripción, precio, cantidad, categoría, hasta 3 fotos leídas como base64).
  Guardia: exige sesión y perfil vendedor aprobado (`GET /vendedores/me`;
  si es 404 muestra cta a `/vendedor/solicitud`). En demo muestra restantes
  hoy/total (límites 5 día / 10 total) y bloquea el form si alcanzó el límite.
  `POST /publicaciones` → redirect a `/publicaciones/:id`. Las fotos se
  mandan como data-URI `data:image/(png|jpe?g|webp);base64,` (el backend las
  sube a Cloudinary vía `subirFoto` — NO hay endpoint de upload aparte).
- `/publicaciones/:id` (`app/publicaciones/[id]/`): detalle público con
  galería de fotos, productos (precio, categoría, cantidad), teléfonos
  `tel:` y tarjeta del vendedor (nombre, negocio, horario, direccionFisica,
  zonas de domicilio que coinciden con `reparto`). Estado no encontrado
  (404) con vuelta al feed. Importante: el `vendedor.user.id` NO viene en
  `detallePublico` hasta que Render redepliegue el tweak `id:true`; los
  enlaces de contacto usan `vendedor.userId` (perfil) que SÍ viene siempre,
  → `/mensajes/{userId}?publicacion=&producto=`.
- `/vendedor/solicitud` (`app/vendedor/solicitud/`): formulario con tipo
  (individual/TCP/empresa_estatal), nombre, apellidos, número de CI, reparto
  y, si es negocio: nombreNegocio (obligatorio), categoría, horario y
  dirección física. `POST /vendedores/solicitud`. Guardias: sin sesión →
  `/login`; si ya hay perfil (`GET /vendedores/me` OK) → aviso + link a
  `/vendedor/perfil`. El CI viaja al backend pero NUNCA se muestra en UI.
  Tras enviar: "Tu solicitud fue enviada, un administrador la revisará."
- `/vendedor/perfil` (`app/vendedor/perfil/`): `GET /vendedores/me` +
  `GET /vendedores/me/publicaciones`. Muestra licencia/suscripciA3n (badges
  colored), tipo, horario, direcciA3n, contadores demo (5 dA-a / 10 total con
  restantes), fechas (demoTerminaEn / suscripcionVenceEn / exento) y aviso
  si alcanzA3 el lA-mite o estA� pendiente/rechazado. Lista de publicaciones
  con acciones por producto (`PATCH /publicaciones/:px/productos/:pr` con
  `estado: pausado|activo|vendido`) y eliminar publicaciA3n
  (`DELETE /publicaciones/:id`, soft-delete, confirm nativo). Las publicadas
  eliminadas se ven con badge `eliminado` sin acciones ni link al feed.
- Favoritos (`backend/src/modules/favoritos/` + `frontend/app/favoritos/`,
  `frontend/lib/favoritos.ts`): modelo `Favorito` (tabla `favoritos`,
  `@@unique(userId,productoId)`) con rutas propias:
  `GET /favoritos` (productos con fotos url + publicacion/vendedor),
  `GET /favoritos/ids`, `POST /favoritos {productoId}` (upsert),
  `DELETE /favoritos/:productoId`; todas `requireAuth`. Frontend:
  `useFavoritos()` carga ids con sesiA3n y hace toggle optimista; el corazA3n
  va por producto en `ProductCard` (invitado �+' `/login`). La tarjeta ademA�s
  muestra badge Disponible/Agotado y tiempo relativo (`lib/fecha.tiempoRelativo`).
- `MobileNav` (`frontend/components/MobileNav.tsx`): barra inferior fija sA3lo
  en mA3vil (`md:hidden`) con Inicio/Buscar/FAB Publicar/Guardados/Perfil;
  se integra en `app/layout.tsx` para todas las rutas salvo login/registro/
  admin. Buscar navega a `/feed?buscar=1` (el feed enfoca el input).

## Pendientes

- Backend (cola del push conjunto, sin desplegar en Render): tweak
  `detallePublico id:true`, `GET /vendedores/me/publicaciones` y módulo
  `favoritos`.
- `/vendedor/[id]` (requiere endpoint pA�blico nuevo; hoy `GET /vendedores/:id`
  es solo admin); `/admin/*`; `/perfil`.
- Borrar `frontend/prototipo-mensajes.html` (ya migrado); pendiente también
  `prototipo-login.html` y `prototipo-feed.html` (ya migrados).
- Ajustes de responsive móvil que surjan al probar en el teléfono.
- Deploy a Cloudflare Pages al final (crear proyecto, setear las 2 env vars y
  agregar el dominio al OAuth client de Google).