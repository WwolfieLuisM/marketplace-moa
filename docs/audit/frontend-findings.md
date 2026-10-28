# Auditoría frontend — marketplace-moa (HTML+CSS+JS vanilla, sin build)

Fecha: 2026-10-28 · Alcance: `frontend/**` contra `backend/src/modules/*/*.routes.js` (forma real de `res.json`). Producción con usuarios en Cuba, móvil primero.

---

## MUST FIX

### 1. Guardados roto: página trata `/favoritos` como array pero el API devuelve `{productos}`
- **Archivo:** `frontend/favoritos.html:44-46` ↔ `backend/.../favoritos.routes.js:16-23`
- **Qué es:** El backend envuelve: `res.json({ productos })`. La página hace `const favoritos = await api.get('/favoritos')` y usa `favoritos.length`.
- **Caso concreto:** Un usuario con 20 productos guardados entra a "Guardados" (nav móvil): `favoritos.length` es `undefined` → se pinta "(undefined)" en el contador y `!favoritos.length` es `true` → muestra el estado vacío "Aún no tienes guardados. Explora el feed…". Mismo bug de forma que el de conversacion.html, pero silencioso y peor: no lanza error, miente al usuario.
- **Fix mínimo:** `const { productos } = await api.get('/favoritos');` y usar `productos` en su lugar (3 referencias).
- **Si se ignora:** La función "guardar" del feed lleva a una página que siempre aparece vacía; los usuarios creen que sus guardados se perdieron.

### 2. Panel admin: las 9 tarjetas del resumen muestran "—" (desajuste `{resumen}`)
- **Archivo:** `frontend/admin.html:64-69` ↔ `backend/.../admin.routes.js:9`
- **Qué es:** El backend devuelve `{ resumen: { usuarios, vendedores, ... } }`; la página hace `const d = await api.get('/admin/resumen')` y luego `d[key] ?? '—'`.
- **Caso concreto:** El admin abre admin.html → Usuarios, Vendedores, Licencias activas, Publicaciones… todas "—". No lanza excepción (?? lo cubre), así que parece diseño y nadie lo reporta. La lista de pendientes de abajo sí funciona, ocultando el bug.
- **Fix mínimo:** `const { resumen: d } = await api.get('/admin/resumen');`
- **Si se ignora:** El panel de métricas está mudo en producción para el único rol que lo usa.

### 3. publicacion.html: el botón favorito lleva `data-id="true"` (argumentos de heartHtml invertidos)
- **Archivo:** `frontend/publicacion.html:89` ↔ `frontend/js/ui.js:247`
- **Qué es:** `heartHtml(true, principal.id)` — la firma es `heartHtml(productoId)`, así que se genera `<button class="fav-btn" data-id="true">`.
- **Caso concreto:** Usuario logueado abre un producto y pulsa el corazón → `bindFav` envía `api.post('/favoritos', { productoId: 'true' })` → el backend valida y devuelve 404 "Producto no encontrado" → `alert`. El corazón nunca se activa (marcarFavoritos busca `set.has('true')` = false). Los corazones del feed/cards sí funcionan; solo el de detalle está roto.
- **Fix mínimo:** `heartHtml(principal.id)`.
- **Si se ignora:** Guardar desde la página de detalle (el punto más cercano a la compra) siempre falla con un alert críptico.

### 4. feed-guest.html: el menú kebab (Ocultar/Reportar) nunca se abre — listener doble
- **Archivo:** `frontend/feed-guest.html:133-134` ↔ `frontend/js/ui.js:395-418`
- **Qué es:** `bindGrid(grid)` ya llama `bindKebab(root)` internamente; la línea 134 vuelve a llamar `bindKebab(grid)`, añadiendo un segundo listener en el mismo nodo.
- **Caso concreto:** Invitado toca el kebab de una tarjeta → listener 1 hace `menu.classList.toggle('open')` (abre) y listener 2 hace lo mismo (cierra). El menú parpadea y queda cerrado: "Ocultar del feed" y "Reportar publicación" son inalcanzables en el feed de invitados. Además el botón "Cargar más" tiene `onclick="openAuth()"` inline (línea 56) Y un listener (línea 141) → `openAuth()` se ejecuta dos veces por click (inofensivo hoy, frágil).
- **Fix mínimo:** Borrar la línea 134 (`bindKebab(grid);`) y el `onclick` inline de la línea 56.
- **Si se ignora:** Invitados no pueden ocultar ni reportar publicaciones en su único feed.

