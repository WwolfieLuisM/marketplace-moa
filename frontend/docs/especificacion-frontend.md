# Marketplace Moa — Especificación del Frontend

Este documento es la referencia completa para construir el frontend de
Marketplace Moa en Next.js. Ya existe un smoke test validado (feed público,
login, cookie httpOnly cross-origin, todo confirmado funcionando contra el
backend real en `https://moa-api-8y3i.onrender.com`) y un scaffold de
Next.js ya creado en `frontend/`. Este documento no repite esa base — la
asume como punto de partida y define cómo construir las pantallas reales
encima.

## Tecnología

- **Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4**
  (ya scaffoldeado en `frontend/`)
- **Sin librerías de íconos externas** (nada de `lucide-react`,
  `react-icons`, etc.) — todos los íconos son **SVG inline**, escritos a
  mano como componentes React simples (ej. `<IconChat />`,
  `<IconLocation />`), siguiendo el mismo patrón que ya se usó en el smoke
  test HTML (`viewBox`, `stroke="currentColor"` para que hereden color por
  CSS/Tailwind).
- **Cero emojis en ningún lugar de la interfaz** — ni en texto, ni en
  placeholders, ni en mensajes de error. Todo ícono o énfasis visual va en
  SVG.
- **`fetch` con `credentials: 'include'`** en cada llamada al backend, para
  que la cookie httpOnly del refresh token viaje correctamente
  cross-origin (ya confirmado que funciona en el smoke test).
- **`NEXT_PUBLIC_API_URL`** desde `.env.local` — nunca hardcodear la URL
  del backend en el código.
- **`accessToken`**: usar Context de React + estado en memoria (NO
  `localStorage`) para el access token, más seguro contra XSS que el
  approach del smoke test HTML. El refresh token sigue viviendo solo en la
  cookie httpOnly, nunca tocado por JS del cliente.

## Paleta y estilo visual (ya validado y aprobado)

Basado en el diseño de la pantalla de login ya construida y aprobada:

- **Color primario:** naranja `#ea580c` (hover `#c2410c`)
- **Fondo de pantallas con jerarquía/auth:** gradiente oscuro
  `#0f172a` → `#1e293b`
- **Fondo de pantallas de contenido (feed, chat, etc.):** `#f8fafc` claro
- **Texto principal:** `#0f172a`, texto secundario `#64748b`
- **Bordes/inputs:** `#e2e8f0`, focus en `#ea580c`
- **Éxito:** verde `#16a34a` (ej. estado "en línea", checks de leído)
- **Error:** rojo sobre fondo `#fef2f2` / borde `#fecaca` / texto `#b91c1c`
- **Tarjetas:** blanco, `border-radius` generoso (12-20px), sombra suave
- Tipografía: system font stack (`-apple-system, 'Segoe UI', sans-serif`)
- Diseño **mobile-first** siempre — la mayoría de usuarios entrarán desde
  teléfono con conexión limitada

## Estructura de páginas (App Router)

```
app/
  layout.tsx                    -- ya existe
  page.tsx                      -- redirige a /feed
  ping/page.tsx                 -- ya existe (smoke test), migrar y luego
                                    eliminar frontend/smoke/

  (auth)/
    login/page.tsx
    registro/page.tsx

  feed/page.tsx                 -- feed público, funciona sin login

  publicaciones/
    [id]/page.tsx                -- detalle de una publicación (hasta 3 productos)
    nueva/page.tsx                -- crear publicación (requiere login + vendedor aprobado)

  vendedor/
    solicitud/page.tsx            -- formulario para pedir ser vendedor (nombre, apellidos, CI, tipo)
    perfil/page.tsx               -- perfil propio del vendedor (estado demo/activo, contador productos)
    [id]/page.tsx                  -- perfil público de un vendedor/negocio (solo nombre visible, nunca CI)

  mensajes/
    page.tsx                      -- lista de conversaciones
    [conversacionId]/page.tsx      -- hilo de chat (ya prototipado en HTML plano)

  favoritos/page.tsx             -- productos guardados por el usuario

  admin/
    page.tsx                      -- dashboard: vendedores pendientes, por vencer, reportes
    vendedores/page.tsx            -- aprobar/rechazar licencias, marcar pagos, activar exento
    reportes/page.tsx              -- reportes pendientes de revisión

  perfil/page.tsx                 -- edición del propio perfil de usuario
```

## Detalle de cada pantalla

### `/login` y `/registro`
Ya construidas en HTML plano y aprobadas en diseño — migrar ese mismo
diseño a componentes React. Login con email/contraseña + botón de Google
(Google Identity Services real, `idToken` → `POST /auth/google`, **no**
flujo de redirect). Registro: nombre, apellidos, teléfono, email,
contraseña, reparto (selector con el catálogo fijo de repartos de Moa:
Centro, Atlántico, Caribe, José Martí, La Playa, Las Coloradas, Los Checos,
Los Mangos, Miraflores, Rolo Monterrey, más los poblados del municipio).

### `/feed`
Visible sin login (invitado). Grid/lista de tarjetas de publicaciones
(cada una puede mostrar hasta 3 productos). Filtros por reparto y
categoría en la parte superior, buscador de texto (conecta al endpoint
GIN). Ordenado por el score de ranking que ya expone el backend — no
reordenar en el cliente. Si el usuario NO tiene sesión, el botón de
"Contactar vendedor" en cada tarjeta lo redirige a `/login` en vez de abrir
el chat.

