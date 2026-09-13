# Backend — Marketplace Moa

API REST (Express + Prisma) desplegada en Render. PostgreSQL en Neon,
fotos en Cloudinary, push con Firebase Cloud Messaging.

## Módulos (montados en `src/app.js`)

- `/auth` — registro, login (local y Google), refresh, me
- `/vendedores` — solicitud, aprobación, perfil, gracia
- `/publicaciones` — crear (1–3 productos, fotos, límites demo), detalle, marcar producto, soft delete
- `/feed` — feed rankeado (0.5/0.35/0.15), búsqueda trigram, categorías
- `/mensajes` — enviar (con o sin `producto_id`), conversaciones, hilo, no-leídos
- `/notificaciones` — listar/marcar/contar notificaciones, registrar/eliminar device tokens
- `/admin/jobs` — job diario de suscripciones (protegido por `X-Job-Key`)

## Scripts (en `scripts/`)

- `probar-publicaciones.mjs` / `probar-mensajes.mjs` / `probar-notificaciones.mjs` — suites E2E contra `http://localhost:3001`
- `verificar-job.mjs` / `setup-prueba-job.mjs` — setup y verificación del job diario
- `limpiar-pruebas-publicaciones.mjs` — borra usuarios de prueba (`panadero.*`, `mensajero.*`, `comprador.*`, `notif.*`) y sus dependencias

> Los scripts de prueba se ejecutan con el node de `C:\NODE\node-v22.20.0-win-x64\node.exe`
> y con el workdir del backend (necesario para que `dotenv` lea `.env`).

## Variables de entorno (ver `.env`)

`DATABASE_URL`, `DIRECT_URL`, `CLOUDINARY_*`, `FIREBASE_PROJECT_ID` +
`FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` (una sola línea con `\n`),
`JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`JOB_SECRET_KEY`, `NEXT_PUBLIC_API_URL`, `FRONTEND_URL`.