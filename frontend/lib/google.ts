"use client";

// Google Identity Services (GIS). El frontend nunca toca el client secret:
// solo llama al render del botón y entrega el idToken al backend vía /auth/google.

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
        };
      };
    };
  }
}

export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "687233405771-a2k8kvlp3nb0ufme42dqjpduiicmokbq.apps.googleusercontent.com";

export function renderGoogleButton(
  containerId: string,
  onCredential: (idToken: string) => void,
) {
  const g = window.google?.accounts?.id;
  if (!g) return;
  g.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (resp) => {
      if (resp?.credential) onCredential(resp.credential);
    },
  });
  const el = document.getElementById(containerId);
  if (el) {
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
  }
}