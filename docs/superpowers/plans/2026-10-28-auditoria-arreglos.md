# Marketplace Moa — Plan de Auditoría y Arreglo por Etapas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ejecutar los hallazgos de las auditorías backend y frontend en 4 etapas shipeables: (1) pantallas rotas del frontend, (2) seguridad backend, (3) UX/consistencia visual, (4) chat realtime + limpieza de sesión.

**Architecture:** Frontend HTML/CSS/JS vanilla en Cloudflare Workers (deploy automático por CI al hacer push de cambios en `frontend/**`). Backend Express 5 + Prisma en Render free (deploy automático en push a `main`). Sin build, sin dependencias nuevas (npm bloqueado por decisión PO salvo autorización explícita).

**Tech Stack:** HTML/CSS/JS vanilla, Express 5, Prisma + Neon Postgres, Chrome DevTools MCP (verificación en navegador), curl (verificación API), MCP Neon (consultas directas a prod).

**Specs (los dos informes de auditoría, léelos ANTES de cada tarea):**
- `docs/audit/backend-findings.md` (16 hallazgos, referenciados abajo como `BE #n`)
- `docs/audit/frontend-findings.md` (19 hallazgos, referenciados abajo como `FE #n`)
- Hallazgos de browser testing en vivo (marcados `BB #n`, listados abajo en Etapa 1/3/4)

## Global Constraints

- No añadir dependencias npm nuevas sin pedir permiso al usuario.
- Identidad git local: WwolfieLuisM/noreply. Push a `main` = deploy backend (Render). Push con cambios solo en `frontend/**` = deploy frontend (Cloudflare CI).
- Usuarios de prueba en prod (borrar al final del plan): `prueba.auditoria.moa@test.com` y `prueba.vendedor.moa@test.com`, password `MoaTest#2026`.
- El sistema demo de contadores NO se borra; solo se ajusta copia (decisión PO 2026-10-28). Las funciones quedan comentadas/activas como ya están.
- Verificación obligatoria tras cada etapa: navegador (Chrome DevTools MCP, perfil aislado) + curl para endpoints backend. Evidencia antes de marcar done.
- Cada task termina en commit; push al final de cada ETAPA (no por task) para no spamear deploys.

## Review Focus

Las 5 clases de fallo que las pruebas de las tareas no cubren y que más pueden morder a un usuario real:

