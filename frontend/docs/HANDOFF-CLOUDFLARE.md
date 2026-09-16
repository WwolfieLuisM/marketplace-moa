# HANDOFF — Deploy a Cloudflare con OpenNext (Next 15.5.25, Windows + pnpm)

Rol para quien retome: hacer el deploy del frontend a Cloudflare. Trabajo ya hecho
(hay un commit pusheado), el único paso pendiente es el build/deploy OpenNext.

## Contexto
- Repo: `https://github.com/WwolfieLuisM/marketplace-moa` (main = `5bbb97f`, todo pusheado).
- Frontend: `C:\Users\rosal\Desktop\marketplace-moa\frontend`
  (Next 15.5.25 App Router, React 19, Tailwind 4, TypeScript, **pnpm 12.4.1**).
- Backend ya en prod (Render + Neon) y verificado. Este trabajo es SOLO frontend.
- Objetivo original: "Cloudflare Pages". El CLI moderno de OpenNext despliega a
  **Workers + assets estáticos** (`wrangler deploy`), no al Pages antiguo. Mismo
  resultado práctico (hosting gratuito + custom domain).

## Estado actual (último intento de build)
- `@opennextjs/cloudflare@1.20.6` y `wrangler@4.20.0` YA instalados (deps del
  package.json, `pnpm ls` los muestra).
- Creados: `open-next.config.ts`, `wrangler.jsonc`, y scripts `preview`/`deploy`
  en package.json.
- Run: `npx opennextjs-cloudflare build` — **falla en el paso de esbuild** al
  empaquetar `.open-next/server-functions/default`:
  `Cannot read directory "....node_modules/react": Access is denied` (igual para
  react-dom y styled-jsx).
- El build de Next en sí YA PASA: `✓ Compiled successfully`, `Generating static
  pages (18/18)`.

## Causa raíz confirmada del fallo actual
- esbuild no puede leer los **symlinks** de pnpm que Next copia al standalone.
- Se verificó con un probe: `node` lee esos directorios (`len 6`) tanto en
  `.next/standalone/...` como en `.open-next/...`, pero **esbuild** falla solo en
  la copia `.open-next` (probe: FAIL open-next, OK standalone). Ambos symlinks
  tienen target `..\..\react@19.3.0\node_modules\react`.
- Bug conocido: esbuild + Windows no sigue bien symlinks de directorio
  sin `preserveSymlinks`. No hay flag fácil en OpenNext para eso.

## Historial de lo que ya se hizo (para no repetir)
1. `package.json`: `next` pasó `^15.5.6` → `^15.5.25` (peer de OpenNext).
2. `.npmrc` con `network-concurrency=1` + registry npmjs (fix crítico de esta red;
   sin eso `pnpm install` no baja nada, error 10054).
3. Instalación desde tarballs locales (`Desktop\cloudflare-1.20.6.tgz` y
   `wrangler-4.20.0.tgz`) → luego `package.json` cambiado a rangos `^` normales.
4. **Windows Developer Mode** habilitado (reg `AllowDevelopmentWithoutDevLicense=1`)
   para que Next pueda crear symlinks (antes: `EPERM: symlink ... operation not
   permitted`). REVERSIBLE: borrar esa clave.
5. `next.config.ts`: `outputFileTracingRoot` pasó de `path.join(__dirname, "..")`
   (repo root) a `__dirname` (frontend). Sin esto, el standalone quedaba anidado
   bajo `frontend/` y OpenNext no encontraba `pages-manifest.json`.
6. Fix de prerender: `useSearchParams()` sin Suspense rompía el build
   (`app/feed/page.tsx` y `app/mensajes/page.tsx`). Se envolvió el contenido en
   `<Suspense>`. `app/mensajes/[conversacionId]/page.tsx` usa useSearchParams pero
   es ruta dinámica y NO dio error (no tocar).

## Comandos útiles
```bash
cd C:\Users\rosal\Desktop\marketplace-moa\frontend
pnpm ls @opennextjs/cloudflare wrangler        # deps OK
npx tsc --noEmit                               # limpio
npx opennextjs-cloudflare build                # punto actual de falla
npm run build                                   # next build puro (pasa)
```

## Hipótesis / opciones para resolver el bloqueo (probar en orden)
1. **`pnpm` con linker hoisted** (elimina el árbol `.pnpm/.../node_modules` con
   symlinks): `.npmrc` → `node-linker=hoisted`, luego `pnpm install` y rebuild.
   Puede acelerar y evitar el problema de symlinks. OJO: tarda (5-6 min por la red).
2. **Reemplazar los symlinks por copias reales** en un postbuild script solo para
   `.open-next/server-functions/default/node_modules/.pnpm/*/node_modules`
   (reemplazar react/react-dom/styled-jsx/etc. con `Copy-Item -Recurse`). Hacky
   pero posible.
3. **Build del servidor en WSL/Linux** (OpenNext avisa que Windows "no está
   soportado al 100%"). Si hay WSL disponible, clonar/montar y buildear ahí.
4. **CI en GitHub Actions** con runner ubuntu: `pnpm install && pnpm deploy`
   (wrangler login vía CLOUDFLARE_API_TOKEN secreto). Más robusto que pelear en
   Windows.

## Después de que el build pase (siguientes pasos)
1. `npx wrangler login` (abre navegador; requiere cuenta Cloudflare del usuario).
2. `pnpm deploy` → despliega `moa-frontend` worker + assets.
3. Crear R2 bucket para cache incremental si se desea ISR:
   `npx wrangler r2 bucket create moa-frontend-opennext-cache` y añadirlo a
   `wrangler.jsonc`.
4. Env vars (secretos para wrangler):
   - `NEXT_PUBLIC_API_URL=https://moa-api-8y3i.onrender.com`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID=687233405771-a2k8kvlp3nb0ufme42dqjpduiicmokbq.apps.googleusercontent.com`
5. Custom domain → añadir en Google Cloud Console (Authorized JavaScript origins
   + redirect URIs) para que funcione el login con Google desde el dominio final.

## Archivos clave
- `frontend/package.json` — deps + scripts `preview`/`deploy`.
- `frontend/open-next.config.ts` — `defineCloudflareConfig()` sin overrides.
- `frontend/wrangler.jsonc` — `main: .open-next/worker.js`, name `moa-frontend`,
  nodejs_compat, sin R2 ni IMAGES (no se usan next/image ni ISR).
- `frontend/next.config.ts` — `outputFileTracingRoot: __dirname`.
- `frontend/docs/ESTADO-PARA-CLAUDE.md` — estado general del proyecto.
- `frontend/app/feed/page.tsx`, `frontend/app/mensajes/page.tsx` — fix Suspense.