### 5. conversacion.html: enviar mensaje sin try/catch — el texto se pierde en fallo de red
- **Archivo:** `frontend/conversacion.html:89-97`
- **Qué es:** El submit hace `input.value = ''` ANTES del `await api.post(...)`, sin `.catch`.
- **Caso concreto:** Con la red móvil típica de Cuba, el POST falla/timeout → promesa rechazada sin capturar (rejection silenciosa en consola), el input ya está vacío: el usuario pierde el mensaje escrito y no ve ningún error. Es el único POST del chat sin manejo de error (publicacion-nueva, solicitud, admin sí lo tienen).
- **Fix mínimo:** Mover `input.value = ''` después del `await` con éxito, y `catch` que restaure el texto y muestre un alert/formMsg.
- **Si se ignora:** Pérdida silenciosa de mensajes justo donde más duele (la conversación comprador-vendedor).

---

## SHOULD FIX

### 6. index.html corrupto: "u" antes del doctype + meta truncado
- **Archivo:** `frontend/index.html:1,17`
- **Qué es:** El archivo empieza con `u<!DOCTYPE html>` y termina con `<meta name="google-site-verificati` sin cerrar (sin `">`), lo que hace que el parser se trague `</body></html>` como parte del atributo.
- **Caso concreto:** Es la URL raíz del sitio. El redirect por script funciona, pero hay un "u" suelto visible en el flash de carga, HTML inválido y un segundo `google-site-verification` duplicado/roto (el válido está en la línea 7).
- **Fix mínimo:** Borrar la "u" de la línea 1 y las líneas 17 (meta truncado).
- **Si se ignora:** Markup inválido en la puerta de entrada; validadores/rastreadores lo ven como HTML roto.

### 7. Detalle de publicación muestra el teléfono del vendedor a invitados (el feed lo bloquea)
- **Archivo:** `frontend/publicacion.html:60,74` ↔ contraste con `frontend/js/ui.js:304`
- **Qué es:** En el feed, sin sesión se ve un candado "Ver teléfono"; en publicacion.html el `telefonoMovil` se pinta siempre, sin chequear sesión.
- **Caso concreto:** Invitado abre publicacion.html?id=… (por Google, sin cuenta) y ve el teléfono del vendedor, anulando el gate "inicia sesión para contactar". Nota: el backend también lo expone (GET público devuelve el registro completo con telefonoMovil), así que el fix real requiere backend; el frontend al menos debe condicionarlo como el feed para no contradecerse.
- **Fix mínimo (frontend):** `${sesion && telefono ? ... : ''}` igual que moaFeedCard. Backend: sanear telefono de `detallePublico`.
- **Si se ignora:** Política de contacto inconsistente y teléfono público pese al candado.

### 8. El punto rojo de "Mensajes" del header siempre está encendido
- **Archivo:** `frontend/partials/header.js:26` (estilo `css/moa.css:107-111`); contraste con `partials/nav.js:38-46`
- **Qué es:** El header inyecta `<div class="dot"></div>` fijo junto al icono de mensajes para todo usuario logueado, sin consultar unread. nav.js sí consulta `/notificaciones/no-leidas` para el badge de Avisos.
- **Caso concreto:** Todo usuario con sesión ve un punto rojo de "tienes mensajes sin leer" en el header toda la sesión, haya o no mensajes. En un marketplace ese rojo dispara expectativa de respuesta de compra.
- **Fix mínimo:** Toggle con `api.get('/mensajes/no-leidos')` (`{noLeidos}` ya lo devuelve el backend) o quitar el dot.
- **Si se ignora:** "Notificaciones" falsas permanentes; usuarios ignoran el rojo = pierden mensajes reales.