### `/publicaciones/nueva`
Solo accesible si el usuario es vendedor con `estado_licencia='aprobado'`.
Formulario con "agregar producto" (botón `+`) hasta el máximo de 3 —
implementar como un array de productos en el estado del formulario, cada
uno con nombre, descripción, precio, cantidad, categoría, y subida de
fotos a Cloudinary (usar upload directo desde el cliente con un preset
unsigned de Cloudinary, o vía el backend — confirmar con el backend cuál
endpoint ya existe para esto). Si el vendedor está en `demo`, mostrar
visualmente cuántos productos le quedan disponibles hoy/en total (usa los
contadores `productos_hoy` / `productos_total_demo` que ya expone el
backend) — el formulario debe deshabilitarse con un mensaje claro si
alcanzó el límite, no solo fallar silenciosamente al enviar.

### `/vendedor/solicitud`
Formulario: nombre, apellidos, número de carnet de identidad, tipo
(individual / negocio-TCP). Si es negocio: campos adicionales de nombre de
negocio, categoría, horario, zonas de domicilio con costo y tiempo
estimado. Mensaje claro después de enviar: "tu solicitud fue enviada,
un administrador la revisará" — no promete aprobación automática.

### `/vendedor/perfil`
Vista propia del vendedor logueado: estado de su suscripción (demo /
activo / vencido / exento), fecha de vencimiento si aplica, contador de
productos publicados, lista de sus publicaciones con opción de pausar/
marcar como vendido/eliminar.

### `/vendedor/[id]` (perfil público)
Solo el nombre del vendedor (nunca el CI). Si es negocio: nombre del
negocio, categoría, horario, zonas de domicilio. Lista de sus publicaciones
activas actuales.

### `/mensajes` y `/mensajes/[conversacionId]`
Lista de conversaciones con contador de no leídos (usa
`GET /mensajes/no-leidos`, ya construido). El hilo de chat sigue el diseño
ya prototipado: burbujas propias en naranja a la derecha, ajenas en blanco
con borde a la izquierda, contexto fijo del producto referenciado arriba
del hilo si `producto_id` no es null. **Polling cada 12 segundos** mientras
la pestaña del hilo está abierta (no WebSockets/SSE — decisión ya tomada
por las limitaciones de Render free tier y la prioridad de robustez sobre
conexión inestable). Marcar como leído al abrir el hilo.

### `/favoritos`
Grid simple de productos guardados, mismo componente de tarjeta que el
feed, con botón para quitar de favoritos.

### `/admin` y subpáginas
Protegido por rol `admin` (redirige si el usuario no tiene ese rol, no solo
oculta visualmente el enlace). Dashboard con: conteo de vendedores
pendientes de aprobación, vendedores por vencer en los próximos días
(para saber a quién visitar a cobrar), reportes sin revisar.
`/admin/vendedores`: tabla con acciones — aprobar (con opción de iniciar
demo normal o saltar directo a exento), rechazar, marcar como pagado
(actualiza `suscripcion_vence_en` y `estado_suscripcion`).
`/admin/reportes`: lista de reportes con motivo, quién reportó, acción de
marcar como revisado.

### `/perfil`
Edición de los propios datos del usuario (nombre, teléfono, reparto) — no
incluye el CI, que nunca se edita desde aquí ni se muestra.

## Componentes compartidos a construir primero

Antes de las páginas, construir estos componentes reutilizables (evita
duplicar código entre pantallas):

- `<Header />` — barra superior con logo (SVG), navegación, estado de
  sesión (avatar/iniciales si logueado, botón login si no)
- `<ProductCard />` — tarjeta de producto/publicación para el feed y
  favoritos
- `<Avatar />` — iniciales sobre fondo de color, mismo patrón que el chat
  prototipado (`YC` sobre fondo `#fed7aa`)
- `<Button />` — variantes primario (naranja) y secundario (borde), mismo
  estilo que los botones ya usados en login
- `<Input />` — con ícono SVG a la izquierda, mismo patrón que el login
- `<ErrorBanner />` — mismo estilo que el `.error-box` del login
- `<IconX />` (varios) — set base de íconos SVG: chat, ubicación, usuario,
  candado, correo, más (+), check, flecha atrás, etc.

## Cómo quiero que trabajes

1. Antes de escribir componentes de página, crea primero los componentes
   compartidos de arriba y muéstramelos (o dime que están listos) para
   confirmar que el estilo visual quedó consistente con el login ya
   aprobado.
2. Construye las páginas en este orden: Header/layout base → `/feed`
   (la más visible, sin auth) → `/login` y `/registro` (migrar del HTML
   ya hecho) → `/mensajes` (migrar del HTML ya prototipado) →
   `/publicaciones/nueva` → `/vendedor/*` → `/admin/*` → `/perfil` y
   `/favoritos`.
3. Después de cada pantalla o grupo pequeño de pantallas, dime qué
   construiste y qué falta probar antes de seguir — no generes todas las
   páginas de un tirón sin checkpoints.
4. Cuando termines de migrar el smoke test a `app/ping/page.tsx`, borra
   `frontend/smoke/` y el `server.mjs` que ya no hace falta.
5. Commits pequeños y descriptivos por pantalla o grupo de componentes,
   igual que se hizo con el backend — no un solo commit gigante al final.
