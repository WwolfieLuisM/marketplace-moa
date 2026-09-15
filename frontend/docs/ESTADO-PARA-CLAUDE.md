# Marketplace Moa — Estado del proyecto para continuar

## Contexto
App de marketplace local para Moa (Cuba): vendedores publican productos (hasta 3 por publicación), los clientes compran el feed, contactan por chat interno y reservan. Sin pasarela de pago, el pago se gestiona fuera de la app.

## Stack y decisiones clave (NO cambiar)
- **Frontend**: Next.js (App Router) → Cloudflare Pages al final. **NUNCA Vercel**.
- **Backend**: Express + Prisma → Render (https://moa-api-8y3i.onrender.com). El backend es dueño de la auth.
- **DB**: Neon (proyecto `bitter-sea-06796259`, DB `neondb`). Cloudinary para fotos.
- **Auth**: access token SOLO en memoria (`lib/auth.tsx` Context, expone `accessToken`, usuario, cargando, login, registrar, loginGoogle, logout). Cookie httpOnly de refresh en `path:/auth`. Se restaura sesión con `POST /auth/refresh` al arrancar.
- **API client**: SIEMPRE `lib/api.ts` (`api.get/post/patch/del`) con el token bindeado; NUNCA `fetch` suelto en formularios.
- **GIS (Google)**: SDK solo en login, Client ID público `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, botón renderizado por el SDK, idToken RAW a `POST /auth/google` (no decodificar). 403 en Cuba/VPN = restricción de red, no bug.
- **Chat**: polling ~12s, sin WebSockets.
- **Fotos de publicación**: el frontend manda data-URI `data:image/(png|jpe?g|webp);base64,` en `fotos[]` del POST; el backend las sube a Cloudinary (`subirFoto`). NO hay endpoint de upload separado.
- **Límites demo** (backend los valida + frontend bloquea anticipado): 5 productos/día, 10 en total.
- **Estilo**: paleta `#ea580c` (naranja), `#0f172a` (fondo), `#f8fafc`, `#fed7aa`, `#16a34a`. SVG inline en `components/icons.tsx` (sin librerías de íconos). CERO emojis. Idioma español.
- **Privacidad**: el número de CI viaja al backend al solicitar ser vendedor, pero NUNCA se muestra ni se edita en UI.

## Estado actual
Repos: https://github.com/WwolfieLuisM/marketplace-moa. GitHub main = `1ebed86`
(7 commits pusheados: feed, login, registro, mensajes, publicaciones nueva y
detalle, vendedor, docs). Local sin push (5 commits): `9a850fd` favoritos +
nav móvil + `/perfil` + `PATCH /auth/me`; `9258afb` `/admin` (resumen +
vendedores); `ed71b35` docs; `b0395db` tiles+orden feed + fix reparto + docs
actualizado; uno nuevo pendiente de hacer (vendedor público + borrar
prototipos).

Construido y verificado (frontend en `frontend/`):
- Checkpoint 3
- `/feed` — buscador con debounce, filtros reparto/categoría, grid, "Cargar más"
- `/login` — email/contraseña + botón GIS (login usa campo `cuenta`)
- `/registro` — nombre, apellidos, teléfono, email, contraseña, reparto (login `/registro` usa `email`)
- `/mensajes` y `/mensajes/[conversacionId]` — lista con no-leídos (badge en Header con poll 30s), hilo polling 12s, contexto de producto fijo, burbujas propias naranja/ajenas blanco, checks leído; redirige a login si no hay sesión
- `/publicaciones/nueva` — form completo (1–3 productos, fotos base64 con preview, límites demo, guardia vendedor aprobado), botón "Publicar" en Header
- `/publicaciones/[id]` — detalle público con galería, teléfonos, vendedor, zonas de domicilio
- `/vendedor/solicitud` — form solicitud (tipo individual/TCP/empresa_estatal, nombre, apellidos, CI, reparto; negocio: nombreNegocio*, categoría, horario, dirección)
- `/vendedor/perfil` — estado licencia/suscripción, contadores demo, lista de publicaciones propias con Pausar/Activar/Vendido/Eliminar
- `/favoritos` — grid de productos guardados con ProductCard y botón quitar (toggle optimista con rollback)
- Nav móvil inferior (`MobileNav`) — Inicio/Buscar/FAB Publicar/Guardados/Perfil, oculta en login/registro/admin
- `/perfil` — editar nombre, apellidos, teléfono y reparto (NUNCA el CI) vía `PATCH /auth/me`; email de solo lectura
- `/admin` — dashboard con contadores (`GET /admin/resumen`); `/admin/vendedores` — filtros por estado y aprobar (demo/exento) o rechazar con modal
- `/feed` — tiles horizontales de categorías con íconos SVG (mapa `ICONOS_CATEGORIA` por nombre; "Test Job" oculto en UI) + select de orden (`relevancia`/`recientes`/`menor_precio`/`mayor_precio`, solo en vista feed). `export const dynamic = "force-dynamic"` para que al volver desde otra página SIEMPRE re-ejecute los fetch (sin esto, Next restaura la página prerenderizada estática y queda vacía hasta recargar)
- `/vendedor/[id]` — perfil público del vendedor (avatar inicial + nombre completo + negocio/reparto, categoría/horario/dirección, botón "Enviar mensaje" o "Inicia sesión para contactar") con sus publicaciones activas usando `ProductCard`. Se enlaza desde el detalle de publicación ("Ver perfil del vendedor", usa `v.userId`). Endpoint público `GET /vendedores/publico/:userId` (404 si no existe o no aprobado) — `detallePublico` en `vendedor.service.js`: perfil con user + zonas + publicaciones activas (vendedor.user + productos c/fotos `urlFoto`). Cereción: 404 si el `userId` (o cualquiera) no es UUID válido
- Prototipos HTML migrados borrados (`frontend/prototipo-login.html`, `prototipo-feed.html`, `prototipo-mensajes.html`)

Cambios backend commiteados pero NO desplegados aún en Render (van en el push conjunto):
1. `publicaciones.service.js` `detallePublico`: añade `id:true` al select del user del vendedor
2. Nuevo endpoint `GET /vendedores/me/publicaciones` (solo el dueño; lista todas sus publicaciones con productos/fotos) — `vendedor.routes.js` + `vendedor.service.js` (`misPublicaciones`)
3. `feed.service.js` `feed()` acepta `orden` (recientes / menor_precio / mayor_precio, default relevancia). El ORDER BY se inyecta desde un mapa cerrado y el resto van como parámetros para NO romper el orden (prisma `$queryRaw` no interpolaba bien el ORDER BY; ahora usa `$queryRawUnsafe` con `$1..$5`). Importante: **el reparto del usuario logueado ya NO filtra el feed por defecto** (el select "Todos los repartos" = ver TODO); solo filtra si el usuario elige un reparto en el UI. El reparto del usuario solo alimenta el score de relevancia. `feed.routes.js` mapea `orden` y pasa ambos repartos.
4. Nuevo endpoint público `GET /vendedores/publico/:userId` (sin auth) — `vendedor.service.js` `detallePublico`: perfil (user: nombre/apellidos/reparto/telefono + zonas), 404 "Vendedor no encontrado" si no existe o `estadoLicencia !== "aprobado"`, publicaciones activas con vendedor.user + productos activos c/fotos `urlFoto`. Registrado en `vendedor.routes.js` ANTES de la ruta admin `/:id`.

## Backend: endpoints útiles (API prod / local :3001)
- Auth: `POST /auth/register {email,...}` · `POST /auth/login {cuenta,password}` · `POST /auth/google {idToken}` · `POST /auth/refresh` · `POST /auth/logout`
- `GET /feed` (feed con score, params `reparto`, `categoria`, `orden`, `page`) · `GET /feed/categorias` · `GET /feed/productos?q=`
- `GET /publicaciones/:id` (detalle público; `vendedor.userId` SIEMPRE presente; `precio` viene como string)
- `POST /publicaciones` `{titulo, reparto, conDomicilio?, telefonoFijo?, telefonoMovil?, productos:[{nombre, descripcion, precio, cantidad, categoriaId, fotos?[]}]}` — requiere vendedor aprobado + suscripción demo/activo/exento
- `PATCH /publicaciones/:px/productos/:pr {estado}` (pausado|activo|vendido — owner/admin)
- `DELETE /publicaciones/:id` (soft-delete → `estado=eliminado`)
- `GET /vendedores/me` (perfil propio: estadoLicencia, estadoSuscripcion, productosHoy, productosTotalDemo, fechas, rol) — 404 si no hay perfil
- `GET /vendedores/me/publicaciones` (NUEVO, sin desplegar)
- `GET /vendedores/publico/:userId` (NUEVO, sin desplegar; PÚBLICO, sin auth; 404 si no existe o no aprobado)
- `POST /vendedores/solicitud` (crea perfil `pendiente`; guarda CI en `verificacionIdentidad`)
- Admin: `GET /vendedores?estadoLicencia=&estadoSuscripcion=` · `GET /vendedores/:id` · `POST /vendedores/:id/aprobar {moda?: "demo"|"exento"}` · `POST /vendedores/:id/rechazar`
- Mensajes: `GET /mensajes/conversaciones` · `GET /mensajes/conversaciones/:otroUserId` (crea/retorna hilo) · `POST /mensajes {destinatarioId, productoId?, contenido}` · `GET /mensajes/no-leidos` · `POST /mensajes/:conversacionId/leer`

## Datos de prueba (seed en Neon prod)
- Emails: `tienda.cabana.seed@example.com` · `panaderia.donacarmen.seed@example.com` · `moda.express.seed@example.com` — contraseña `Demo1234!` — vendedores con licencia aprobada
- Esquemas de tabla (Prisma): `VendedorPerfil` (userId, tipo, nombreNegocio, estadoLicencia, estadoSuscripcion, productosHoy, productosTotalDemo, demoTerminaEn, suscripcionVenceEn, zonas[], publicaciones[]), `ZonaDomicilio` (reparto, costoDomicilio, tiempoEstimado), `Publicacion` (titulo, reparto, conDomicilio, telefonoFijo/Movil), `Producto` (nombre, descripcion, precio Decimal, cantidad, categoriaId, orden, estado), `ProductoFoto` (cloudinaryPublicId, orden).

## Cómo correr en local
- Frontend: `cd frontend && npx next dev`. Si falla por SWC preload, iniciar `node --require <frontend>/preload-swc.js node_modules/next/dist/bin/next dev` con `-WorkingDirectory <frontend>`. `.env.local` tiene `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
- Backend: `cd backend && node src/index.js` (puerto 3001, DATABASE_URL → Neon prod). Usar para probar endpoints nuevos sin tocar Render.
- Verificaciones: `cd frontend && npx tsc --noEmit`; tras cambios relevantes probar con Invoke-RestMethod contra la API.

## Qué falta (siguiente plan)
1. Commit local del bloque vendedor público (endpoint + página + enlace + prototipos borrados + docs) y push conjunto de los 5 commits.
2. Responsive móvil al probar en teléfono.
3. Deploy Cloudflare Pages al final + dominio en el OAuth client de Google; redeploy Render (favoritos, `PATCH /auth/me`, `/admin/resumen`, tiles+orden feed, fix reparto, `/vendedores/publico/:userId`). **Antes del push: restaurar `.env.local` a `NEXT_PUBLIC_API_URL=https://moa-api-8y3i.onrender.com`**.