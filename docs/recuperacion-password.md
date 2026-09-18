# Validación de contraseña + Recuperación con Gmail SMTP (Nodemailer)

Guía de pasos para implementar y probar dos mejoras al módulo de Auth de
Marketplace Moa. Referencia original: `prompt-recuperacion-password.md`.

Estado actual:
- **Parte 1 (validaciA3n en registro): COMPLETADA** e integrada.
- **Parte 2 (recuperaciA3n con Gmail SMTP): COMPLETADA** y en producciA3n.
  - MigraciA3n `TokenRecuperacion` aplicada a Neon (branch `production`).
  - Prueba punta a punta OK (olvide-password -> correo -> restablecer -> login).
  - Desplegado: backend Render + frontend Cloudflare Worker via CI/CD (push a main).

---

## Parte 1 — Validación de contraseña en registro (COMPLETADA)

### Objetivo
Rechazar contraseñas débiles al registrarse sin reglas de complejidad que
friccionen (sin exigir mayúsculas/números/símbolos).

### Reglas aplicadas
1. Mínimo **8 caracteres**.
2. Lista débil hardcodeada (sin librería de diccionario):
   `12345678`, `password`, `contraseña`, `11111111`, `87654321`.
3. No puede ser igual al **email** ni al **nombre** del usuario.
4. Mensajes de error específicos (no genéricos):
   - `La contraseña debe tener al menos 8 caracteres`
   - `Esa contraseña es muy común, elige otra`
   - `La contraseña no puede ser igual a tu email o nombre`

Se ignora la duplicación de reglas entre cliente y servidor: el **servidor es
la fuente de verdad**; el cliente valida primero para UX, y re-verifica el
mensaje que devuelve la API.

### Pasos seguidos

#### Backend
1. Crear `backend/src/modules/auth/password.js`:
   - Exporta `CLAVES_DEBILES` (`Set`) y `validarPassword(password, { email, nombre })`.
   - Lanza `Object.assign(new Error(msg), { status: 400 })` ante cada violación.
   - Comentario clave: es una util compartida para reutilizarse en
     `restablecer-password` (Parte 2).
2. En `backend/src/modules/auth/auth.service.js`:
   - Importar `validarPassword` desde `./password.js`.
   - En `register()`, tras normalizar el email, llamar
     `validarPassword(password, { email: emailNormalizado, nombre })`.
   - El error fluye al frontend vía `errorHandler` (`{ error: message }`).

#### Frontend
3. Extender `frontend/components/Input.tsx`:
   - Nuevo prop opcional `hint?: ReactNode` que se renderiza bajo el input
     (un `<p className="mt-1.5 text-[12.5px]">`). No altera el comportamiento
     existente de `label`, `icon`, `right`.
4. En `frontend/app/registro/RegistroForm.tsx`:
   - Añadir `CLAVES_DEBILES` y función `validarPassword()` en cliente (espejo
     exacto de la del backend).
   - Estado nuevo `errorPassword` (el error del campo, separado de `error`).
   - En `onSubmit`: si `validarPassword` devuelve mensaje, se setea en
     `errorPassword` y se aborta el envío.
   - En el `catch`: si el mensaje de la API coincide con los tres mensajes de
     contraseña, va a `errorPassword` (bajo el campo); si no, al `ErrorBanner`
     superior.
   - El campo contraseña ahora recibe `hint`:
     - Si `errorPassword` existe: texto rojo (`text-red-600`).
     - Si no, y hay texto: contador `{password.length}/8 caracteres`, verde
       (`text-success`) al llegar a 8, gris (`text-slate-muted`) antes.
     - Si el campo está vacío: sin hint.

### Archivos tocados
- `backend/src/modules/auth/password.js` (nuevo)
- `backend/src/modules/auth/auth.service.js`
- `frontend/components/Input.tsx`
- `frontend/app/registro/RegistroForm.tsx`

### Checkpoint 1 (pruebas)
Con `npm run dev` en `frontend/`, entrar a `/registro`:
1. Contraseña de 6 caracteres → rechaza, mensaje rojo bajo el campo.
2. `12345678` → rechaza por lista débil.
3. Contraseña igual al email/nombre → rechaza por coincidencia.
4. Contraseña válida (p. ej. `miclave2026`) → acepta; contador verde al llegar a 8.

Verificación técnica:
- Backend: `node --check src/modules/auth/password.js` y
  `node --check src/modules/auth/auth.service.js` (sin salida = OK).
- Frontend: `npm run build` en `frontend/` → `Compiled successfully`.

---

## Parte 2 — Recuperación de contraseña con Gmail SMTP (Nodemailer)

Proveedor de correo: **Gmail SMTP** con contraseña de aplicación (16 caracteres,
generada desde la cuenta de Google). Ventaja: sin dependencias de servicios
terceros, sin necesidad de verificar dominios (envía directamente desde la
cuenta de Gmail del propietario).

