"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Button from "@/components/Button";
import Input from "@/components/Input";
import ErrorBanner from "@/components/ErrorBanner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { REPARTOS_MOA } from "@/lib/types";

export default function PerfilForm() {
  const { usuario, cargando, setUsuario } = useAuth();

  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [reparto, setReparto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (usuario) {
      setNombre(usuario.nombre || "");
      setApellidos(usuario.apellidos || "");
      setEmail(usuario.email || "");
      setTelefono(usuario.telefono || "");
      setReparto(usuario.reparto || "");
    }
  }, [usuario]);

  const puedeEnviar = !!nombre.trim() && !!apellidos.trim() && !enviando;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!puedeEnviar) return;
    setEnviando(true);
    setError(null);
    setExito(false);
    try {
      const data = await api.patch<{ user: typeof usuario }>("/auth/me", {
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        telefono: telefono.trim() || null,
        reparto: reparto || null,
      });
      if (data.user) setUsuario(data.user);
      setExito(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el perfil.");
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-xl px-4 pb-24 pt-8">
          <p className="text-[14px] text-slate-muted">Cargando perfil...</p>
        </main>
      </>
    );
  }

  if (!usuario) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-xl px-4 pb-24 pt-16 text-center">
          <p className="text-[14px] text-slate-muted">Inicia sesión para ver tu perfil.</p>
          <Link
            href="/login"
            className="mt-5 inline-block rounded-[10px] bg-brand px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-dark"
          >
            Iniciar sesión
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-xl px-4 pb-24 pt-8">
        <h1 className="text-[22px] font-bold text-ink">Mi perfil</h1>
        <p className="mt-1 text-[14px] text-slate-muted">
          Tus datos se muestran a los vendedores al contactarte.
        </p>

        <ErrorBanner message={error} />

        <div className="mt-6 rounded-2xl border border-line bg-white p-6">
          <form onSubmit={guardar}>
            <Input label="Email" id="email" type="text" value={email} disabled className="text-slate-400" />
            <Input
              label="Nombre"
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
            />
            <Input
              label="Apellidos"
              id="apellidos"
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              placeholder="Tus apellidos"
            />
            <Input
              label="Teléfono"
              id="telefono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej: +53 5 1234567"
            />

            <div className="mb-[18px]">
              <label htmlFor="reparto" className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                Reparto
              </label>
              <div className="relative">
                <select
                  id="reparto"
                  value={reparto}
                  onChange={(e) => setReparto(e.target.value)}
                  className="w-full rounded-[10px] border-[1.5px] border-line bg-white px-[14px] py-3 text-[15px] text-ink outline-none transition-colors duration-150 focus:border-brand"
                >
                  <option value="">Sin especificar</option>
                  {REPARTOS_MOA.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {exito && (
              <p className="mb-4 rounded-[10px] bg-green-50 px-3 py-2 text-[13px] font-semibold text-success">
                Perfil actualizado.
              </p>
            )}

            <Button type="submit" disabled={!puedeEnviar} className="w-full">
              {enviando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {usuario.rol === "admin" ? (
            <Link
              href="/admin"
              className="rounded-[10px] border-[1.5px] border-line bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 hover:border-slate-300"
            >
              Panel de administración
            </Link>
          ) : (
            <Link
              href="/vendedor/solicitud"
              className="rounded-[10px] border-[1.5px] border-line bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 hover:border-slate-300"
            >
              Ser vendedor
            </Link>
          )}
          <Link
            href="/vendedor/perfil"
            className="rounded-[10px] border-[1.5px] border-line bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 hover:border-slate-300"
          >
            Mi perfil de vendedor
          </Link>
        </div>
      </main>
    </>
  );
}