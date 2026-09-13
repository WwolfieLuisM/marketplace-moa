# Botón "Iniciar sesión con Google" — Frontend

El frontend NUNCA toca el client secret ni redirige a ningún callback.
Todo el flujo usa **Google Identity Services (GIS)** en el navegador y
entrega el **idToken** al backend vía `POST /auth/google`.

## Client ID (clave pública, lo usa el navegador)

```
687233405771-a2k8kvlp3nb0ufme42dqjpduiicmokbq.apps.googleusercontent.com
```

En local ya está autorizado el origin `http://localhost:3000`. Para
producción hay que agregar el dominio de Cloudflare Pages en el OAuth
client (pestaña Credentials → nuestro client web), además del localhost.

## Cómo implementar el botón

1. Carga el SDK una sola vez (en el layout o página de login):

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

2. Inicializa GIS con el client ID. El callback recibe `credential`, que
   ES el idToken (un JWT). NO lo decodifiques en el frontend: envíalo tal
   cual al backend para que lo verifique.

```ts
// lib/google.ts
export function initGoogleLogin(onToken: (idToken: string) => void) {
  if (typeof window === "undefined" || !(window as any).google) return;
  (window as any).google.accounts.id.initialize({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    callback: (resp) => onToken(resp.credential),
  });
  (window as any).google.accounts.id.renderButton(
    document.getElementById("google-button"),
    { type: "standard", theme: "outline", size: "large" }
  );
}
```

3. Al recibir el idToken, lo mandas al backend:

```ts
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/google`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",              // para que guarde el refresh cookie
  body: JSON.stringify({ idToken }),
});
const { accessToken, user } = await res.json();
```

4. Guarda el `accessToken` (memoria o storage efímero) y deja que la
   cookie httpOnly `refresh_token` viva sola para renovar sesión con
   `POST /auth/refresh`.

## Reglas

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` va en las env vars del frontend
  (Cloudflare Pages). El secret es del backend, el navegador jamás lo ve.
- El backend verifica el idToken con el client ID real; cualquier token
  falso/inválido es rechazado con 401.
- Si Google responde 403 desde una red local (como la VPN en Cuba), es
  restricción de red, no de la app: en producción (Cloudflare/Render)
  funciona normal.