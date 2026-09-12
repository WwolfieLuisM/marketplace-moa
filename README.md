# Marketplace Moa

Marketplace local de compra/venta para Moa, Holguín, Cuba.

- **Frontend:** Next.js (App Router, TypeScript, Tailwind) → Cloudflare Pages
- **Backend:** Node.js + Express (o Fastify) + Prisma → Render (free tier)
- **Base de datos:** PostgreSQL en Neon
- **Fotos:** Cloudinary (f_auto, q_auto)
- **Notificaciones:** Firebase Cloud Messaging (web push)
- **Auth:** Google OAuth + teléfono/contraseña (bcrypt), JWT + refresh token

Estructura:

```
backend/   -> API REST (auth, usuarios, publicaciones, admin, mensajería)
frontend/  -> SPA Next.js App Router
.github/   -> GitHub Actions (job diario de suscripciones)
```