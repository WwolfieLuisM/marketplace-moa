# Pendientes — Marketplace Moa

Estado de referencia: `main` en `ff41ae2` (2026-09-21). Este documento agrupa todo
lo que quedó a medias o en backlog, con el **por qué**, **dónde** está el código
y **cómo** retomarlo. Los cambios en producción se hacen SIEMPRE desde el clone de
deploy (`%TEMP%\opencode\moa-deploy2`) → commit → push a `main` → redeploy en
Render (backend) / CI de Cloudflare (frontend).

## Ya aplicado (no repetir)

| Commit | Qué |
|--------|-----|
| `66820e2` | Firma de Cloudinary sin `transformation` (fix "Invalid Signature") |
| `95624b4` | Eliminado export duplicado `correoConfigurado` en `mailer.js` (SyntaxError de arranque en Render) |
| `879ed1e` | Google login: script GSI en `registro.html` + botón estándar de Google en el panel (`ui.js` `montarGooglePanel`, adiós `g.prompt()`) |
| `ff41ae2` | Contador de demo alineado al día de Cuba (`America/Havana`), batching y purga de tokens en `jobs.service.js`, validación de `categoria` en feed, claves débiles ampliadas, `backend/.env.example`, cron de suscripciones a `0 5 * * *` |

## Pendientes de seguridad

### 1. Rate limiting en `/auth` (bloqueado por red, no instalado)
- **Problema**: `/auth/login`, `/register`, `/google`, `/olvide-password` y
  `/restablecer-password` aceptan intentos ilimitados (fuerza bruta y spam de
  correos de recuperación).
- **Dónde**: `backend/src/modules/auth/auth.routes.js` (router). No existe la dep
  `express-rate-limit` en `backend/package.json`.
- **Cómo**: `npm install express-rate-limit` (networkblocked en este entorno);
  añadir `rateLimit({ windowMs: 5*60*1000, limit: 10, ... })` en login/google y
  algo más estricto (5/15 min) en `olvide-password`. Mensaje 429 en español.
  `express-rate-limit@^8` es compatible con Express 5 (el backend usa `^5.2.1`).
- Rendir cuenta también del aviso `npm audit` del deploy (2 moderate): revisar
  cuando haya acceso al registry.

### 2. CORS sin header Origin (#6)
- **Problema**: `backend/src/app.js:26` acepta peticiones sin `Origin`
  (Postman/curl/server-to-server). Es intencional, pero deja los endpoints de
  admin/jobs expuestos a requests directas. Con `credentials: true` el browser
  no pasa nada, así que el riesgo es para llamadas no-browser.
- **Opción barata**: loguear el `origin`/`User-Agent` en cada request rechazada
  o request sin origin, para detectar abuso.

## Pendientes de rendimiento (refactores sin impacto funcional)

### 3. `conversaciones()` carga TODOS los mensajes (#19)
- **Problema**: `backend/src/modules/mensajes/mensajes.service.js:89` trae cada
  mensaje del usuario para agrupar conversaciones por "otro usuario" en memoria.
  Con decenas de miles de mensajes se degrada.
- **Clave**: query con `DISTINCT ON (otro usuario)` / subquery para quedarse con
  el **último mensaje por par** (Postgres), y un `COUNT`/SUM aparte para
  `noLeidos` por par.

### 4. Transformación de URLs duplicada (#11)
- **Problema**: `productosConFotosUrl` (`feed.routes.js:9`) y
  `publicacionConFotosUrl` (`publicaciones.routes.js`) repiten la misma lógica
  (`urlFoto(f.cloudinaryPublicId)`).
- **Clave**: un solo helper en `backend/src/lib/cloudinary.js` y usarlo en ambos
  routers.

### 5. Orden por precio con subqueries correlacionadas (#5)
- **Problema**: `backend/src/modules/feed/feed.service.js:10` (`ORDER_SQL`)
  calcula MIN/MAX(precio) por publicación dentro del `ORDER BY`; se evalúa para
  todas las publicaciones activas (no solo la página).
- **Clave**: incluir `MIN(pr.precio)`/`MAX(pr.precio)` en el `SELECT` del raw
  query y ordenar con esa columna (con su índice).

## Pendientes de modelo de datos

### 6. Enums nativos en Prisma (#21)
- **Problema**: `rol`, `estadoLicencia`, `estadoSuscripcion`, `estado` son
  `String` con valores documentados en comentarios (`backend/prisma/schema.prisma`).
- **Clave**: migrar a `enum` de PostgreSQL. OJO: requiere migración real contra
  Neon de producción → coordinar antes con el product owner (el schema tiene una
  nota de revisión previa).

### 7. Refresh tokens stateless (#9)
- **Problema**: los refresh son JWT firmados, no hay tabla; `logout` solo limpia
  la cookie (`auth.routes.js:90`). Un token capturado sigue vivo hasta 30 días.
- **Opción**: denylist/jti en DB si se quiere invalidación real. Para un
  marketplace local puede no merecer la pena.

## Pendientes menores / higiene

### 8. Mailer: DNS lookup al importar (#2)
- `backend/src/lib/mailer.js:11` resuelve `smtp.gmail.com` a nivel de módulo.
  Hoy funciona en Render (log `[mailer] smtp.gmail.com -> IPv4 ...`). Si el DNS
  fallara, bloquearía el arranque. Opción: lazy-init dentro de
  `enviarCorreoRecuperacion`.

### 9. Favoritos huérfanos (#18)
- El soft-delete de productos/publicaciones no borra `Favorito`. No se muestran
  (filtro por `estado: "activo"` en `favoritos.service.js`), pero las filas
  quedan. Limpieza opcional en `jobs.service.js`.

### 10. Límite JSON global de 15MB (#14)
- `backend/src/app.js:35` aplica `express.json({ limit: "15mb" })` a todo.
  Alternativa: límite pequeño global y 15MB solo en las rutas que suben fotos
  (`/publicaciones`).

### 11. Huérfanas en Cloudinary (acción manual)
- Imágenes de prueba en la cuenta `xxz6yrvo`, carpeta `marketplace-moa/productos/`,
  para borrar desde Media Library:
  - `xzcyxyja0eodn6qazpkd` (foto real del E2E de publicación que dio 200)
  - `rblbymtgam2y70axtfku` (línea local)
  - \+ 1 sin public_id registrado, de la publicación `e6caba83`.

### 12. Copia de trabajo de Desktop divergida
- `C:\Users\rosal\Desktop\marketplace-moa` no está en `origin/main`
  (HEAD `1949170` vs `ff41ae2`, con borrados staged del frontend viejo Next.js).
  No commiter desde ahí; decidir si alinear con `main`.

## Notas de producto a validar
- Cron de suscripciones a `0 5 * * *` ≈ medianoche en Cuba en horario estándar.
  Cuba usa DST, así que en verano cae a ~00:00/01:00 cubana; el contador diario
  no depende del cron (se resuelve por clave de día `America/Havana` en
  `publicaciones.service.js`), así que es solo cuándo corre el barrido.
  Si se quisiera exactitud de hora del barrido habría que repensar el horario.