# Auditoría backend — Marketplace Moa (Express 5 + Prisma + Neon, Render free)

Fecha: 2026-10-28. Alcance: `backend/src` completo (app, middleware, lib, todos los módulos), `prisma/schema.prisma` y migración init. Producción real, carga de decenas de usuarios.

## Verificado OK (sin hallazgo)

- JWT: access 15m / refresh 30d con secretos de entorno (`JWT_SECRET`, `REFRESH_TOKEN_SECRET`), `jwt.verify` completo (firma + exp) en `middleware/auth.js:17` y en el refresh (`auth.service.js:148`). Sin secretos hardcodeados en el backend; `GOOGLE_CLIENT_ID` viene de env y se valida como audience.
- Cookies refresh: `httpOnly`, `path="/auth"`, secure/sameSite según entorno (`auth.routes.js:15-32`).
- IDOR: rutas con recurso ajeno verifican propiedad: `marcarProducto`/`softDelete` (dueño o admin, `publicaciones.service.js:230-233,251-253`), `marcarLeida` filtra por `userId`, favoritos y mensajes siempre scoped al usuario, y `hilo` solo devuelve hilos donde el caller es participante.
- `$queryRawUnsafe` del feed (`feed.service.js:23`): los van values van por placeholders `$1..$5` y el `ORDER BY` solo interpola claves del whitelist `ORDER_SQL` (ver hallazgo 9 por el borde roto).
- bcrypt a 10 rounds; validación de contraseña razonable (`auth/password.js`).
- Jobs protegidos por `X-Job-Key` con comparación estricta y 401 si la clave no está definida (`jobs.routes.js:6-12`).

---

## MUST FIX

### 1. Fotos subidas a Cloudinary dentro de la transacción Prisma (timeout 5 s + huérfanos)
`backend/src/modules/publicaciones/publicaciones.service.js:139-171` (subida en línea 166).

- **Qué es**: `crear()` abre una transacción interactiva `$transaction(async tx => ...)` y dentro del bucle llama `subirFoto()` (HTTP a Cloudinary) por cada foto, con hasta 3 productos × 3 fotos = 9 subidas.
- **Problema concreto**: la transacción interactiva de Prisma tiene timeout por defecto de 5000 ms. Un vendedor crea una publicación con 3 productos × 3 fotos (~300-800 KB c/u en base64) sobre conexión lenta en Cuba: la 4ª o 5ª subida supera los 5 s → Prisma aborta (P2028) → la API responde 500, la publicación no existe, pero las fotos 1-4 **ya quedaron subidas a Cloudinary** (huérfanos que consumen cuota gratis). Además se mantiene una transacción abierta de Neon durante subidas externas, y el pool free de Neon es mínimo: con 2-3 publicaciones simultáneas se satura el pool.
- **Fix mínimo**: subir todas las fotos a Cloudinary **antes** de abrir la transacción (con `Promise.all` limitado), y dentro del `tx` solo insertar `publicacion`, `producto` y `productoFoto` con los `public_id` ya obtenidos. Si la transacción falla, borrar lo subido en un catch best-effort.
- **Si se ignora**: publicaciones con fotos fallan de forma intermitente en producción (peor con 9 fotos), el vendedor pierde el trabajo, y se acumulan imágenes huérfanas en Cloudinary.

### 2. Teléfono sin índice único y usado como identificador de login → cuentas duplicadas y bloqueo
`backend/prisma/schema.prisma:21` (`telefono String?` sin `@unique`), `backend/src/modules/auth/auth.service.js:55-60` (check-then-create), `:85-87` (login por teléfono), `:177-187` (check-then-write al actualizar).

