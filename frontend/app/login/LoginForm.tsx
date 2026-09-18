"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { IconEye, IconEyeOff, IconLock, IconLogo, IconMail, IconWarning } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { promptGoogleLogin, renderGoogleButton } from "@/lib/google";
import { useAuth } from "@/lib/auth";

const ERROR_CONEXION = "No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.";
const GOOGLE_TIMEOUT_MS = 8000;

export default function LoginForm() {
  const router = useRouter();
  const { usuario, cargando, login, loginGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cuentaGoogle, setCuentaGoogle] = useState(false);

  // Estado del botón de Google
  const [googleListo, setGoogleListo] = useState(false); // SDK cargó + botón oficial dibujado
  const [googleCargando, setGoogleCargando] = useState(true); // esperando SDK / flujo en curso
  const [googleFallo, setGoogleFallo] = useState(false); // el SDK no llegó a tiempo
  const [googleTimeout, setGoogleTimeout] = useState(false); // tardando más de lo normal

  const googleId = useRef("google-button");
  const googleTimer = useRef<number | null>(null);

  const limpiarGoogleTimer = useCallback(() => {
    if (googleTimer.current !== null) {
      window.clearTimeout(googleTimer.current);
      googleTimer.current = null;
    }
  }, []);

  // si ya hay sesión, fuera del login
  useEffect(() => {
    if (usuario && !cargando) router.replace("/feed");
  }, [usuario, cargando, router]);

  const manejarCredencialGoogle = useCallback(
    (idToken: string) => {
      limpiarGoogleTimer();
      setGoogleTimeout(false);
      setGoogleCargando(true);
      setError(null);
      setCuentaGoogle(false);
      loginGoogle(idToken)
        .then(() => router.replace("/feed"))
        .catch((e) =>
          setError(e instanceof ApiError ? e.message : ERROR_CONEXION),
        )
        .finally(() => setGoogleCargando(false));
    },
    [loginGoogle, router, limpiarGoogleTimer],
  );

  // Carga el botón oficial de Google. El SDK carga con afterInteractive, así que
  // puede no existir aún: renderGoogleButton hace polling hasta 8s; si no llega,
  // pasamos al botón propio (fallback) para que el login con Google sea usable.
  const cargarGoogle = useCallback(() => {
    setGoogleCargando(true);
    setGoogleFallo(false);
    setGoogleTimeout(false);
    limpiarGoogleTimer();
    googleTimer.current = window.setTimeout(() => setGoogleTimeout(true), GOOGLE_TIMEOUT_MS);

    renderGoogleButton(googleId.current, manejarCredencialGoogle).then((ok) => {
      limpiarGoogleTimer();
      setGoogleTimeout(false);
      setGoogleCargando(false);
      if (ok) {
        setGoogleListo(true);
        setGoogleFallo(false);
      } else {
        setGoogleListo(false);
        setGoogleFallo(true);
      }
    });
  }, [manejarCredencialGoogle, limpiarGoogleTimer]);

  useEffect(() => {
    cargarGoogle();
    return limpiarGoogleTimer;
  }, [cargarGoogle, limpiarGoogleTimer]);

  // Fallback: botón propio que abre One Tap (prompt) y entrega el idToken.
  const iniciarFallback = useCallback(() => {
    setGoogleCargando(true);
    setGoogleFallo(false);
    setGoogleTimeout(false);
    limpiarGoogleTimer();
    googleTimer.current = window.setTimeout(() => setGoogleTimeout(true), GOOGLE_TIMEOUT_MS);
    // One Tap (prompt) abierto: el idToken llega por onCredential cuando el
    // usuario elige cuenta. Si sí se abrió, dejamos correr el timer: si en 8s
    // no llegó credencial, aparece el hint "tardando" + Reintentar.
    promptGoogleLogin(manejarCredencialGoogle).then((ok) => {
      if (!ok) {
        limpiarGoogleTimer();
        setGoogleTimeout(false);
        setGoogleCargando(false);
        setGoogleFallo(true);
      }
    });
  }, [manejarCredencialGoogle, limpiarGoogleTimer]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCuentaGoogle(false);
    setEnviando(true);
    try {
      await login(email, password);
      router.replace("/feed");
    } catch (err) {
      if (err instanceof ApiError) {
        // El backend puede indicar que esta cuenta se creó con Google y
        // no tiene contraseña propia; se muestra un aviso con el botón de Google.
        if (err.code === "GOOGLE_ONLY_ACCOUNT") {
          setCuentaGoogle(true);
        } else {
          setError(err.message);
        }
      } else {
        setError(ERROR_CONEXION);
      }
    } finally {
      setEnviando(false);
    }
  }

  const GoogleLogo = (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.36 0-4.35-1.6-5.06-3.74H.9v2.33A9 9 0 009 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.94 10.68A5.4 5.4 0 013.64 9c0-.58.1-1.15.3-1.68V4.99H.9A9 9 0 000 9c0 1.45.35 2.83.9 4.01l3.04-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 00.9 4.99l3.04 2.33C4.65 5.18 6.64 3.58 9 3.58z"
      />
    </svg>
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-10">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[400px] rounded-[20px] bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <IconLogo className="h-9 w-9" />

          <h1 className="mt-2 text-[22px] font-bold text-ink">Marketplace Moa</h1>
          <p className="text-[14px] text-slate-muted">Compra y vende en tu comunidad</p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-[18px] flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700"
          >
            <IconWarning className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {cuentaGoogle && (
          <div
            role="status"
            className="mb-[18px] flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-[13px] text-blue-700"
          >
            <IconWarning className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Esta cuenta inició sesión con Google. Usa el botón "Continuar con Google" — no tiene
              contraseña propia.
            </span>
          </div>
        )}

        <Input
          id="email"
          label="Correo electrónico"
          type="email"
          placeholder="tucorreo@ejemplo.com"
          autoComplete="email"
          icon={<IconMail className="h-[18px] w-[18px]" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          id="password"
          label="Contraseña"
          type={mostrarPassword ? "text" : "password"}
          placeholder="••••••••"
          autoComplete="current-password"
          icon={<IconLock className="h-[18px] w-[18px]" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          right={
            <button
              type="button"
              aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="flex h-[30px] w-[30px] items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              onClick={() => setMostrarPassword((v) => !v)}
            >
              {mostrarPassword ? (
                <IconEyeOff className="h-[19px] w-[19px]" />
              ) : (
                <IconEye className="h-[19px] w-[19px]" />
              )}
            </button>
          }
        />

        <div className="mb-4 text-right">
          <Link
            href="/olvide-password"
            className="text-[13px] font-semibold text-brand hover:text-brand-dark"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <Button type="submit" disabled={enviando} className="w-full">
          {enviando && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
          {enviando ? "Entrando..." : "Iniciar sesión"}
        </Button>

        <div className="my-[22px] flex items-center gap-3 text-[12px] text-slate-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
          o continúa con
        </div>

        {/* Contenedor del botón oficial de GIS: SIEMPRE en el DOM, porque
            renderGoogleButton lo busca tras esperar el SDK. Visible solo cuando
            el botón quedó dibujado. */}
        <div
          id="google-button"
          className={
            googleListo && !googleFallo
              ? "flex min-h-[44px] w-full items-center justify-center"
              : "hidden"
          }
        />

        {googleCargando && (
          <button
            type="button"
            disabled
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-line bg-white px-4 text-[14px] font-semibold text-slate-700 opacity-70"
          >
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
            Cargando Google...
          </button>
        )}

        {!googleCargando && googleFallo && (
          <button
            type="button"
            onClick={iniciarFallback}
            disabled={googleCargando}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-line bg-white px-4 text-[14px] font-semibold text-slate-700 transition-colors duration-150 hover:border-slate-300 disabled:opacity-60"
          >
            {GoogleLogo}
            Continuar con Google
          </button>
        )}

        {googleTimeout && (
          <p className="mt-3 text-center text-[12px] text-slate-muted">
            Esto está tardando más de lo normal.{" "}
            <button
              type="button"
              onClick={iniciarFallback}
              className="font-semibold text-brand underline"
            >
              Reintentar
            </button>
          </p>
        )}

        <p className="mt-6 text-center text-[13px] text-slate-muted">
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-semibold text-brand hover:text-brand-dark">
            Regístrate
          </Link>
        </p>
      </form>
    </div>
  );
}