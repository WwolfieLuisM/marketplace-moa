"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import ErrorBanner from "@/components/ErrorBanner";
import Input from "@/components/Input";
import { IconCheck, IconLock, IconWarning } from "@/components/icons";
import { api } from "@/lib/api";

const CLAVES_DEBILES = new Set([
  "12345678",
  "password",
  "contraseña",
  "11111111",
  "87654321",
]);

function validarPassword(nuevaPassword: string): string | null {
  if (nuevaPassword.length < 8) return "La contraseña debe tener al menos 8 caracteres";
  const minus = nuevaPassword.toLowerCase();
  if (CLAVES_DEBILES.has(nuevaPassword) || CLAVES_DEBILES.has(minus)) {
    return "Esa contraseña es muy común, elige otra";
  }
  return null;
}

export default function RestablecerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [nuevaPassword, setNuevaPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorPassword, setErrorPassword] = useState<string | null>(null);
  const [completado, setCompletado] = useState(false);
  const [enlaceInvalido, setEnlaceInvalido] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorPassword(null);
    if (!token) {
      setEnlaceInvalido(true);
      return;
    }
    const errPwd = validarPassword(nuevaPassword);
    if (errPwd) {
      setErrorPassword(errPwd);
      return;
    }
    setEnviando(true);
    try {
      await api.post("/auth/restablecer-password", { token, nuevaPassword });
      setCompletado(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo restablecer la contraseña.";
      if (msg.includes("enlace")) {
        setEnlaceInvalido(true);
      } else if (
        msg === "La contraseña debe tener al menos 8 caracteres" ||
        msg === "Esa contraseña es muy común, elige otra"
      ) {
        setErrorPassword(msg);
      } else {
        setError(msg);
      }
    } finally {
      setEnviando(false);
    }
  }

  if (enlaceInvalido) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-10">
        <div className="w-full max-w-[400px] rounded-[20px] bg-white p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <IconWarning className="h-6 w-6" />
          </div>
          <h1 className="text-[20px] font-bold text-ink">Enlace inválido o expirado</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-slate-muted">
            El enlace de recuperación no es válido o ya expiró. Pide uno nuevo para
            restablecer tu contraseña.
          </p>
          <Link
            href="/olvide-password"
            className="mt-6 inline-flex items-center justify-center rounded-[10px] bg-brand px-4 py-[11px] text-[15px] font-semibold text-white hover:bg-brand-dark"
          >
            Pedir un nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  if (completado) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-10">
        <div className="w-full max-w-[400px] rounded-[20px] bg-white p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-success">
            <IconCheck className="h-6 w-6" />
          </div>
          <h1 className="text-[20px] font-bold text-ink">¡Contraseña actualizada!</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-slate-muted">
            Ya puedes iniciar sesión con tu nueva contraseña.
          </p>
          <Button onClick={() => router.replace("/login")} className="mt-6 w-full">
            Iniciar sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-10">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[400px] rounded-[20px] bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light text-brand">
            <IconLock className="h-5 w-5" />
          </div>
          <h1 className="mt-3 text-[22px] font-bold text-ink">Nueva contraseña</h1>
          <p className="mt-1 text-[14px] text-slate-muted">Elige una contraseña nueva y segura.</p>
        </div>

        <ErrorBanner message={error} />

        <Input
          id="nuevaPassword"
          label="Nueva contraseña"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          icon={<IconLock className="h-[18px] w-[18px]" />}
          value={nuevaPassword}
          onChange={(e) => setNuevaPassword(e.target.value)}
          required
          hint={
            errorPassword ? (
              <span className="text-red-600">{errorPassword}</span>
            ) : nuevaPassword.length > 0 ? (
              <span
                className={
                  nuevaPassword.length >= 8 ? "font-medium text-success" : "text-slate-muted"
                }
              >
                {nuevaPassword.length}/8 caracteres
              </span>
            ) : null
          }
        />

        <Button type="submit" disabled={enviando} className="w-full">
          {enviando ? "Guardando..." : "Guardar contraseña"}
        </Button>
      </form>
    </div>
  );
}