1. **Cuentas duplicadas por teléfono al añadir el unique (BE #2):** verificar contra Neon de prod que NO existan teléfonos duplicados ANTES de la migración; si existen, limpiarlos (merge manual) antes.
2. **Pérdida de sesión aparente tras logout (BB #1):** tras revocar el refresh token en backend, verificar en navegador que logout → feed-guest y refrescar feed.html NO muestra sesión.
3. **Regression del feed al tocar el SQL crudo (BE #3,#9):** tras cada cambio en feed.service.js, probar `GET /feed` con y sin sesión, con `?orden=` inválido, y búsqueda `?q=arroz`.
4. **Pérdida de fotos al reordenar uploads (BE #1):** crear una publicación REAL con 3 fotos en navegador y verificar que aparecen en el feed y en Cloudinary sin huérfanos.
5. **Chat polling causando doble-render o fugas de setInterval (T21):** verificar que al navegar fuera de conversacion.html el intervalo se limpia (no más peticiones en Network) y que mensajes duplicados no se pintan.

---

## Etapa 1 — Frontend: pantallas rotas (bugs de forma de respuesta + kebab + error handling)

Objetivo: que Favoritos, Admin, favorito del detalle, kebab de invitados y envío de mensajes funcionen. Todo frontend → push → CI despliega.

### Task 1: favoritos.html desempaqueta `{productos}` (FE #1)

**Files:**
- Modify: `frontend/favoritos.html:44-46`

**Interfaces:**
- Consume: `api.get('/favoritos')` devuelve `{ productos: [...] }` (json sin desenvolver).

- [ ] **Step 1:** Desestructurar `const { productos } = await api.get('/favoritos')` y reemplazar las 3 referencias a `favoritos` por `productos`.
- [ ] **Step 2:** Verificar en navegador: login con usuario de prueba → guardar 1 producto en feed → abrir Guardados → el contador pinta "1", no "(undefined)", y la tarjeta aparece. Consola limpia.
- [ ] **Step 3:** Commit: `fix(frontend): favoritos desempaqueta {productos} del API`

### Task 2: admin.html desempaqueta `{resumen}` (FE #2)

**Files:**
- Modify: `frontend/admin.html:64-69`

- [ ] **Step 1:** `const { resumen: d } = await api.get('/admin/resumen');`
- [ ] **Step 2:** Verificar: login como admin (pedir al usuario o usar cuenta existente) → las 9 tarjetas muestran números, no "—". Si no hay sesión admin disponible, verificar con curl que la forma es `{resumen:{...}}` y dejar nota en el commit.
- [ ] **Step 3:** Commit: `fix(frontend): admin desempaqueta {resumen} del API`

### Task 3: publicacion.html corazón con id real (FE #3)

**Files:**
- Modify: `frontend/publicacion.html:89`

- [ ] **Step 1:** `heartHtml(true, principal.id)` → `heartHtml(principal.id)`.
- [ ] **Step 2:** Verificar en navegador: login → abrir un producto → clic corazón → se marca (sin alert 404), recargar → sigue marcado. Clic otra vez → se desmarca.
- [ ] **Step 3:** Commit: `fix(frontend): corazón del detalle usa el id del producto`

### Task 4: feed-guest kebab sin listener doble (FE #4)

**Files:**
- Modify: `frontend/feed-guest.html:133-134` (borrar `bindKebab(grid)` duplicado), `:56` (borrar `onclick="openAuth()"` inline del botón Cargar más)

- [ ] **Step 1:** Borrar la línea 134 y el atributo onclick inline.
- [ ] **Step 2:** Verificar en navegador en modo invitado (sin sesión): clic kebab en una tarjeta → el menú queda ABIERTO (Ocultar/Reportar visibles). Clic "Cargar más" → openAuth() se ejecuta UNA sola vez (no doble alert/banner).
- [ ] **Step 3:** Commit: `fix(frontend): kebab del feed invitado sin listener doble`

### Task 5: conversacion.html enviar con try/catch (FE #5)

**Files:**
- Modify: `frontend/conversacion.html:89-97`

- [ ] **Step 1:** Mover `input.value = ''` dentro del éxito (tras el await), envolver en try/catch; en catch: restaurar `input.value` con el texto original y mostrar error (alert o mensaje inline).
- [ ] **Step 2:** Verificar en navegador: enviar mensaje con conexión normal → se envía y se pinta. Simular fallo (DevTools → Network → Offline antes del clic) → el texto VUELVE al input y aparece error; volver Online → reenviar funciona.
- [ ] **Step 3:** Commit: `fix(frontend): chat no pierde el mensaje si falla la red`

### Task 6: Limpieza rápida (FE #6, #13, #14)

**Files:**
- Modify: `frontend/index.html:1,17` (borrar "u" inicial y meta truncado de google-site-verification)
- Modify: `frontend/js/ui.js:434` (borrar dispatch `favorito-cambio`), `frontend/perfil.html:186` (borrar dispatch `sesion-actualizada`)
- Delete: `frontend/js/cards.js` (vacío, sin referencias)

- [ ] **Step 1:** Aplicar los 4 borrados.
- [ ] **Step 2:** Verificar: index.html redirige sin "u" visible; feed y perfil cargan sin errores de consola; grep confirma cero referencias a cards.js y a los eventos borrados.
- [ ] **Step 3:** Commit: `chore(frontend): index.html inválido, eventos muertos y cards.js vacío`

---

## Etapa 2 — Backend: seguridad

Objetivo: cerrar los 5 must-fix BE + los 500s evitables. Push a main → Render despliega. Verificar con curl tras deploy.

### Task 7: errorHandler sin internals en 500 (BE #4)

**Files:**
- Modify: `backend/src/middleware/errorHandler.js:5-10`

- [ ] **Step 1:** Si `err.status` explícito → responder `{error: err.message}` con ese status. Si no → 500 con mensaje genérico "Error interno del servidor" + `console.error` del error real en el servidor.
- [ ] **Step 2:** Verificar con curl tras deploy: `GET /feed?orden=toString` → 500 con "Error interno del servidor" (sin SQL ni mensajes de Prisma en la respuesta). `GET /api/salud` o raíz → sigue OK.
- [ ] **Step 3:** Commit: `fix(backend): 500 sin filtrar internals de Prisma/SQL`

### Task 8: Hardening del feed: page NaN, ORDER_SQL, UUIDs (BE #7, #9, #8)

**Files:**
- Modify: `backend/src/modules/feed/feed.service.js:18,21,47,97` — `Number(page) || 1`; `Object.hasOwn(ORDER_SQL, orden)` en ambos puntos.
- Modify: `backend/src/modules/notificaciones/notificaciones.service.js:81` — page NaN.
- Modify: `backend/src/modules/mensajes/mensajes.service.js:33,128`, `backend/src/modules/favoritos/favoritos.service.js:46,64`, `backend/src/modules/notificaciones/notificaciones.service.js:96`, `backend/src/modules/publicaciones/publicaciones.service.js:223,244` — validar UUID de entrada con el `UUID_RE` existente (reusar de `vendedor.service.js:234`, idealmente moverlo a un sitio compartido tipo `backend/src/lib/uuid.js`) → 400/404 en vez de 500.

- [ ] **Step 1:** Aplicar los cambios; crear `backend/src/lib/uuid.js` exportando `UUID_RE` y `esUUID(v)` si aporta claridad (mover la constante de vendedor.service).
- [ ] **Step 2:** curl: `GET /feed?page=abc` → 200; `GET /feed?orden=__proto__` → 200; `DELETE /favoritos/no-uuid` (con token) → 400/404; `GET /mensajes/conversaciones/hola` → 400/404. Regresión: `GET /feed` normal y búsqueda `?q=arroz` → 200 con resultados.
- [ ] **Step 3:** Commit: `fix(backend): feed resistente a page/orden/uuid inválidos`

### Task 9: Vendedor rechazado desaparece del feed (BE #3)

**Files:**
- Modify: `backend/src/modules/feed/feed.service.js:41` (WHERE raw) y `backend/src/modules/publicaciones/publicaciones.service.js:196` (detallePublico) — añadir `vp.estado_licencia = 'aprobado'`.

- [ ] **Step 1:** Añadir el filtro en ambos sitios.
- [ ] **Step 2:** curl: `GET /feed` sigue 200 con las publicaciones de Rosalia (exento/aprobada) visibles. No romper el feed de invitado.
- [ ] **Step 3:** Commit: `fix(backend): licencia rechazada oculta sus publicaciones del feed`

### Task 10: Rate limit en /mensajes (BE #5)

**Files:**
- Modify: `backend/src/modules/mensajes/mensajes.service.js` (o routes) — contador en memoria por userId, ~20 mensajes/min → 429. Recordatorio `shortcut:`: en memoria solo funciona con una instancia (Render free = 1 instancia), si se escalan instancias subir a Redis.

- [ ] **Step 1:** Implementar el contador (Map, limpieza periódica simple).
- [ ] **Step 2:** Script de verificación one-off o curl loop: 25 POST rápidos → los últimos responden 429; esperar 60s → vuelve a funcionar.
- [ ] **Step 3:** Commit: `fix(backend): rate limit en escritura de mensajes`

### Task 11: Teléfono único + P2002 → 409 (BE #2, #12)

**Files:**
- Modify: `backend/prisma/schema.prisma:21` — `telefono String? @unique`
- Create: migración Prisma con `CREATE UNIQUE INDEX ... ON users(telefono) WHERE telefono IS NOT NULL` (o dejar que Prisma genere el unique simple; verificar compatibilidad)
- Modify: `backend/src/modules/auth/auth.service.js` register + actualizarUsuario — catch P2002 → 409 "Ya existe una cuenta con ese teléfono/email"

- [ ] **Step 1 (ANTES DE MIGRAR):** Consultar Neon prod: `SELECT telefono, COUNT(*) FROM users WHERE telefono IS NOT NULL GROUP BY telefono HAVING COUNT(*) > 1;` Si hay duplicados, parar y preguntar al usuario cómo mergear. También verificar duplicados de email.
- [ ] **Step 2:** `npx prisma migrate dev --name users_telefono_unique` (local contra DB de desarrollo, o `migrate diff`+aplicar en prod con cuidado) + catch P2002.
- [ ] **Step 3:** Verificar: registro con teléfono duplicado vía curl → 409 limpio (no 500). Registro normal → 201. Login por teléfono del usuario de prueba → OK.
- [ ] **Step 4:** Commit: `fix(backend): telefono único + P2002 traducido a 409`

### Task 12: Subidas Cloudinary fuera de la transacción (BE #1)

**Files:**
- Modify: `backend/src/modules/publicaciones/publicaciones.service.js:139-171` — mover `subirFoto()` fuera del `$transaction`; dentro del tx solo inserts con los `public_id` ya obtenidos; catch best-effort que borre lo subido si la transacción falla.

- [ ] **Step 1:** Reestructurar: subir fotos (Promise.all limitado, p.ej. en serie de a 3) → luego `$transaction` de inserts → si falla, borrar Cloudinary assets en catch.
- [ ] **Step 2:** Verificar en navegador con vendedor de prueba: crear publicación con 3 productos × 2 fotos → aparece en feed, fotos visibles. Revisar Cloudinary (API o dashboard) que no queden huérfanos del intento. (La prueba E2E manual `backend/scripts/` puede servir de apoyo.)
- [ ] **Step 3:** Commit: `fix(backend): fotos de Cloudinary suben antes de la transacción`

---

## Etapa 3 — Frontend UX/consistencia + backend de teléfono

### Task 13: Teléfono condicionado en detalle (FE #7 + backend)

**Files:**
- Modify: `backend/src/modules/publicaciones/publicaciones.service.js` (`detallePublico`) — no devolver `telefonoMovil` (o vaciarlo) en la respuesta pública.
- Modify: `frontend/publicacion.html:60,74` — pintar el teléfono solo si hay sesión, igual que el feed.

- [ ] **Step 1:** Backend: excluir teléfono del detalle público (verificar que el teléfono de vendedores aprobados NO se filtra cuando SÍ está logueado — el gate real es de sesión, no de licencia, según comportamiento actual).
- [ ] **Step 2:** Frontend: condicionar al estilo `moaFeedCard` (candado "Ver teléfono" sin sesión).
- [ ] **Step 3:** Verificar en navegador: invitado en publicacion.html → NO ve teléfono (candado). Logueado → sí. Regresión: feed y chat siguen mostrando teléfono donde corresponde.
- [ ] **Step 4:** Commit: `fix: teléfono del vendedor no se expone a invitados`

### Task 14: Header: punto rojo real + Avisos en desktop (FE #8, #9)

**Files:**
- Modify: `frontend/partials/header.js:23-28` — dot solo si `noLeidos > 0` (consultar `/mensajes/no-leidos` o reusar el mismo patrón de nav.js con `/notificaciones/no-leidas`), y añadir enlace "Avisos" al header para `currentUser`.

- [ ] **Step 1:** Implementar ambos (el dot debe pedir el dato y toggle; el enlace Avisos visible en desktop).
- [ ] **Step 2:** Verificar en navegador (desktop ≥701px): header muestra Avisos; con cero mensajes no leídos NO hay punto rojo; al recibir un mensaje (usuario de prueba envía a Rosalia y se mira su sesión… o simular) aparece. Consola limpia.
- [ ] **Step 3:** Commit: `feat(frontend): notificaciones reales en header y avisos en desktop`

### Task 15: checkbox de términos en solicitud (FE #10)

**Files:**
- Modify: `frontend/solicitud.html:153-180` — en el submit, exigir `terminos.checked` con mensaje de error.

- [ ] **Step 1:** Validar en el handler antes del POST.
- [ ] **Step 2:** Verificar en navegador: enviar sin marcar → mensaje "Debes aceptar las reglas de uso" y NO se hace el POST (Network vacío); marcando → envía.
- [ ] **Step 3:** Commit: `fix(frontend): solicitud exige aceptar las reglas`

### Task 16: login.html usa moa.css (FE #12)

**Files:**
- Modify: `frontend/login.html:13-177` — borrar el bloque `<style>` inline; enlazar `css/moa.css` como registro.html; dejar solo reglas que no existan en moa.css.

- [ ] **Step 1:** Aplicar; comparar login vs registro lado a lado (capturas) para confirmar que se ven de la misma familia.
- [ ] **Step 2:** Verificar en navegador: login funcional (login real con usuario de prueba), aspecto coherente con registro, consola limpia.
- [ ] **Step 3:** Commit: `refactor(frontend): login hereda moa.css, sin CSS duplicado`

### Task 17: Copia demo → licencia permanente + bloqueo de no-vendedor (FE #18 + BB)

**Files:**
- Modify: `frontend/solicitud.html:28` — texto de "5 al día / 10 en total / 3 fotos" → copia de licencia permanente (el usuario paga una vez, publica sin límite de demo).
- Modify: `frontend/publicacion-nueva.html:122` y banner de límites — quitar contador/plan demo; si el usuario NO es vendedor aprobado, deshabilitar el botón Publicar y el formulario (mostrar solo el aviso + link a solicitud).
- Modify: `frontend/perfil.html:154-158`, `frontend/vendedor-perfil.html:51,66` — quitar badge "Plan demo".

- [ ] **Step 1:** Ajustar copy + bloqueo de no-vendedor.
- [ ] **Step 2:** Verificar en navegador: no-vendedor en publicacion-nueva → formulario deshabilitado/bloqueado con aviso y link a solicitud; vendedor exento (Rosalia) → formulario activo sin contadores demo; perfil sin badge demo.
- [ ] **Step 3:** Commit: `feat(frontend): copia de licencia permanente, fin del plan demo en UI`

### Task 18: Búsqueda funcional + "Cargar más" en búsqueda (BB + FE #19)

**Files:**
- Read first: `frontend/feed.html:25-28,182-188` y `frontend/feed-guest.html:33-37,142-144` — root-cause por qué `?q=` no filtra en vivo (sospecha: el form/lupa no dispara submit, o feed.html no lee `?q` de la URL).
- Modify: el punto raíz que resulte (handler de submit, o leer `q` de `new URLSearchParams(location.search)` al cargar).
- Modify: `frontend/feed.html:169-180` — deshabilitar "Cargar más" con búsqueda activa (la búsqueda es de página única) o limpiar búsqueda al pulsarlo.

- [ ] **Step 1:** Reproducir, encontrar causa raíz, fix mínimo (systematic-debugging: una causa, un fix).
- [ ] **Step 2:** Verificar en navegador (con y sin sesión, en feed y feed-guest): escribir "piano" → el feed muestra SOLO productos que coinciden; limpiar búsqueda → vuelve el feed completo; "Cargar más" no hace spinner muerto.
- [ ] **Step 3:** Commit: `fix(frontend): búsqueda filtra de verdad y cargar más coherente`

---

## Etapa 4 — Sesión + chat realtime

### Task 19: Logout revoca el refresh token (BB #1)

**Files:**
- Read: `backend/prisma/schema.prisma` (modelo de refresh tokens — verificar nombre) y `backend/src/modules/auth/auth.service.js`, `auth.routes.js:90-93`.
- Modify: crear `logout` en auth.service que borre/invalida el refresh token de BD (delete por token id o hash) y llamarlo desde la ruta logout.

- [ ] **Step 1:** Implementar revocación (delete del token que coincide con la cookie).
- [ ] **Step 2:** Verificar con curl: login → guardar cookie → logout → reenviar cookie vieja → 401 (antes devolvía 200 + accessToken nuevo). Y en navegador: logout → feed-guest → recargar feed.html → sin sesión.
- [ ] **Step 3:** Commit: `fix(backend): logout revoca el refresh token en BD`

### Task 20: Polling de chat ~15s (opción A, aceptada por el usuario)

**Files:**
- Modify: `frontend/conversacion.html` — setInterval ~15s que re-fetcha `/mensajes/conversaciones/:otroUserId`, solo pinta mensajes nuevos (por id, sin duplicar), y scroll suave si el usuario está abajo. Limpiar el intervalo en `visibilitychange`/al salir (o `beforeunload`) y evitar parpadeo re-renderizando solo el delta.

- [ ] **Step 1:** Implementar con cuidado de no re-pintar todo (append por id).
- [ ] **Step 2:** Verificar en navegador con DOS sesiones (usuario de prueba → mensaje a Rosalia desde otra pestaña/cuenta): el hilo se actualiza solo en ~15s sin duplicar burbujas; al navegar a mensajes.html no quedan más peticiones en Network (intervalo limpiado); consola limpia.
- [ ] **Step 3:** Commit: `feat(frontend): chat con polling cada 15s`

---

## Fuera de alcance de este plan (decidir después)

- FE #11 (dedupe feed.html/feed-guest.html en js/feed.js compartido): refactor de medio día con riesgo medio; se recomienda etapa aparte cuando el plan esté shipeado.
- Backend #6 (índice pg_trgm) — requiere verificar en prod primero; se puede patear, es perf de búsqueda a escala futura.
- Backend #10 (purga notificaciones + device_tokens unique), #11 (bug demo UTC — solo aplica si se reactivan contadores), #13-16 (optimizaciones/ventanas menores): backlog en `docs/pendientes.md`.
- Borrar usuarios de prueba de prod: hilo final tras la aprobación de la etapa 4.

## Self-review (writing-plans)

- Cobertura: cada hallazgo BE/FE must-fix tiene task; los should/nice quedan en tasks (Etapa 3) o en el bloque "fuera de alcance" con razón. OK.
- Tipos/nombres consistentes entre tasks (p.ej. `UUID_RE` movido a `lib/uuid.js` referenciado igual en Task 8). OK.
- Review Focus: 5 riesgos listados arriba con su test en la task dueña. OK.
- Proporción: el plan delega los detalles de código en los informes de auditoría (spec viaja con el plan) — no duplica cuerpos de código completos. OK.
