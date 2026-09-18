"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { REPARTOS_MOA } from "@/lib/types";

const TIPOS = [
  { value: "individual", label: "Individual" },
  { value: "tcp", label: "Negocio TCP" },
  { value: "empresa_estatal", label: "Empresa estatal" },
];

export default function SolicitudForm() {
  const router = useRouter();
  const { accessToken, usuario } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [existePerfil, setExistePerfil] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  const [tipo, setTipo] = useState("individual");
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [numeroCi, setNumeroCi] = useState("");
  const [reparto, setReparto] = useState("");
  const [nombreNegocio, setNombreNegocio] = useState("");
  const [categoriaNegocio, setCategoriaNegocio] = useState("");
  const [horarioAtencion, setHorarioAtencion] = useState("");
  const [direccionFisica, setDireccionFisica] = useState("");

  const esNegocio = tipo !== "individual";
  const puedeEnviar =
    !!nombre.trim() && !!apellidos.trim() && !!numeroCi.trim() && !!reparto &&
    (!esNegocio || !!nombreNegocio.trim()) && !enviando;

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    if (usuario) {
      setNombre(usuario.nombre || "");
      setApellidos(usuario.apellidos || "");
      setReparto(usuario.reparto || "");
    }
  }, [accessToken, usuario, router]);

  useEffect(() => {
    if (!accessToken) return;
    let activo = true;
    (async () => {
      try {
        await api.get<{ perfil: unknown }>("/vendedores/me");
        if (activo) setExistePerfil(true);
      } catch {
        /* 404 => no tiene perfil, puede solicitar */
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => { activo = false; };
  }, [accessToken]);

if (!accessToken || cargando) {
    return (
      <>
        <main className="mx-auto max-w-[560px] px-4 py-6">
          <div className="flex justify-center py-24">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        </main>
      </>
    );
  }

  if (existePerfil) {
    return (
      <>
        <main className="mx-auto max-w-[560px] px-4 py-6">
          <div className="rounded border border-white/10 bg-white/5 p-6 text-center">
            <p className="text-sm text-white/60">Ya tienes un perfil de vendedor.</p>
            <button
              onClick={() => router.push("/vendedor/perfil")}
              className="mt-4 rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500"
            >
              Ver mi perfil
            </button>
          </div>
        </main>
      </>
    );
  }

if (exito) {
    return (
      <>
        <main className="mx-auto max-w-[560px] px-4 py-6">
          <div className="rounded border border-green-800/50 bg-green-900/20 p-6 text-center">
            <p className="text-sm text-green-300">
              Tu solicitud fue enviada. Un administrador la revisará y te notificará cuando sea aprobada.
            </p>
            <button
              onClick={() => router.push("/feed")}
              className="mt-4 rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500"
            >
              Ir al feed
            </button>
          </div>
        </main>
      </>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!puedeEnviar) return;
    setEnviando(true);
    setError("");
    try {
      const body: Record<string, string> = {
        tipo,
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        numeroCi: numeroCi.trim(),
        reparto,
      };
      if (esNegocio) {
        if (categoriaNegocio.trim()) body.categoriaNegocio = categoriaNegocio.trim();
        if (horarioAtencion.trim()) body.horarioAtencion = horarioAtencion.trim();
        if (direccionFisica.trim()) body.direccionFisica = direccionFisica.trim();
      }
      body.nombreNegocio = nombreNegocio.trim();
      await api.post("/vendedores/solicitud", body);
      setExito(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la solicitud.");
    } finally {
      setEnviando(false);
    }
  }

  const inputCls =
    "w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-orange-500 placeholder:text-white/30";

return (
    <>
      <main className="mx-auto max-w-[560px] px-4 py-6 text-white">
        <h1 className="mb-1 text-xl font-bold">Ser vendedor</h1>
        <p className="mb-6 text-sm text-white/40">
          Completa el formulario. Un administrador revisará tu solicitud.
        </p>

        {error && (
          <div className="mb-4 rounded border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Tipo de vendedor *">
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className={inputCls}
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value} className="bg-gray-900">
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Nombre *">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Apellidos *">
            <input
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Número de carnet de identidad *">
            <input
              value={numeroCi}
              onChange={(e) => setNumeroCi(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Reparto *">
            <select
              value={reparto}
              onChange={(e) => setReparto(e.target.value)}
              className={inputCls}
            >
              <option value="" className="bg-gray-900">
                Selecciona...
              </option>
              {REPARTOS_MOA.map((r) => (
                <option key={r} value={r} className="bg-gray-900">
                  {r}
                </option>
              ))}
            </select>
          </Field>

          {esNegocio && (
            <>
              {tipo !== "individual" && (
                <Field label="Nombre del negocio *">
                  <input
                    value={nombreNegocio}
                    onChange={(e) => setNombreNegocio(e.target.value)}
                    className={inputCls}
                  />
                </Field>
              )}

              <Field label="Categoría del negocio">
                <input
                  value={categoriaNegocio}
                  onChange={(e) => setCategoriaNegocio(e.target.value)}
                  placeholder="Ej: Panadería, Bodega..."
                  className={inputCls}
                />
              </Field>

              <Field label="Horario de atención">
                <input
                  value={horarioAtencion}
                  onChange={(e) => setHorarioAtencion(e.target.value)}
                  placeholder="Ej: 8:00 - 17:00"
                  className={inputCls}
                />
              </Field>

              <Field label="Dirección física">
                <input
                  value={direccionFisica}
                  onChange={(e) => setDireccionFisica(e.target.value)}
                  placeholder="Ej: Caribe, Moa"
                  className={inputCls}
                />
              </Field>
            </>
          )}

          <button
            type="submit"
            disabled={!puedeEnviar}
            className="w-full rounded bg-orange-600 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {enviando ? "Enviando..." : "Enviar solicitud"}
          </button>
        </form>
      </main>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-white/50">{label}</span>
      {children}
    </label>
  );
}
