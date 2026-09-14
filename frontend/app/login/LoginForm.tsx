"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import ErrorBanner from "@/components/ErrorBanner";
import Input from "@/components/Input";
import { IconLock, IconLogo, IconMail } from "@/components/icons";
import { renderGoogleButton } from "@/lib/google";
import { useAuth } from "@/lib/auth";

export default function LoginForm() {
  const router = useRouter();
  const { usuario, cargando, login, loginGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [googleCargando, setGoogleCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleId = useRef("google-button");

  // si ya hay sesión, fuera del login
  useEffect(() => {
    if (usuario && !cargando) router.replace("/feed");
  }, [usuario, cargando, router]);

  useEffect(() => {
    renderGoogleButton(googleId.current, (idToken) => {
      setGoogleCargando(true);
      setError(null);
      loginGoogle(idToken)
        .then(() => router.replace("/feed"))
        .catch((e) =>
          setError(e instanceof Error ? e.message : "No pudimos iniciar sesión con Google."),
        )
        .finally(() => setGoogleCargando(false));
    });
  }, [loginGoogle, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await login(email, password);
      router.replace("/feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Correo o contraseña incorrectos.");
    } finally {
      setEnviando(false);
    }
  }

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

        <ErrorBanner message={error} />

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
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          icon={<IconLock className="h-[18px] w-[18px]" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button type="submit" disabled={enviando} className="w-full">
          {enviando ? "Entrando..." : "Iniciar sesión"}
        </Button>

        <div className="my-[22px] flex items-center gap-3 text-[12px] text-slate-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
          o continúa con
        </div>

        <div id="google-button" className="flex min-h-[44px] w-full items-center justify-center" />
        {googleCargando && (
          <p className="mt-3 text-center text-[13px] text-slate-muted">Conectando con Google...</p>
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