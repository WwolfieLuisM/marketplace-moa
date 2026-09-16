# API — Marketplace Moa (backend)

Base URL de producción: `https://moa-api-8y3i.onrender.com`.
Formato JSON. Errores: `{ "error": "mensaje" }` con el status HTTP.

## Autenticación

- **Access token (15 min)**: se envía como `Authorization: Bearer <token>`
  **o** como cookie `access_token` (path por defecto `/`). El payload es
  `{ sub: userId, rol }` firmado con `JWT_SECRET`.
- **Refresh token (30 días)**: cookie `refresh_token`, `httpOnly`, `secure`
  en prod, `sameSite=none` en prod, `path=/auth`. El refresh solo funciona
  `POST /auth/refresh` con esa cookie.
- Middleware del backend: `requireAuth` (valida el token, inyecta `req.user`)
  y `requireRoles(...)` (comprueba `req.user.rol`). 401 = no autenticado,
  403 = sin permiso.

## Módulo Auth — `/auth`

### `POST /auth/register` — público
Body: `{ nombre, apellidos, email, telefono?, password, reparto? }`
Respuesta `201`: `{ accessToken, user, refreshCookie }`
`user`: `{ id, nombre, apellidos, email, telefono, reparto, rol, authProvider, activo }`
Errores: `400` faltan campos · `409` ya existe ese email o teléfono.
Rol creado: `usuario`, `authProvider: "local"`.

### `POST /auth/login` — público
Body: `{ cuenta, password }` (`cuenta` = **email o teléfono**).
Respuesta `200`: `{ accessToken, user }` + cookie refresh.
Errores: `401` credenciales inválidas · `403` cuenta desactivada.

### `POST /auth/google` — público
Body: `{ idToken }` (credencial de **Google Identity Services**).
El backend verifica el idToken contra `GOOGLE_CLIENT_ID`; si el email no existe
crea la cuenta (`authProvider: "google"`).
Respuesta `200`: `{ accessToken, user }` + cookie refresh.
Errores: `501` Google OAuth no configurado · `400` Google no devolvió email ·
`403` cuenta desactivada.

### `POST /auth/refresh` — usa la cookie `refresh_token`
Body: `{}`. Renueva el par y re-emite la cookie.
Respuesta `200`: `{ accessToken, user }`.
Errores: `401` sin token / token inválido / usuario inexistente.

### `POST /auth/logout` — público
Limpia la cookie de refresh. Respuesta `204` (sin cuerpo).

### `GET /auth/me` — usuario logueado
Respuesta `200`: `{ user }`. Errores: `401`, `404`.

### `PATCH /auth/me` — usuario logueado
Body: `{ nombre, apellidos, telefono?, reparto? }` (solo estos campos son
editables; email y contraseña nunca por aquí).
Respuesta `200`: `{ user }`. Errores: `400` faltan nombre/apellidos ·
`409` teléfono ya en uso.

## Módulo Vendedores — `/vendedores`

Perfil: `estadoLicencia ∈ {pendiente, aprobado, rechazado}`
Suscripción: `estadoSuscripcion ∈ {demo, activo, exento, vencido}`
`tipo ∈ {individual, tcp, empresa_estatal}`.

### `POST /vendedores/solicitud` — usuario logueado
Body: `{ tipo, nombre, apellidos, numeroCi, reparto?, nombreNegocio?, categoriaNegocio?, horarioAtencion?, direccionFisica? }`
Crea perfil (licencia `pendiente`, suscripción `demo`) y guarda el CI en
`VerificacionIdentidad`.
Respuesta `201`: `{ perfil }`. Errores: `400` datos inválidos ·
`409` ya tienes perfil de vendedor.

### `GET /vendedores/me` — usuario logueado
Respuesta `200`: `{ perfil }` (incluye contadores demo y fechas).
Error `404` sin perfil de vendedor.

### `GET /vendedores/me/publicaciones` — usuario logueado
Respuesta `200`: `{ publicaciones }` (con `productos[].fotos[].url`).
Error `404` sin perfil.

### `GET /vendedores/publico/:userId` — público
Valida que `userId` sea UUID; solo perfiles con licencia `aprobado`.
Respuesta `200`: `{ perfil: { datos visibles, zonas }, publicaciones }`.
Error `404` vendedor no encontrado / no aprobado.

