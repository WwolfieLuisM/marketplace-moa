# Guía de administrador — Marketplace Moa

Guía práctica para operar la plataforma a diario. Claro y sin tecnicismos.

> **Acceso admin:** entra a `https://moa-frontend.luisiking89.workers.dev`,
> inicia sesión con tu cuenta de administrador y ve a
> `/admin` (desde el menú o escribiendo la ruta directa). Si no tienes rol
> admin, la página te lo dice y no muestra nada.

## Panel principal (`/admin`)

Muestran un resumen en tarjetas: usuarios registrados, vendedores, licencias
activas, publicaciones, productos, mensajes, favoritos y reportes.

- **"Pendientes de aprobar"** se resalta en naranja cuando tienes solicitudes sin
  revisar. Clic en la tarjeta (o en "Gestionar vendedores") abre la lista.

## Aprobar / rechazar una solicitud de vendedor (`/admin/vendedores`)

1. En el panel, clic en **Gestionar vendedores** (o `/admin/vendedores`).
2. Arriba hay filtros: **Pendientes** (por defecto), Aprobados, Rechazados, Todos.
   Revisa siempre la pestaña *Pendientes*.
3. Cada solicitud muestra: nombre, email, teléfono, reparto, categoría de
   negocio, tipo de vendedor y fecha de solicitud.
4. Botón **Aprobar** → se abre una ventana con dos opciones:
   - **Demo 48 horas**: el vendedor entra en prueba automática durante 2 días con
     el plan demo (máx 5 productos/día y 10 en total). **Opción recomendada al
     empezar.**
   - **Exento**: aprobación sin límites de demo (úsala para casos especiales o
     socios ya establecidos; implica que publicará sin tope de contador).
   - **Cancelar** deja la solicitud pendiente.
5. Botón **Rechazar** → confirma en la ventana; la solicitud pasa a "Rechazado".

Al aprobar el perfil queda `aprobado`; el vendedor ya puede publicar. Al
rechazar, el vendedor ve su solicitud como rechazada.

> ⚠️ No hay (aún) pantalla para **marcar un pago y activar la suscripción
> "activo"**. Los modos disponibles hoy son `demo` (48 h) y `exento`. Si quieres
> dar acceso "activo" de pago, hay que implementar ese flujo (endpoint +
> pantalla) — el campo `suscripcionVenceEn` ya existe en la base de datos.

## Reportes pendientes

El panel muestra el contador **"Reportes"** (número total de reportes
guardados). Aún **no existe** una pantalla para revisarlos ni cómo responderlos
(el modelo `Reporte` está en la base de datos, sin endpoints ni UI). Si algo se
reporta desde la app, por ahora no se ve en ningún lado más que en ese contador.

## El job diario (qué hace y cómo confirmar que corrió bien)

Todos los días a las 00:00 UTC GitHub Actions llama al backend con la clave
secreta. El job (`revisar-suscripciones`) hace 4 cosas:

1. **Suscripciones demo vencidas** (terminó su 48 h) → pasan a "vencido" y sus
   publicaciones/productos se **pausan** (se ocultan del feed).
2. **Suscripciones activas vencidas** (si algún día se dan) → igual: "vencido" +
   pausa.
3. **Vencidos sin gracia**: si llevan **más de 7 días vencidos**, sus
   publicaciones se **eliminan** (aparecen como eliminadas para siempre).
4. **Resetea el contador diario** de productos para todos los vendedores demo
   con contador > 0 (para que puedan publicar 5 otra vez al día siguiente).

**Cómo confirmar que corrió bien:**

1. En GitHub ve a tu repo → pestaña **Actions** → workflow
   **"Revisar suscripciones diarias"**.
2. Debe haber un run verde de aproximadamente hoy (salida programa `cron
   0 0 * * *`).
3. Clic en el run → "Ejecutar job..." → se ve la respuesta del backend con
   `ok: true` y un resumen como:
   `demosVencidos: 1, activosVencidos: 0, eliminadosPorGracia: 0, contadoresReseteados: 3`.

Si el run falla o no aparece, puedes dispararlo **manual**: botón **Run
workflow** en esa misma página.

## Qué hacer si "el backend tarda en responder"

Es normal. El hosting (Render) usa el **plan gratuito**: si nadie ha usado la
app en un rato, el servidor **se "duerme"** y la primera petición después de un
descanso tarda ~30–60 segundos en despertar. No es un error: la app responde
igual, solo más lento esa primera vez. Después todo va normal.

→ No reinicies nada ni borres. Abre la app, espera unos segundos y recarga si
hace falta.

## Datos sensibles y la garantía de que no se exponen

- **Número de carné de identidad (CI):** se guarda al crear la solicitud de
  vendedor en la tabla `VerificacionIdentidad` (solo accesible por el admin en
  el panel "Vendedores"; **no** aparece en perfiles públicos ni en respuestas de
  la API abierta).
- **Passwords:** se guardan como hash (`bcrypt`), nunca en claro; no se devuelven
  en ninguna respuesta.
- **Claves secretas** (`JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `JOB_SECRET_KEY`,
  tokens de Cloudinary/Firebase/Google): viven solo en las variables de entorno
  de **Render** (backend) y en los **Secrets de GitHub Actions** (frontend y
  job). No están escritas en el código ni en el repositorio.
- **Dónde está cada cosa:**
  | Qué | Dónde |
  |---|---|
  | Variables del backend | Dashboard de Render → servicio del backend → *Environment* |
  | Token de Cloudflare | GitHub → repo → *Settings → Secrets and variables → Actions* (`CLOUDFLARE_API_TOKEN`) |
  | Clave del job | GitHub Secrets (`JOB_SECRET_KEY`) y en Render (`JOB_SECRET_KEY`) — deben coincidir |
  | Google OAuth | Google Cloud Console → credenciales del client |

Si algún día alguien te pide el "CI" como admin, el único lugar donde debe
aparecer es dentro de una solicitud de vendedor en `/admin/vendedores`; nunca
fuera.