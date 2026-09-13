# Marketplace Moa

Marketplace local de compra/venta para Moa, Holguín, Cuba.

- **Frontend:** Next.js (App Router, TypeScript, Tailwind) → Cloudflare Pages
- **Backend:** Node.js + Express + Prisma → Render (free tier)
- **Base de datos:** PostgreSQL en Neon
- **Fotos:** Cloudinary (`f_auto`, `q_auto`)
- **Notificaciones:** Firebase Cloud Messaging (web push)
- **Auth:** Google OAuth + teléfono/contraseña (bcrypt), JWT + refresh token

Estructura:

```
backend/   -> API REST (auth, vendedores, publicaciones, feed, mensajería, notificaciones)
frontend/  -> SPA Next.js App Router
.github/   -> GitHub Actions (job diario de suscripciones)
```

## Módulos del backend — estado

| # | Módulo | Estado | Notas |
|---|--------|--------|-------|
| 1 | Auth | ✅ Listo | Google idToken, tel/contraseña, JWT 15m + refresh 30d httpOnly |
| 2 | Vendedores | ✅ Listo | Solicitud/revisión, aprobación (demo/exento/activo), gracia, reinicio diario contador |
| 3 | Job diario | ✅ Listo | Revisa suscripciones vencidas (>7d → elimina publicaciones); protegido con `X-Job-Key` |
| 4 | Publicaciones | ✅ Listo | 1–3 productos por publicación, fotos Cloudinary, límites demo (3/pub, 5/día, 10 total) |
| 5 | Feed | ✅ Listo | Ranking 0.5/0.35/0.15 (suscripción/recencia/reparto), filtros, búsqueda `pg_trgm` |
| 6 | Mensajería | ✅ Listo | Comprador↔vendedor; `producto_id` nullable; polling (sin WebSockets) |
| 7 | Notificaciones | ✅ Listo | `Notificacion` + `DeviceToken`; push FCM; `nuevo_mensaje` al escribir |

Otros modelos definidos en el schema pero sin endpoints aún: `ZonaDomicilio`,
`Favorito`, `Reporte`.

## Roadmap

- **Frontend** (Next.js → Cloudflare Pages) — no iniciado
- **Deploy** del backend a Render (reemplazar `<BACKEND-URL>` en el workflow) y
  `NEXT_PUBLIC_API_URL` real en Cloudflare
- Pendientes de infra:
  - `JOB_SECRET_KEY` en GitHub Secrets (el endpoint de `gh secret` daba 500/502
    del lado de GitHub en el momento de crearla)
  - Push de los commits locales una vez el incidente de GitHub esté resuelto