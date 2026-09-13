"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://moa-api-8y3i.onrender.com";

type Resultado = {
  metodo: string;
  status: number | null;
  cuerpo: string;
};

export default function PingPage() {
  const [feed, setFeed] = useState<Resultado | null>(null);
  const [login, setLogin] = useState<Resultado | null>(null);
  const [refresh, setRefresh] = useState<Resultado | null>(null);
  const [me, setMe] = useState<Resultado | null>(null);
  const [cargando, setCargando] = useState<string | null>(null);
  const [cuenta, setCuenta] = useState("smoke.prueba@test.com");
  const [password, setPassword] = useState("smoketest123");
  const [accessToken, setAccessToken] = useState<string | null>(null);

  async function pedir(metodo: string, path: string, body?: unknown): Promise<Resultado> {
    setCargando(`${metodo} ${path}`);
    try {
      const res = await fetch(`${API}${path}`, {
        method: metodo,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const cuerpo = await res.text();
      return { metodo: `${metodo} ${path}`, status: res.status, cuerpo };
    } catch (e) {
      return {
        metodo: `${metodo} ${path}`,
        status: null,
        cuerpo: String(e instanceof Error ? e.message : e),
      };
    } finally {
      setCargando(null);
    }
  }

  async function probarFeed() {
    setFeed(await pedir("GET", "/feed"));
  }

  async function probarLogin() {
    const r = await pedir("POST", "/auth/login", { cuenta, password });
    setLogin(r);
    let token: string | null = null;
    if (r.status === 200 && r.cuerpo) {
      try {
        token = (JSON.parse(r.cuerpo) as { accessToken?: string }).accessToken ?? null;
      } catch {
        token = null;
      }
    }
    setAccessToken(token);
    setRefresh(null);
    setMe(null);
  }

  async function probarRefresh() {
    setRefresh(await pedir("POST", "/auth/refresh"));
  }

  async function probarMe() {
    if (!accessToken) {
      setMe({ metodo: "GET /auth/me", status: null, cuerpo: "Primero hace login para obtener el access token" });
      return;
    }
    const res = await fetch(`${API}/auth/me`, {
      method: "GET",
      credentials: "include",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setMe({ metodo: "GET /auth/me", status: res.status, cuerpo: await res.text() });
  }

  function Caja({ r }: { r: Resultado | null }) {
    if (!r) return null;
    const color = r.status !== null && r.status >= 200 && r.status < 300 ? "border-green-500" : "border-red-500";
    return (
      <div className={`mt-3 rounded-md border p-3 ${color}`}>
        <p className="text-xs font-mono text-neutral-500">{r.metodo} → {r.status ?? "error red"}</p>
        <pre className="mt-2 overflow-x-auto text-xs whitespace-pre-wrap bg-white p-2 rounded" dir="ltr">{r.cuerpo}</pre>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-xl font-semibold">Smoke test frontend ↔ backend</h1>
      <p className="mt-1 text-sm text-neutral-600">
        API: <code className="bg-white px-1 rounded">{API}</code> · cargando: {cargando ?? "ninguna"}
      </p>

      <section className="mt-8">
        <h2 className="font-medium">1. Endpoint público</h2>
        <button
          onClick={probarFeed}
          className="mt-2 rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
        >
          GET /feed
        </button>
        <Caja r={feed} />
      </section>

      <section className="mt-8">
        <h2 className="font-medium">2. Login (cookie httpOnly del refresh token)</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={cuenta}
            onChange={(e) => setCuenta(e.target.value)}
            className="rounded border px-2 py-1 text-sm"
            placeholder="email o teléfono"
          />
          <input
            value={password}
            type="password"
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border px-2 py-1 text-sm"
            placeholder="contraseña"
          />
          <button onClick={probarLogin} className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">
            POST /auth/login
          </button>
        </div>
        {accessToken && <p className="mt-2 text-xs text-green-700">Access token obtenido (primeros 24 chars): {accessToken.slice(0, 24)}…</p>}
        <Caja r={login} />

        <h3 className="mt-4 text-sm font-medium">
          2b. ¿La cookie viaja de vuelta? (prueba definitiva del refresh)
        </h3>
        <button
          onClick={probarRefresh}
          className="mt-2 rounded-md border border-neutral-900 px-4 py-2 text-sm"
        >
          POST /auth/refresh (envía la cookie httpOnly)
        </button>
        {refresh?.status === 200 ? (
          <p className="mt-2 text-xs text-green-700">✓ La cookie se guardó y se envió correctamente (SameSite=None; Secure).</p>
        ) : null}
        <Caja r={refresh} />

        <button onClick={probarMe} className="mt-4 rounded-md border border-neutral-900 px-4 py-2 text-sm">
          GET /auth/me (con Bearer token)
        </button>
        <Caja r={me} />
      </section>

      <p className="mt-10 text-xs text-neutral-500">
        Verifica en DevTools: Application → Cookies → https://moa-api-8y3i.onrender.com → la cookie
        <code className="bg-white px-1 rounded">refresh_token</code> debe existir, ser <code className="bg-white px-1 rounded">HttpOnly</code>,
        <code className="bg-white px-1 rounded">Secure</code> y <code className="bg-white px-1 rounded">SameSite=None</code>.
      </p>
    </main>
  );
}