### `GET /vendedores` — admin
Query (opcionales): `estadoLicencia`, `estadoSuscripcion`.
Respuesta `200`: `{ perfiles }` (cada perfil incluye `user` con email, teléfono,
reparto, rol, activo, creadoEn y `verificacionIdentidad`).

### `GET /vendedores/:id` — admin
Respuesta `200`: `{ perfil }`. Error `404`.

### `POST /vendedores/:id/aprobar` — admin
Body: `{ moda: "demo" | "exento" }`.
- `exento`: licencia `aprobado`, suscripción `exento`, sin fechas de demo.
- `demo`: licencia `aprobado`, suscripción `demo`, `demoIniciaEn` = ahora,
  `demoTerminaEn` = +2 días, contadores a 0.
Respuesta `200`: `{ perfil }`.

### `POST /vendedores/:id/rechazar` — admin
Pone licencia `rechazado`. Respuesta `200`: `{ perfil }`.

## Módulo Publicaciones — `/publicaciones`

Reglas:
- 1–3 productos por publicación (`MAX_PRODUCTOS_POR_PUBLICACION = 3`).
- Máx 3 fotos por producto, base64 `data:image/(png|jpe?g|webp);base64,`.
- Pueden publicar perfiles con licencia `aprobado` y suscripción
  `demo | activo | exento`. Plan demo: máx 5 productos/día y 10 en total.
- Estados de publicación: `activo | pausado | eliminado`.
- Estados de producto: `activo | pausado | eliminado | vendido`.

### `POST /publicaciones` — vendedor aprobado
Body: `{ titulo, reparto, conDomicilio?, telefonoFijo?, telefonoMovil?, productos: [{ nombre, descripcion, precio, cantidad, categoriaId, fotos?[] }] }`
Foto: `data:image/{png|jpg|webp};base64,...` (hasta 3). `categoriaId` debe
existir en `GET /feed/categorias`.
Respuesta `201`: `{ publicacion }`.
Errores: `403` licencia/suscripción no vigente · `400` validaciones
(campos, precio > 0, cantidad entera ≥ 0, categoría inválida, límites demo).

### `GET /publicaciones/:id` — público
Solo publicaciones `activo` de vendedores publicables.
Respuesta `200`: `{ publicacion }` (con `vendedor.user`, `zonas`,
`productos[].fotos[].url`, categorías). Error `404`.

### `PATCH /publicaciones/:publicacionId/productos/:productoId` — dueño o admin
Body: `{ estado: "vendido" | "pausado" | "activo" }`
Respuesta `200`: `{ producto }`. Errores: `400` estado inválido ·
`404` publicación/producto no encontrado · `403` no es el dueño ni admin.

### `DELETE /publicaciones/:id` — dueño o admin
Soft delete: productos → `eliminado`, publicación → `eliminado`.
Respuesta `200`: `{ publicacion }`. Errores: `404`, `403`.

## Módulo Feed — `/feed`

Paginación: `?page=1`, 20 ítems por página.
Ranking por defecto (`orden=relevancia`):
`score = 0.5·factorSuscripcion + 0.35·factorRecencia + 0.15·factorReparto`
- suscripción: activo/exento=1.0, demo=0.6, vencido-en-gracia=0.2
- recencia: `1 / (1 + horasDesdePublicación/24)`
- reparto: mismo del usuario=1.0, otro=0.3 (0.6 si no hay reparto de usuario)

### `GET /feed/` — público (token opcional)
Query: `reparto` (filtro), `categoria` (id), `orden`
(`relevancia | recientes | menor_precio | mayor_precio`), `page`.
Si viene `Bearer`, usa el `reparto` del usuario para el factor de reparto.
Respuesta `200`: `{ feed: [{ ...publicacion, productos: [...fotos.url] }], page }`.

### `GET /feed/productos` — público
Query: `q` (obligatorio, búsqueda por nombre/descripción con `pg_trgm`), `page`.
Respuesta `200`: `{ productos: [{ ...producto, score, fotos.url }], page }`.
Error `400` falta `q`.

### `GET /feed/categorias` — público
Respuesta `200`: `{ categorias: [{ id, nombre }] }`.

## Módulo Mensajes — `/mensajes`