- **Qué es**: el login acepta teléfono como cuenta (`OR: [{email}, {telefono}]`), pero no hay constraint único en `users.telefono` ni en la migración (`migration.sql` solo indexa email). La unicidad se "garantiza" con find-then-create.
- **Problema concreto**: (a) dos registros simultáneos con el mismo teléfono pasan ambos el check y se crean las dos cuentas; (b) luego `login({cuenta: "5xxxxxxx"})` usa `findFirst` → devuelve una de las dos al azar: el usuario legítimo escribe su teléfono y su contraseña correcta y recibe "Credenciales inválidas" (o entra a la cuenta equivocada si coincide el password). El atacante puede además "reservar" el teléfono de una víctima para interferir su login. `actualizarUsuario` tiene la misma carrera.
- **Fix mínimo**: migración `CREATE UNIQUE INDEX ... ON users(telefono) WHERE telefono IS NOT NULL` (+ `@unique` en el schema), y en `register`/`actualizarUsuario` catch de P2002 traducido a 409.
- **Si se ignora**: usuarios reales sin poder entrar con su teléfono y soporte imposible de diagnosticar; el daño crece con cada registro concurrente.

### 3. Un vendedor rechazado por el admin sigue visible en el feed y en el detalle público
`backend/src/modules/vendedores/vendedor.service.js:170-179` (rechazar no toca `estadoSuscripcion`), `backend/src/modules/feed/feed.service.js:41`, `backend/src/modules/publicaciones/publicaciones.service.js:196` (filtros solo por `estado_suscripcion`).

- **Qué es**: el feed y `detallePublico` filtran por `vp.estado_suscripcion IN ('demo','activo','exento')`, pero la visibilidad pública real depende de `estadoLicencia = 'aprobado'`. `rechazar()` pone `estadoLicencia: "rechazado"` y deja `estadoSuscripcion` en `"demo"` (el default del schema).
- **Problema concreto**: vendedor A es aprobado y publica; el admin lo rechaza tras una denuncia. `rechazar` solo cambia la licencia → `estado_suscripcion` sigue en "demo" → sus publicaciones siguen apareciendo en `GET /feed` y `GET /publicaciones/:id` para todo el mundo. El "baneo" no banea nada.
- **Fix mínimo**: añadir `vp.estado_licencia = 'aprobado'` al WHERE del raw del feed y al filtro de `detallePublico` (2 líneas), o que `rechazar` ponga `estadoSuscripcion` fuera de la lista publicable (p. ej. `"vencido"`).
- **Si se ignora**: el botón de rechazo no cumple su función de moderación; contenido de un vendedor sancionado sigue público indefinidamente.

### 4. `errorHandler` devuelve `err.message` en errores 500 → filtra internals de Prisma/SQL
`backend/src/middleware/errorHandler.js:5-10`.

- **Qué es**: cualquier error sin `status` responde `{ error: err.message }` con 500, incluidos los de Prisma y del driver.
- **Problema concreto**: `GET /feed?orden=toString` (hallazgo 9) produce un error de sintaxis SQL cuya respuesta incluye parte del SQL crudo; un ID inválido produce "The provided value ... is not a valid UUID" (P2023); un email duplicado en carrera produce "Unique constraint failed on the fields: (`email`)" (P2002). Un atacante aprende esquema de tablas/columnas y detecta emails registrados solo con respuestas.
- **Fix mínimo**: en producción, 500 → mensaje genérico ("Error interno del servidor") + log; respetar solo `err.message` cuando `err.status` está explícitamente seteado (como ya hacen los servicios).
- **Si se ignora**: fuga continua de información interna que además alimenta enumeración de usuarios y ayuda a construir ataques.

### 5. `/mensajes` sin límite de escritura: spam masivo de mensajes + notificaciones + push FCM
`backend/src/modules/mensajes/mensajes.routes.js:7-14`, `backend/src/modules/mensajes/mensajes.service.js:63-84`.

- **Qué es**: `POST /mensajes` autenticado no tiene rate limit ni por IP ni por usuario (el rate limit pendiente de `pendientes.md` es solo para `/auth`). Cada mensaje crea una fila en `notificaciones` (línea 67) y dispara push FCM al destinatario (línea 80).
- **Problema concreto**: una cuenta maliciada hace un loop de 10 000 POST a `/mensajes` contra un usuario: 10 000 filas en `mensajes` + 10 000 en `notificaciones` + 10 000 pushes FCM → el destinatario queda inutilizable (notificaciones y batería), la tabla crece y se acerca a la cuota de FCM/Neon. Sin dependencia nueva (npm está bloqueado según pendientes): contador en memoria por `userId` en el servicio (una sola instancia en Render free, basta), p. ej. rechazar con 429 tras 20 mensajes/min.
- **Si se ignora**: un solo usuario con malicia degrada la base de datos y el servicio de push de todos, sin costo para él.

