# HANDOFF — Deploy del frontend a Cloudflare (OpenNext vía CI)

El frontend ya se despliega a Cloudflare **automáticamente por CI** (GitHub
Actions en runner Ubuntu). Este doc es la referencia de mantenimiento: cómo
funciona, cómo se dispara, cómo verificarlo y qué tocar cuando haya cambios.

## Estado actual (RESUELTO y en producción)
- **URL de producción:** https://moa-frontend.luisiking89.workers.dev (HTTP 200).
- Deploy automático desde GitHub Actions con el workflow
  `.github/workflows/deploy-frontend.yml`.
- Último deploy OK: run `35060076852` en main (commit `6a675cc`).
- El build local en **Windows falla** (esbuild + symlinks de pnpm), pero es
  irrelevante: el deploy oficial es el de CI en Ubuntu, que funciona.

## Cómo funciona el deploy (CI)
1. Se dispara en **push a `main`** con cambios bajo `frontend/**`, o de forma
   manual desde **Actions → "Deploy frontend a Cloudflare" → Run workflow**.
2. Runner `ubuntu-latest`, **Node 22** (wrangler 4.x exige ≥22; con Node 20 el
   paso de deploy falla con "requires at least Node.js v22.0.0").
3. `pnpm install --frozen-lockfile` (usa el `pnpm-lock.yaml` del repo).
4. `pnpm run deploy` = `opennextjs-cloudflare build && opennextjs-cloudflare deploy`.
   - Build en Ubuntu pasa siempre (los 18/18 estáticos + worker).
   - El default `incrementalCache: "dummy"` no requiere R2 ("does not need
     populating"), así que NO hace falta crear bucket.
5. `wrangler deploy` usa el token del secret **`CLOUDFLARE_API_TOKEN`**.

### Secrets de GitHub (configurados)
| Secret | Uso |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Token de Cloudflare (template **Edit Cloudflare Workers**, Account+Zone resources = All, SIN filtro de IP porque los runners usan IPs dinámicas) |
| `JOB_SECRET_KEY` | Job diario del backend (`revisar-suscripciones.yml`) — no tocar |

### Env vars del build (hardcodeadas en el workflow)
- `NEXT_PUBLIC_API_URL=https://moa-api-8y3i.onrender.com`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID=687233405771-a2k8kvlp3nb0ufme42dqjpduiicmokbq.apps.googleusercontent.com`

Son públicas (`NEXT_PUBLIC_*`), van en el paso "Build con OpenNext". Si cambian,
editar el workflow.

## Comandos útiles (mantenimiento)
```bash
# Ver último run y su estado
gh run list --repo WwolfieLuisM/marketplace-moa --workflow deploy-frontend.yml --limit 1
gh run view <RUN_ID> --repo WwolfieLuisM/marketplace-moa

# Ver el log del job / del build
gh run view <RUN_ID> --repo WwolfieLuisM/marketplace-moa --log-failed

# Re-disparar manualmente
gh workflow run deploy-frontend.yml --repo WwolfieLuisM/marketplace-moa
# (o desde el botón "Run workflow" en la pestaña Actions del repo)
```

## Despliegue local (opcional, SOLO si el CI no estuviera disponible)
Requiere Node 22:
```bash
cd frontend
pnpm install --frozen-lockfile
set CLOUDFLARE_API_TOKEN=<token> & pnpm run deploy   # seguro: usa tu token del dashboard
# O con login interactivo:
pnpm run preview   # simula local; pnpm run deploy   # sube de verdad
```
En Windows el build de OpenNext falla a mitad (esbuild + symlinks de pnpm:
`Cannot read directory ".../node_modules/react": Access is denied`). No fue
resuelto y ya no importa — el deploy oficial es por CI.

## Fallo histórico del build local en Windows (referencia, no bloquea)
- esbuild ♯ puede leer symlinks de directorio de pnpm solo en `.open-next` (probe:
  node OK en ambos, esbuild FAIL solo en `.open-next`; standalone OK). Bug conocido.
- No se intentaron las mitigaciones (node-linker=hoisted, postbuild con copias,
  WSL) porque se eligió CI en Ubuntu (opción robusta, runner limpio).
- **Windows Developer Mode** quedó habilitado (reg
  `AllowDevelopmentWithoutDevLicense=1`) pata permitir symlinks de Next. No es
  necesario ya; reversible borrando esa clave, pero no hacer daño dejarlo.

## Próximos pasos pendientes
1. **Google OAuth del dominio:** el login con Google desde
   `https://moa-frontend.luisiking89.workers.dev` requiere registrar esa URL en
   Google Cloud Console → proyecto del client `687233405771-...` → Credenciales →
   editar el client → *Authorized JavaScript origins* y *redirect URIs*.
2. (Opcional) R2 para ISR: crear bucket y añadir binding en `wrangler.jsonc`. La
   app no usa `next/image` ni `revalidate`, así que no hace falta por ahora.
3. (Opcional) Custom domain propio en vez del `*.workers.dev` — añadir zona/ruta
   en Cloudflare + re-registrar en Google OAuth.

## Archivos clave
- `.github/workflows/deploy-frontend.yml` — todo el pipeline CI/CD. **El único
  archivo que se toca para mantenimiento del deploy.**
- `frontend/package.json` — deps `@opennextjs/cloudflare ^1.20.6`, `wrangler ^4.20.0`; scripts `preview`/`deploy`.
- `frontend/wrangler.jsonc` — `main: .open-next/worker.js`, name `moa-frontend`,
  `nodejs_compat`, sin R2 ni IMAGES.
- `frontend/open-next.config.ts` — `defineCloudflareConfig()` sin overrides.
- `frontend/next.config.ts` — `outputFileTracingRoot: __dirname`.
- `frontend/.npmrc` — `network-concurrency=1` + registry (fix de red local; se
  copia al runner y funciona igual en CI).
- `frontend/docs/ESTADO-PARA-CLAUDE.md` — estado general del proyecto.