### `POST /mensajes` — usuario logueado
Body: `{ destinatarioId, productoId?, contenido }`
`contenido` máx 5000 caracteres. `productoId` opcional pero si se manda debe
existir, no estar `eliminado` y pertenecer a remitente o destinatario.
Crea además una `Notificacion` tipo `nuevo_mensaje` y dispara push FCM
(best-effort, no bloquea el envío).
Respuesta `201`: `{ mensaje: { ..., producto: { id, nombre } } }`.
Errores: `400` a ti mismo / vacío / demasiado largo / producto no participante ·
`404` destinatario o producto no existen.

### `GET /mensajes/conversaciones` — usuario logueado
Agrupa por el otro usuario (una por contacto), con último mensaje y no-leídos.
Respuesta `200`: `{ conversaciones: [{ otroUsuarioId, otroUsuario, ultimoMensaje, noLeidos }] }`.

### `GET /mensajes/no-leidos` — usuario logueado
Respuesta `200`: `{ noLeidos }` (total de mensajes recibidos sin leer).

### `GET /mensajes/conversaciones/:otroUserId` — usuario logueado
Marca como leídos los mensajes recibidos de ese usuario.
Respuesta `200`: `{ conversacion: { otroUsuario: { id, nombre, apellidos }, mensajes: [...] } }`.
Errores: `400` chat contigo mismo · `404` otro usuario no existe.

## Módulo Favoritos — `/favoritos`

### `GET /favoritos/ids` — usuario logueado
Respuesta `200`: `{ ids: [productoId, ...] }` (para pintar corazones).

### `GET /favoritos/` — usuario logueado
Solo productos `activo`. Respuesta `200`:
`{ productos: [{ ...producto, favoritoId, favoritoCreadoEn, fotos: [{..., url}] }] }`.

### `POST /favoritos/` — usuario logueado
Body: `{ productoId }`. Upsert (idempotente).
Respuesta `201`: `{ favorito }`. Errores: `400` falta producto · `404` producto inexistente.

### `DELETE /favoritos/:productoId` — usuario logueado
Respuesta `200`: `{ ok: true }`.

## Módulo Notificaciones — `/notificaciones`

### `POST /notificaciones/device-tokens` — usuario logueado
Body: `{ fcmToken, plataforma? }` (default `"web"`). *Idempotente*.
Respuesta `201`: `{ dispositivo }`. Error `400` falta token.

### `DELETE /notificaciones/device-tokens` — usuario logueado
Body: `{ fcmToken }`. Respuesta `200`: `{ eliminados }`.

### `GET /notificaciones/` — usuario logueado
Query: `page` (20 por página). Respuesta `200`:
`{ notificaciones, total, noLeidas }`.

### `GET /notificaciones/no-leidas` — usuario logueado
Respuesta `200`: `{ noLeidas }`.

### `PATCH /notificaciones/marcar-todas-leidas` — usuario logueado
Respuesta `200`: `{ actualizadas }`.

### `PATCH /notificaciones/:notificacionId/leida` — usuario logueado
Respuesta `200`: `{ notificacion }`. Error `404` (de ese usuario).

## Módulo Admin — `/admin`

### `GET /admin/resumen` — admin
Respuesta `200`:
`{ resumen: { usuarios, vendedores, vendedoresPendientes, licenciasActivas, publicaciones, productos, mensajes, favoritos, reportes } }`
(todos contadores).

## Módulo Jobs — `/admin/jobs`

### `POST /admin/jobs/revisar-suscripciones` — protege con `X-Job-Key`
Header requerido: `X-Job-Key: <JOB_SECRET_KEY>`.
Reglas (cada 7 días = `SIETE_DIAS`):
1. Suscripción `demo` con `demoTerminaEn` pasado → `vencido` + pausa sus
   publicaciones/productos activos.
2. Suscripción `activo` con `suscripcionVenceEn` pasado → `vencido` + pausa.
3. `vencido` con `fechaVencido < ahora - 7 días` → elimina (soft) publicaciones
   y productos (gracia agotada).
4. Resetea `productosHoy = 0` (contador diario demo) para todos con contador > 0.
Respuesta `200`:
`{ ok: true, resultado: { demosVencidos, activosVencidos, eliminadosPorGracia, contadoresReseteados } }`
Error `401` sin `X-Job-Key` válida.

## Notas

- Las fotos de Cloudinary se sirven como `url` calculada (`urlFoto`), no como
  public_id en las respuestas del feed/detalles.
- El job diario lo dispara GitHub Actions
  (`.github/workflows/revisar-suscripciones.yml`) con `X-Job-Key`.
- Límite de tamaño de body JSON: `15mb` (subida de fotos en base64).