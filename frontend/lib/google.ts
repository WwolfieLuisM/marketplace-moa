"use client";

// Google Identity Services (GIS). El frontend nunca toca el client secret:
// solo inicializa el SDK y entrega el idToken al backend vía /auth/google.
//
// El <Script> de page.tsx usa strategy="afterInteractive": window.google puede
// no existir cuando corre el useEffect. Estas funciones hacen POLLING hasta
// que el SDK carga (o dan timeout) en vez de fallar en silencio como antes.

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (opts: {
            client_id: string;
            callback: (resp: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, opts: Record<string, unknown>) => void;
          prompt: (callback?: (notification: { isNotDisplayed?: () => boolean }) => void) => void;
        };
      };
    };
  }
}

export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "687233405771-a2k8kvlp3nb0ufme42dqjpduiicmokbq.apps.googleusercontent.com";

let credentialHandler: ((idToken: string) => void) | null = null;
let instalado = false;

function waitForGoogle({ timeoutMs = 8000 } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (window.google?.accounts?.id) {
        resolve(true);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(false);
        return;
      }
      setTimeout(check, 250);
    };
    check();
  });
}

async function instalarCredencial(): Promise<boolean> {
  const listo = await waitForGoogle();
  const g = window.google?.accounts?.id;
  if (!listo || !g) return false;
  if (!instalado) {
    g.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (resp) => {
        if (resp?.credential) credentialHandler?.(resp.credential);
      },
    });
    instalado = true;
  }
  return true;
}

// Botón oficial renderizado por GIS. Resuelve true si el SDK cargó y el botón
// se dibujó en el contenedor; false si el SDK no llegó en `timeoutMs`.
export async function renderGoogleButton(
  containerId: string,
  onCredential: (idToken: string) => void,
): Promise<boolean> {
  credentialHandler = onCredential;
  const enListo = await instalarCredencial();
  const g = window.google?.accounts?.id;
  if (!enListo || !g) return false;
  const el = document.getElementById(containerId);
  if (!el) return false;
  const width = Math.max(el.parentElement?.clientWidth || 0, 200);
  g.renderButton(el, {
    type: "standard",
    theme: "outline",
    size: "large",
    shape: "rectangular",
    logo_alignment: "left",
    width,
    locale: "es",
    text: "continue_with",
  });
  return true;
}

// Alternativa vía One Tap (prompt). Se usa como fallback si el botón estándar
// no pudo dibujarse (p. ej. SDK lento o bloqueado). Resuelve true si el SDK
// quedó listo y se disparó el prompt; el idToken llega por onCredential.
export async function promptGoogleLogin(
  onCredential: (idToken: string) => void,
): Promise<boolean> {
  credentialHandler = onCredential;
  const enListo = await instalarCredencial();
  const g = window.google?.accounts?.id;
  if (!enListo || !g) return false;
  try {
    g.prompt(() => {
      // One Tap cerrado sin credencial; no propagamos estado aquí.
    });
    return true;
  } catch {
    return false;
  }
}