### 9. En escritorio no hay forma de llegar a Avisos
- **Archivo:** `frontend/partials/header.js:23-28` + `frontend/css/moa.css:725` (`.mobile-nav{display:none}` ≥701px)
- **Qué es:** Avisos solo existe en el nav inferior móvil; el header de desktop tiene Publicar / Mensajes / Perfil (y Admin/Perfil para admin), ningún enlace a avisos.html.
- **Caso concreto:** Usuario en PC recibe el badge rojo de avisos… que no ve porque el nav móvil no existe en su viewport; avisos.html es inalcanzable saltando la URL a mano. El flujo de notificaciones está cortado en la mitad de tus usuarios (también PC, según el brief).
- **Fix mínimo:** Añadir enlace/badge "Avisos" al header para `currentUser` en partials/header.js.
- **Si se ignora:** Funcionalidad completa (notificaciones) invisible en escritorio.

### 10. solicitud.html: el checkbox de términos se puede enviar sin marcarlo
- **Archivo:** `frontend/solicitud.html:31,85-88,153-180`
- **Qué es:** El form tiene `novalidate` (línea 31), así que el `required` del checkbox "Confirmo que la información es real…" no lo valida el navegador, y el handler de submit tampoco lo comprueba. El backend (`vendedorService.solicitar`) no recibe ni valida `terminos`.
- **Caso concreto:** Usuario envía la solicitud de licencia sin aceptar las reglas; el checkbox es decorativo. El backend valida tipo/nombre/apellidos/CI, pero no la aceptación.
- **Fix mínimo:** En el submit: `if (!form.querySelector('[name=terminos]').checked) { mostrarMsg('Debes aceptar las reglas de uso', false); return; }`
- **Si se ignora:** El consentimiento registrado en el formulario no existe en la práctica.

### 11. feed.html y feed-guest.html son copias de ~120 líneas que ya divergieron con bugs
- **Archivo:** `frontend/feed.html:66-202` ↔ `frontend/feed-guest.html:72-149`
- **Qué es:** Lógica de feed duplicada casi línea a línea (categorías, reparto, búsqueda, paginación) con divergencias accidentales: el bug #4 (bindKebab doble) existe solo en la copia guest; feed.html tiene skeleton y clearSearch que el guest no; el guest tiene `openAuth` inline.
- **Caso concreto:** Cada fix hay que aplicarlo dos veces; ya se aplicó mal una vez (kebab). El siguiente cambio de tarjeta romperá un feed y no el otro.
- **Fix mínimo:** Mover la lógica a un `js/feed.js` compartido con una flag `guest` (o aceptar al menos que la página guest reutilice el mismo IIFE).
- **Si se ignora:** Divergencia creciente entre la experiencia invitado y logueada.

### 12. login.html duplica 165 líneas de CSS inline que ya viven en moa.css
- **Archivo:** `frontend/login.html:13-177`
- **Qué es:** Bloque `<style>` propio redefiniendo `:root`, `.btn-cta`, `.btn-ghost`, `.card`, `.brand-mark`, `.gis-slot`, `.error-box`, `.spinner`… casi todos ya definidos en `css/moa.css` (con valores distintos, p. ej. `--chalk-dim:#B9C9BE` inline vs el de moa.css).
- **Caso concreto:** Cambias el rojo de marca en moa.css y el login (la primera pantalla de cualquier usuario nuevo) no cambia. registro.html en cambio sí usa moa.css → las dos pantallas de auth no se ven idénticas.
- **Fix mínimo:** Borrar el `<style>` y enlazar `css/moa.css` como registro.html; quedarse solo con las reglas que no existan.
- **Si se ignora:** Deriva visual permanente entre login y el resto.

