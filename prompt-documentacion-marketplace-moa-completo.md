# Marketplace Moa — Documentación completa del proyecto

Quiero que generes documentación completa y ordenada del proyecto, en tres
piezas separadas. El proyecto ya está en producción (backend en Render,
frontend en Cloudflare Workers), así que esta documentación debe reflejar
el estado real actual, no un plan — verifica contra el código y la
infraestructura real antes de escribir cada sección, no asumas ni copies
de memoria de sesiones anteriores.

## Pieza 1: README.md (raíz del repo)

Para cualquiera que abra el repo por primera vez (incluido tú mismo en una
sesión futura sin contexto previo). Debe incluir:

1. **Descripción del proyecto** — qué es Marketplace Moa, en 2-3 líneas
2. **Arquitectura** — diagrama en texto o lista de los servicios: Next.js
   (Cloudflare Workers vía OpenNext) → Express/Prisma (Render) → Postgres
   (Neon), más Cloudinary (fotos) y Firebase (push). Incluye las URLs
   reales de producción.
3. **Decisiones técnicas fijas y por qué** — nunca Vercel (geo-bloqueo +
   verificación telefónica), polling en vez de WebSockets (Render free
   tier duerme), access token en memoria no localStorage, CORS
   multi-origen vía FRONTEND_URL separado por comas
4. **Cómo correr el proyecto en local** — pasos exactos para backend y
   frontend, incluyendo el workaround de preload-swc.js en Windows y
   cualquier otro paso no obvio
5. **Variables de entorno necesarias** — lista completa (nombres, no
   valores) para backend y frontend, con una nota de dónde se configuran
   en producción (Render / Cloudflare)
6. **Estructura de carpetas** — árbol resumido de `backend/` y `frontend/`
7. **CI/CD** — cómo funciona el deploy automático de cada lado (push a
   main → Render redespliega backend; push bajo frontend/ → GitHub Action
   con runner Ubuntu despliega a Cloudflare Workers)
8. **Estado actual** — qué módulos están completos y en producción, qué
   falta (usa el plan de módulos ya construidos: auth, vendedores, job
   diario, publicaciones/feed, mensajería, notificaciones, admin,
   perfil, favoritos)

## Pieza 2: docs/api.md

Documentación técnica de cada endpoint del backend, para cualquiera que
necesite integrar o extender la API. Para cada endpoint:
- Método y ruta
- Qué rol/autenticación requiere (público, usuario, vendedor aprobado, admin)
- Body esperado (con tipos)
- Respuesta esperada (con tipos, incluye el caso de error más común)
- Reglas de negocio relevantes (ej. límites del demo, CI nunca expuesto)

Organiza por módulo: Auth, Vendedores, Publicaciones/Feed, Mensajes,
Favoritos, Admin, Jobs. Verifica cada endpoint contra el código real del
backend (`backend/src/`), no inventes ni asumas basado en el nombre de la
ruta.

## Pieza 3: docs/guia-admin.md

Guía práctica para ti mismo como admin único de la plataforma, en lenguaje
simple (no técnico), pensada para cuando estés operando el día a día:
- Cómo aprobar/rechazar una solicitud de vendedor (con capturas de flujo
  o descripción paso a paso de la pantalla /admin/vendedores)
- Cómo activar demo vs. exento al aprobar
- Cómo marcar un pago y activar la suscripción
- Cómo revisar reportes pendientes
- Qué hace el job diario automático y cómo confirmar que corrió bien
  (dónde mirar en GitHub Actions)
- Qué hacer si el backend "tarda en responder" (explicación simple del
  sleep de Render free tier, sin jerga técnica)
- Dónde está cada dato sensible (CI) y la garantía de que nunca se expone

## Cómo quiero que trabajes

1. Antes de escribir, revisa el código real del backend y frontend para
   confirmar que cada endpoint, variable de entorno y flujo que
   documentes existe tal como lo vas a describir — no documentes desde
   el plan original si el código real terminó siendo distinto.
2. Empieza por el README (pieza 1), muéstramelo, y espera mi confirmación
   antes de seguir con las otras dos piezas.
3. Guarda cada pieza en su ubicación: README.md en la raíz, los otros dos
   dentro de docs/.
4. Al terminar las tres, haz un commit dedicado solo a documentación.