### Requisitos externos
1. **Contraseña de aplicación de Gmail** — generada desde
   myaccount.google.com/apppasswords. Se guarda como:
   - `GMAIL_SMTP_USER`: correo Gmail (p.ej. `micorreo@gmail.com`).
   - `GMAIL_SMTP_PASS`: la contraseña de 16 caracteres (sin espacios).

   Sin ellas, `correoConfigurado` queda `false`, el backend loguea un warning
   y el endpoint responde igual sin enviar el correo.

### Backend

#### Instalación
2. Instalar Nodemailer: `npm install nodemailer` dentro de `backend/`.

#### Configuración de Nodemailer
3. Creado `backend/src/lib/mailer.js` (patrón de `lib/cloudinary.js`/`lib/firebase.js`):
   - Transporter con `host: smtp.gmail.com`, `port: 587`, `secure: false` (STARTTLS).
   - Exporta `correoConfigurado` y `enviarCorreoRecuperacion(destinatario, link)`.
   - HTML simple con el enlace de restablecimiento (sin diseño elaborado).

#### Modelo de datos (en `backend/prisma/schema.prisma`)
3. Modelo agregado: `TokenRecuperacion`.

4. **Mostrar el cambio al product owner ANTES de migrar** contra Neon, mismo
   flujo que con las tablas originales. Luego `npx prisma generate` y migrar.

#### Endpoints (en `backend/src/modules/auth/auth.routes.js` + `auth.service.js`)
5. `POST /auth/olvide-password { email }`:
   - Buscar el usuario por email.
   - Solo si existe Y `authProvider === "local"` (nunca Google-only).
   - Generar token aleatorio seguro; guardarlo con
     `expiraEn = ahora + 30 minutos`.
   - Enviar correo con `enviarCorreoRecuperacion`, link tipo
     `{FRONTEND_BASE_URL}/restablecer?token=XXX`.
   - **SIEMPRE responder el mismo mensaje genérico**, exista o no la cuenta:
     por seguridad no debe revelarse si el email está registrado.
6. `POST /auth/restablecer-password { token, nuevaPassword }`:
   - Validar token: existe, no usado, no expirado.
   - Aplicar `validarPassword` (reutilizar util de la Parte 1).
   - Actualizar `password_hash`, marcar el token como usado.
   - Token inválido/expirado → error claro.

Nota sobre la URL del link: NO queda hardcodeada la URL de producción.
Se usa la env `FRONTEND_BASE_URL`
(dev: `http://localhost:3000`, prod: `https://moa-frontend.luisiking89.workers.dev`).
Ya definida en `.env` (dev) y en `render.yaml` (prod).

Remitente: se usa la cuenta de Gmail como `from`. Sin dominio verificado
(importante: el remitente es el propio `GMAIL_SMTP_USER`, no una dirección
arbitraria). Si en el futuro se migra a un proveedor dedicado, solo cambia
`lib/mailer.js`; la lógica de negocio permanece.

#### Limpieza
7. Opcional/baja prioridad: no hace falta borrar tokens expirados activamente.

### Frontend

8. Página `/olvide-password`:
   - Formulario solo con email, mismo estilo que `/login` (`<Button>`,
     `<Input>`, `<ErrorBanner>`).
   - Al enviar, muestra SIEMPRE el mensaje genérico de éxito (nunca confirmar
     ni negar si el email existe).
9. Página `/restablecer`:
   - Leer `token` del query param.
   - Formulario de nueva contraseña con el toggle mostrar/ocultar (el ojo que
     ya existe en `/login`).
   - Validación cliente idéntica a la Parte 1 antes de enviar.
   - Si el backend responde token inválido/expirado → mensaje claro + link para
     pedir uno nuevo.
10. En `/login`, añadir el link "¿Olvidaste tu contraseña?" → `/olvide-password`.
    (Se omitió antes porque la página no existía; ahora existe.)

### Checkpoint final (Parte 2)
Flujo completo punta a punta:
pedir recuperación con un email real de prueba → recibir el correo → clic en el
link → cambiar la contraseña → confirmar que el login con la nueva funciona.

---

## Restricciones del proyecto que se mantienen

- SVG inline sin librerías de íconos, **cero emojis**.
- Paleta del tema: `#ea580c` (brand) / `#0f172a` (ink) / `#f8fafc` (surface).
- Mobile-first.
- `lib/api.ts` como único punto de fetch (no `fetch` suelto en las páginas
  nuevas).
- Access token en memoria (nunca en `localStorage`).
- Comunicación backend → frontend vía `ApiError` (`status` + `code`).
  `lib/api.ts` ya propaga `code` desde la respuesta del servidor; el frontend
  de login ya está preparado para `code === "GOOGLE_ONLY_ACCOUNT"`.

## Despliegue

- Backend: Render (ver `render.yaml`); agregar `GMAIL_SMTP_USER` y
  `GMAIL_SMTP_PASS` (sync: false en el dashboard) y fijar `FRONTEND_BASE_URL`
  a `https://moa-frontend.luisiking89.workers.dev`.
- Frontend: Worker de Cloudflare (`deploy` con opennextjs).