### 13. Eventos despachados que nadie escucha (código muerto)
- **Archivo:** `frontend/js/ui.js:434` (`favorito-cambio`), `frontend/perfil.html:186` (`sesion-actualizada`)
- **Qué es:** `window.dispatchEvent(new CustomEvent('favorito-cambio', …))` y `sesion-actualizada` no tienen ningún `addEventListener` en todo `frontend/` (verificado con grep).
- **Caso concreto:** Alguien lee el código y da por hecho que al actualizar el perfil se refresca algo más (header/nav), o que el feed reacciona a favoritos; nada de eso pasa. Deuda de lectura + trabajo perdido.
- **Fix mínimo:** Borrar ambos dispatch (o implementar el listener si la intención era esa).
- **Si se ignora:** Código engañoso que invita a "arreglos" sobre supuestos falsos.

### 14. js/cards.js está vacío y sin referencias
- **Archivo:** `frontend/js/cards.js` (0 líneas; grep en frontend/ sin referencias)
- **Qué es:** Archivo muerto.
- **Fix mínimo:** Borrarlo.
- **Si se ignora:** Ruido mínimo, pero es un "¿y cards.js hace algo?" en cada revisión.

---

## NICE TO HAVE

### 15. conversacion.html: "volver" fijo a mensajes.html puede dejar al usuario en pantalla vacía
- **Archivo:** `frontend/conversacion.html:18-21`
- El enlace back es siempre `mensajes.html`. Un usuario que llega del feed o de vendedor.html sin conversaciones previas pulsa "Mensajes" y ve "Todavía no tienes conversaciones" (si aún no envió nada), perdiendo el contexto del producto. Fix: `onclick="history.length>1?history.back():location.href='mensajes.html'"` o parámetro `?from=`.

### 16. avatarHtml inserta iniciales sin esc()
- **Archivo:** `frontend/js/ui.js:154-157,188-192`
- Único dato de usuario insertado sin `esc()`. No explotable hoy (toma 1 carácter por palabra; cualquier payload con espacios se trunca), pero es el único hueco del sistema de escape. Fix: `${esc(inicialesDe(u))}`. El resto del XSS posture está bien: todo dato de API pasa por `esc()`/`textContent`, y no hay `onclick` con datos interpolados.

### 17. Duplicación de UI auth: toggle de ojo + validación de contraseña copiados; teléfono sin validar
- **Archivo:** `frontend/registro.html:47,109-127,157-164` ↔ `frontend/restablecer.html:151-158`
- El bloque del eye-btn está copiado en dos páginas, y `pattern="[0-9]+"` del teléfono de registro se salta por `novalidate` (el backend solo exige que exista). Fix: helper en ui.js y/o validación en submit.

### 18. Textos "demo" incoherentes con el backend (pendiente cosmético conocido, 1 línea)
- `solicitud.html:28` ("5 al día / 10 en total"), `publicacion-nueva.html:122` ("X de 5 hoy… de 10"), `perfil.html:154-158` y `vendedor-perfil.html:51,66` (badge "Plan demo") siguen prometiendo límites demo que el backend deshabilitó (PO 2026-10-28 en `publicaciones.service.js:96-98`): los contadores siempre serán 0 y el texto nunca cuadrará.

### 19. feed.html: "Cargar más" en modo búsqueda no hace nada
- **Archivo:** `frontend/feed.html:169-180`
- Con búsqueda activa, el botón llama `await cargarBusqueda()` y descarta el resultado (no re-renderiza): no-op con spinner. Como la búsqueda ya es página única, la rama debería deshabilitarse o limpiar la búsqueda.

---

**Verdict:** El frontend es sólido en XSS y manejo de errores en general, pero tiene 2 pantallas enteras rotas por el mismo bug de forma de respuesta que conversacion.html (Guardados miente "vacío", admin en "—"), el favorito del detalle roto y el kebab del feed invitado muerto — todo del mismo patrón: desajustes página↔API no detectados sin tests.

**Not checked:** CSS exhaustivo (verifiqué solo las ~40 clases más usadas contra moa.css); accesibilidad profunda (focus traps de modales, aria más allá de lo presente); sitemap.xml y wrangler routing (assets directory only, sin 404s custom); comportamiento real de GSI de Google en navegadores cubanos; backend más allá de las formas de respuesta de `res.json`; flujo de emails/enlaces de recuperación (solo el frontend).