---

## SHOULD FIX

### 6. El índice pg_trgm que usa la búsqueda no existe en ninguna migración del repo
`backend/src/modules/feed/feed.service.js:99-112` (comentario "trigramas con el índice GIN"), `backend/prisma/migrations/` (solo existe la init, sin índice GIN), `backend/prisma/schema.prisma:158-159` (admite que falta).

- **Qué es**: `buscar()` ordena por `similarity(...)` y filtra `ILIKE '%term%'`, planificado asumiendo un índice GIN de trigramas, pero el repo no lo crea.
- **Problema concreto**: verificar contra Neon de producción que el índice exista (puede haberse creado a mano); si no está, `GET /feed/productos?q=arroz` hace seq scan + cálculo de similarity sobre **todos** los productos activos en cada búsqueda. Hoy con cientos de productos pasa; con decenas de miles, cada search cuesta cientos de ms sobre el único CPU del plan free.
- **Fix mínimo**: migración `CREATE INDEX idx_productos_trgm ON productos USING gin ((nombre gin_trgm_ops), (descripcion gin_trgm_ops));` (confirmar primero en prod para no duplicar).
- **Si se ignora**: la búsqueda se degrada linealmente con el crecimiento del catálogo, en el endpoint más usado por compradores.

### 7. `page` no numérico → `OFFSET NaN` → 500 con error de Prisma
`backend/src/modules/feed/feed.service.js:18,97`, `backend/src/modules/notificaciones/notificaciones.service.js:81`.

- **Qué es**: `const offset = (Math.max(1, Number(page)) - 1) * PAGE_SIZE` no descarta NaN (`Math.max(1, NaN)` es NaN).
- **Problema concreto**: `GET /feed?page=abc` o `GET /notificaciones?page=x` → Prisma recibe `OFFSET NaN` / `skip: NaN` → error de conversión → 500 (con el mensaje interno filtrado por el hallazgo 4). El frontend con un query string corrupto o un link mal formado provoca errores 500 innecesarios.
- **Fix mínimo**: `const pageNum = Math.max(1, Number(page) || 1);` en los tres puntos.
- **Si se ignora**: cualquier usuario con un link raro genera 500s que ensucian los logs y la monitoring.

### 8. IDs UUID de entrada sin validar → 500 (P2023) en vez de 400/404
Ejemplos: `backend/src/modules/mensajes/mensajes.service.js:33,128`, `backend/src/modules/favoritos/favoritos.service.js:46,64`, `backend/src/modules/notificaciones/notificaciones.service.js:96`, `backend/src/modules/publicaciones/publicaciones.service.js:223,244`.

- **Qué es**: los params path/body (`destinatarioId`, `productoId`, `otroUserId`, `notificacionId`, `publicacionId`) pasan directo a Prisma; un valor no-UUID lanza P2023.
- **Problema concreto**: `PATCH /notificaciones/abc/leida`, `DELETE /favoritos/no-uuid`, `GET /mensajes/conversaciones/hola` → 500 con mensaje interno, cuando deberían ser 400/404. Degrada la API y repite el leak del hallazgo 4.
- **Fix mínimo**: reusar el `UUID_RE` que ya existe en `vendedor.service.js:234` en cada entrada (o un mini-middleware) → 404/400.
- **Si se ignora**: 500s masivos por clientes maliciosos o buggy, sin aportar información al usuario.

### 9. `ORDER_SQL[orden]` con claves heredadas de Object → SQL inválido → 500
`backend/src/modules/feed/feed.service.js:21` y `:47`.

- **Qué es**: `ORDER_SQL[orden] ? orden : "relevancia"` es truthy para claves del prototipo (`__proto__`, `constructor`, `toString`), y luego `ORDER BY ${ORDER_SQL[ordenKey]}` interpola la función de Object → SQL con "function Object() { [native code] }".
- **Problema concreto**: `GET /feed?orden=__proto__` → error de sintaxis SQL → 500 (y el SQL parcial se filtra vía hallazgo 4). No es inyección (solo se alcanza el Object.prototype), pero es un 500 trivial de provocar.
- **Fix mínimo**: `const ordenKey = Object.hasOwn(ORDER_SQL, orden) ? orden : "relevancia";` (o un `Set` de claves permitidas).
- **Si se ignora**: endpoint público con DoS trivial de errores 500 y ruido en logs.

