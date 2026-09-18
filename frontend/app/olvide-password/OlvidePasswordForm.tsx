"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import ErrorBanner from "@/components/ErrorBanner";
import Input from "@/components/Input";
import { IconCheck, IconLock, IconMail } from "@/components/icons";
import { api } from "@/lib/api";

export default function OlvidePasswordForm() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Escribe tu correo electrónico.");
      return;
    }
    setEnviando(true);
    try {
      // El servidor SIEMPRE responde lo mismo, exista o no la cuenta.
      await api.post("/auth/olvide-password", { email: email.trim() });
      setEnviado(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo enviar el correo.";
      setError(msg);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-10">
      {enviado ? (
        <div className="w-full max-w-[400px] rounded-[20px] bg-white p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-success">
            <IconCheck className="h-6 w-6" />
          </div>
          <h1 className="text-[20px] font-bold text-ink">Revisa tu correo</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-slate-muted">
            Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu
            contraseña. Revisa también la carpeta de spam y ten en cuenta que el enlace
            expira en 30 minutos.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block font-semibold text-brand hover:text-brand-dark"
          >
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          className="w-full max-w-[400px] rounded-[20px] bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
        >
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light text-brand">
              <IconLock className="h-5 w-5" />
            </div>
            <h1 className="mt-3 text-[22px] font-bold text-ink">¿Olvidaste tu contraseña?</h1>
            <p className="mt-1 text-[14px] text-slate-muted">
              Escribe tu correo y te enviaremos un enlace para restablecerla.
            </p>
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

          <Button type="submit" disabled={enviando} className="w-full">
            {enviando ? "Enviando..." : "Enviar enlace"}
          </Button>

          <p className="mt-6 text-center text-[13px] text-slate-muted">
            ¿Recordaste tu contraseña?{" "}
            <Link href="/login" className="font-semibold text-brand hover:text-brand-dark">
              Inicia sesión
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}