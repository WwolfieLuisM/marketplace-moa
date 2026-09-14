"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import ErrorBanner from "@/components/ErrorBanner";
import Input from "@/components/Input";
import { IconLock, IconLogo, IconMail, IconUser } from "@/components/icons";
import { useAuth } from "@/lib/auth";
import { REPARTOS_MOA } from "@/lib/types";

export default function RegistroForm() {
  const router = useRouter();
  const { usuario, cargando, registrar } = useAuth();

  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reparto, setReparto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (usuario && !cargando) router.replace("/feed");
  }, [usuario, cargando, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!reparto) {
      setError("Selecciona tu reparto.");
      return;
    }
    setEnviando(true);
    try {
      await registrar({
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        email: email.trim(),
        password,
        telefono: telefono.trim() || undefined,
        reparto,
      });
      router.replace("/feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
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
          <h1 className="mt-2 text-[22px] font-bold text-ink">Crea tu cuenta</h1>
          <p className="text-[14px] text-slate-muted">Compra y vende en tu comunidad</p>
        </div>

        <ErrorBanner message={error} />

        <div className="flex gap-3">
          <Input
            id="nombre"
            label="Nombre"
            type="text"
            placeholder="Nombre"
            autoComplete="given-name"
            icon={<IconUser className="h-[18px] w-[18px]" />}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
          <Input
            id="apellidos"
            label="Apellidos"
            type="text"
            placeholder="Apellidos"
            autoComplete="family-name"
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
            required
          />
        </div>

        <Input
          id="telefono"
          label="Teléfono (opcional)"
          type="tel"
          placeholder="5XXXXXXX"
          autoComplete="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />

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
          autoComplete="new-password"
          icon={<IconLock className="h-[18px] w-[18px]" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <label htmlFor="reparto" className="mb-1.5 block text-[13px] font-semibold text-slate-700">
          Reparto
        </label>
        <select
          id="reparto"
          value={reparto}
          onChange={(e) => setReparto(e.target.value)}
          required
          className="mb-[18px] w-full rounded-[10px] border-[1.5px] border-line bg-white px-[14px] py-3 text-[15px] text-ink outline-none transition-colors duration-150 focus:border-brand"
        >
          <option value="">Selecciona tu reparto</option>
          {REPARTOS_MOA.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <Button type="submit" disabled={enviando} className="w-full">
          {enviando ? "Creando cuenta..." : "Registrarme"}
        </Button>

        <p className="mt-6 text-center text-[13px] text-slate-muted">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-brand hover:text-brand-dark">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  );
}