### 10. `notificaciones` sin purga ni índice; `device_tokens` sin unique → tokens duplicados y push dobles
`backend/prisma/schema.prisma:204-229` (sin `@@index` ni `@@unique`), `backend/src/modules/notificaciones/notificaciones.service.js:54-68` (check-then-create), `:79-93` (counts completos).

- **Qué es**: (a) cada mensaje crea una notificación que **nunca se borra** y `noLeidas`/`listar` hacen `count` sin índice en `user_id`; (b) `registrarDispositivo` hace find-then-create sin unique en `(userId, fcmToken)`.
- **Problema concreto**: dos pestañas registran el token FCM en la misma décima de segunda → dos filas → la siguiente notificación dispara `sendEachForMulticast` con el token dos veces → el usuario recibe **cada mensaje dos veces**. Y la tabla `notificaciones` crece sin límite: los counts del poll de `/no-leidas` pasan de ms a scan conforme pase el tiempo.
- **Fix mínimo**: `@@unique([userId, fcmToken])` (+ catch P2002 → devolver el existente), `@@index([userId])` en Notificacion, y purga de notificaciones leídas > 30 días dentro del job existente (`jobs.service.js` ya borra tokens de recuperación).
- **Si se ignora**: notificaciones duplicadas visibles para el usuario y tablas que crecen sin límite en Neon.

---

## NICE TO HAVE

### 11. Contador demo queda inoperante al reactivarse: columna DATE (UTC) vs día de Cuba
`backend/src/modules/publicaciones/publicaciones.service.js:22-36`, `backend/prisma/schema.prisma:87` (`ultimoResetContador @db.Date`), `backend/src/modules/jobs/jobs.service.js:106-109`.

- **Qué es**: `claveDiaCuba(new Date(perfil.ultimoResetContador))` interpreta la DATE leída (medianoche **UTC**) en horario de La Habana (UTC-4/-5) → siempre cae al día **anterior**.
- **Problema concreto** (al descomentar `validarContadoresDemo`): guarda reset el 28/10 → lo relee como `28/10 00:00Z` → formateado en Havana = `27/10` ≠ hoy → `claveGuardada !== claveHoy` siempre → el contador se reinicia a 0 en cada publicación → el límite de 5 productos/día demo no aplica nunca.
- **Fix mínimo**: guardar `ultimoResetContador` como string `YYYY-MM-DD` (o comparar la fecha UTC sin pasar por Havana).
- **Si se ignora**: cuando el PO reactive los límites demo, no limitarán nada y nadie lo notará hasta que se audite la facturación.

### 12. `register`: carrera email → P2002 responde 500 en vez de 409
`backend/src/modules/auth/auth.service.js:55-74`.

- **Qué es**: el check de unicidad es find-then-create; el `@unique` de email es la garantía real, y su violación lanza P2002 sin traducir.
- **Problema concreto**: dos POST simultáneos de `registro@x.cu` → el segundo recibe 500 "Unique constraint failed..." (y leak, hallazgo 4) en vez del 409 limpio del check previo.
- **Fix mínimo**: catch de `e.code === "P2002"` → 409 "Ya existe una cuenta con ese email".
- **Si se ignora**: edge case de doble-submit con respuesta 500 fea y filtradora.

### 13. Feed re-verifica el JWT y consulta la base en cada request (auth duplicada)
`backend/src/modules/feed/feed.routes.js:16-28`.

- **Qué es**: `leerRepartoUsuario` reimplementa la lectura del token y hace `user.findUnique` adicional por request aunque `requireAuth` ya haya validado el token.
- **Problema concreto**: `GET /feed` autenticado = 2 verificaciones JWT + 1 query extra a Neon por visita (el endpoint más pegado por el frontend). En free tier ese round-trip extra se paga en cada scroll.
- **Fix mínimo**: middleware ligero `cargarReparto` que reutilice `req.user` (ya seteado cuando hay token) y solo consulte el reparto cuando exista `req.user`.
- **Si se ignora**: trabajo repetido por request en el endpoint de mayor tráfico.

