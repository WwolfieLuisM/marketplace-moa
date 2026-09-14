"use client";

// Capa única de acceso al backend. Todas las llamadas pasan por aquí.
// - credentials: "include" para que la cookie httpOnly del refresh token viaje
// - accessToken en memoria (Context), nunca en localStorage
// - ante 401: intenta POST /auth/refresh con la cookie, y si renueva, reintenta
//   la petición original UNA vez; si el refresh falla, limpia sesión y propaga
//   el error para que la página redirija a /login.

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const REFRESHED_ROUTE = "/auth/refresh";
const REFRESHED_PATHS = new Set([REFRESHED_ROUTE, "/auth/login", "/auth/register"]);

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type TokenHolder = { accessToken: string | null; setAccessToken: (t: string | null) => void };

let holder: TokenHolder = { accessToken: null, setAccessToken: () => {} };

export function bindToken(h: TokenHolder) {
  holder = h;
}

async function request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (holder.accessToken) headers["Authorization"] = `Bearer ${holder.accessToken}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !REFRESHED_PATHS.has(path)) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      // reintento único con el token nuevo
      const retryHeaders: Record<string, string> = {};
      if (body !== undefined) retryHeaders["Content-Type"] = "application/json";
      if (holder.accessToken) retryHeaders["Authorization"] = `Bearer ${holder.accessToken}`;
      const retry = await fetch(`${API_URL}${path}`, {
        method,
        headers: retryHeaders,
        credentials: "include",
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      return (await parseJson(retry)) as T;
    }
    holder.setAccessToken(null);
    const err = new ApiError(401, "Tu sesión expiró. Vuelve a iniciar sesión.");
    Object.defineProperty(err, "noRedirect", { value: false });
    throw err;
  }

  return (await parseJson(res)) as T;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}${REFRESHED_ROUTE}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.accessToken) {
      holder.setAccessToken(data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const message =
      (data as { error?: string })?.error ||
      (data as { message?: string })?.message ||
      `Error ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return data;
}

export const api = {
  get: <T = unknown>(path: string) => request<T>("GET", path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  put: <T = unknown>(path: string, body?: unknown) => request<T>("PUT", path, body),
  del: <T = unknown>(path: string) => request<T>("DELETE", path),
};