### 14. Rol admin stale en el JWT hasta 15 minutos tras degradar al admin
`backend/src/modules/middleware`/`backend/src/middleware/auth.js:24-34`.

- **Qué es**: `requireRoles("admin")` confía en `req.user.rol` embebido en el token.
- **Problema concreto**: se degrada un admin (o se cambia su rol a "usuario"); durante hasta 15 min sus endpoints `/admin/*` y `/vendedores/:id/aprobar` siguen aceptando acciones con su token viejo.
- **Fix mínimo**: aceptable a esta escala; si se quiere cerrar, un `select rol` en `requireRoles` (una query por request admin, son pocas).
- **Si se ignora**: ventana corta y acotada de acceso residual tras revocar un admin.

### 15. Login con oráculo de timing para enumerar emails registrados
`backend/src/modules/auth/auth.service.js:88-94`.

- **Qué es**: si el usuario no existe, la respuesta sale sin hacer `bcrypt.compare` (~100 ms menos).
- **Problema concreto**: midiendo tiempos de `POST /auth/login`, se separa "usuario no existe" de "contraseña incorrecta" → lista de emails/registrados, combinable con el 409 de `register` (que ya confirma teléfono/email existentes).
- **Fix mínimo**: `await bcrypt.compare(password, "$2a$10$C6UzMDM.H6dfI/f/IKcEeO7l1p1p1p1p...")` (hash ficticio) cuando el usuario no exista.
- **Si se ignora**: enumeración de usuarios barata; bajo, pero gratis de cerrar.

### 16. `solicitar`: la CI se guarda fuera de la transacción → perfil bloqueado sin identidad
`backend/src/modules/vendedores/vendedor.service.js:62-89`.

- **Qué es**: el `upsert` de `verificacionIdentidad` (línea 85) corre después del `$transaction` que crea el perfil.
- **Problema concreto**: si el upsert falla (timeout del pool, restart del proceso), queda el perfil sin CI; el reintento de `/vendedores/solicitud` responde 409 "Ya tienes un perfil de vendedor" → ese vendedor **nunca** puede registrar su CI y el admin no tiene número que verificar en `listarAdmin`.
- **Fix mínimo**: mover el upsert dentro del `$transaction`.
- **Si se ignora**: un fallo transitorio deja un vendedor con flujo de verificación tullido para siempre.

---

## Ya conocidos (docs/pendientes.md) — solo registro, sin detallar

Rate limit en `/auth` (#1), CORS aceptando requests sin Origin (#2), `conversaciones()` cargando todos los mensajes (#3), helpers de URL de fotos duplicados (#4), subqueries de precio en ORDER BY (#5), enums Prisma pendientes (#6), refresh tokens stateless sin invalidación en logout (#7), DNS lookup del mailer al importar (#8), favoritos huérfanos (#9), JSON global de 15 MB (#10), huérfanos manuales en Cloudinary (#11). Además: mailer Gmail bloqueado desde Render (decisión PO, no es bug).

## Verdict:

Backend pequeño con cimientos de seguridad sólidos (JWT, ownership checks, parametrización SQL), pero con 5 aristas que hoy cuestan dinero/datos: uploads Cloudinary dentro de la transacción, teléfono sin unique como login, moderación que no oculta contenido, 500s filtr internals de Prisma y spam ilimitado en /mensajes.

## Not checked:

- `backend/scripts/` (E2E manuales) y el frontend — fuera de alcance.
- Estado real de la DB de producción en Neon: si el índice pg_trgm existe creado a mano, migraciones aplicadas fuera del repo (pendientes menciona cambios vía Neon Data API) y datos actuales de `users.telefono` duplicados (el fix #2 requiere limpiar duplicados antes del unique).
- Valores reales de env vars de Render y configuración de deploy (no hay render.yaml en lo leído).
- Cuotas/reales de Cloudinary y FCM, `npm audit` (2 moderates mencionados en pendientes), comportamiento bajo carga (no se ejecutó nada).
- Comportamiento en DST cubano del cron `0 5 * * *` (ya documentado en pendientes).

