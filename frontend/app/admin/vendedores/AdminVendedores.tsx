"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ErrorBanner from "@/components/ErrorBanner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type VendedorAdmin = {
  id: string;
  userId: string;
  tipo: string;
  nombreNegocio: string | null;
  categoriaNegocio: string | null;
  horarioAtencion: string | null;
  direccionFisica: string | null;
  estadoLicencia: string;
  estadoSuscripcion: string;
  creadoEn: string;
  aprobadoEn: string | null;
  demoTerminaEn: string | null;
  user: {
    id: string;
    nombre: string;
    apellidos: string;
    email: string;
    telefono: string | null;
    reparto: string | null;
    rol: string;
    activo: boolean;
    creadoEn: string;
  };
};

const ESTADOS = [
  { valor: "pendiente", etiqueta: "Pendientes" },
  { valor: "aprobado", etiqueta: "Aprobados" },
  { valor: "rechazado", etiqueta: "Rechazados" },
  { valor: "todos", etiqueta: "Todos" },
] as const;

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

const COLOR_ESTADO: Record<string, string> = {
  pendiente: "bg-amber-50 text-amber-700",
  aprobado: "bg-green-50 text-success",
  rechazado: "bg-red-50 text-red-600",
};

const feste = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("es-CU", { day: "numeric", month: "short", year: "numeric" })
    : "—";

export default function AdminVendedores() {
  const { usuario, cargando } = useAuth();
  const [estado, setEstado] = useState<string>("pendiente");
  const [perfiles, setPerfiles] = useState<VendedorAdmin[]>([]);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aprobandoId, setAprobandoId] = useState<VendedorAdmin | null>(null);
  const [rechazandoId, setRechazandoId] = useState<VendedorAdmin | null>(null);
  const [accionando, setAccionando] = useState(false);

  const cargar = useCallback(async (est: string) => {
    setCargandoLista(true);
    setError(null);
    try {
      const q = est === "todos" ? "" : `?estadoLicencia=${est}`;
      const data = await api.get<{ perfiles: VendedorAdmin[] }>(`/vendedores${q}`);
      setPerfiles(data.perfiles);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los vendedores.");
    } finally {
      setCargandoLista(false);
    }
  }, []);

  useEffect(() => {
    if (!usuario || usuario.rol !== "admin") return;
    cargar(estado);
  }, [usuario, estado, cargar]);

  async function aprobar(moda: "demo" | "exento") {
    if (!aprobandoId) return;
    setAccionando(true);
    setError(null);
    try {
      await api.post(`/vendedores/${aprobandoId.id}/aprobar`, { moda });
      setAprobandoId(null);
      cargar(estado);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo aprobar.");
    } finally {
      setAccionando(false);
    }
  }

  async function rechazar() {
    if (!rechazandoId) return;
    setAccionando(true);
    setError(null);
    try {
      await api.post(`/vendedores/${rechazandoId.id}/rechazar`, {});
      setRechazandoId(null);
      cargar(estado);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo rechazar.");
    } finally {
      setAccionando(false);
    }
  }

  if (cargando || !usuario || usuario.rol !== "admin") {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8">
          {cargando ? (
            <p className="text-[14px] text-slate-muted">Cargando...</p>
          ) : (
            <p className="text-[14px] text-slate-muted">No tienes permisos para acceder aquí.</p>
          )}
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[22px] font-bold text-ink">Vendedores</h1>
          <Link
            href="/admin"
            className="rounded-[10px] border-[1.5px] border-line bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:border-slate-300"
          >
            Volver
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {ESTADOS.map((e) => (
            <button
              key={e.valor}
              type="button"
              onClick={() => setEstado(e.valor)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                estado === e.valor
                  ? "bg-brand text-white"
                  : "border border-line bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {e.etiqueta}
            </button>
          ))}
        </div>

        <ErrorBanner message={error} />

        {cargandoLista ? (
          <p className="mt-6 text-[14px] text-slate-muted">Cargando vendedores...</p>
        ) : perfiles.length === 0 ? (
          <p className="mt-6 text-[14px] text-slate-muted">
            No hay vendedores en este estado.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {perfiles.map((p) => (
              <div key={p.id} className="rounded-2xl border border-line bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[15px] font-bold text-ink">
                      {p.user.nombre} {p.user.apellidos}
                    </p>
                    <p className="text-[13px] text-slate-muted">
                      {p.nombreNegocio || p.user.email} · {p.tipo.replace("_", " ")}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[12px] font-bold ${
                      COLOR_ESTADO[p.estadoLicencia] || "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {ETIQUETA_ESTADO[p.estadoLicencia] || p.estadoLicencia}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 text-[13px] sm:grid-cols-2">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-muted">Email</dt>
                    <dd className="font-medium text-ink">{p.user.email}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-muted">Teléfono</dt>
                    <dd className="font-medium text-ink">{p.user.telefono || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-muted">Reparto</dt>
                    <dd className="font-medium text-ink">{p.user.reparto || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-muted">Categoría</dt>
                    <dd className="font-medium text-ink">{p.categoriaNegocio || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-muted">Solicitada</dt>
                    <dd className="font-medium text-ink">{feste(p.creadoEn)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-muted">Perfil de vendedor</dt>
                    <dd className="font-medium text-ink">
                      {p.nombreNegocio || "Individual"}
                    </dd>
                  </div>
                </dl>

                {p.estadoSuscripcion === "demo" && p.demoTerminaEn && p.estadoLicencia === "aprobado" && (
                  <p className="mt-3 text-[12px] font-semibold text-amber-700">
                    Demo termina el {feste(p.demoTerminaEn)}
                  </p>
                )}

                {p.estadoLicencia === "pendiente" && (
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAprobandoId(p)}
                      className="rounded-[10px] bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark"
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      onClick={() => setRechazandoId(p)}
                      className="rounded-[10px] border-[1.5px] border-line bg-white px-4 py-2 text-[13px] font-semibold text-red-600 hover:border-red-300"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {aprobandoId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => !accionando && setAprobandoId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[17px] font-bold text-ink">Aprobar a {aprobandoId.user.nombre}</h2>
            <p className="mt-1 text-[13px] text-slate-muted">
              Elige el modo de licencia.
            </p>
            <button
              type="button"
              disabled={accionando}
              onClick={() => aprobar("demo")}
              className="mt-4 w-full rounded-[10px] bg-brand px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {accionando ? "Procesando..." : "Demo 48 horas"}
            </button>
            <button
              type="button"
              disabled={accionando}
              onClick={() => aprobar("exento")}
              className="mt-2 w-full rounded-[10px] border-[1.5px] border-line bg-white px-4 py-2.5 text-[14px] font-semibold text-slate-700 hover:border-slate-300 disabled:opacity-60"
            >
              Exento
            </button>
            <button
              type="button"
              disabled={accionando}
              onClick={() => setAprobandoId(null)}
              className="mt-2 w-full rounded-[10px] px-4 py-2 text-[13px] font-semibold text-slate-muted hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {rechazandoId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => !accionando && setRechazandoId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[17px] font-bold text-ink">Rechazar solicitud</h2>
            <p className="mt-1 text-[13px] text-slate-muted">
              ¿Confirmas que la solicitud de {rechazandoId.user.nombre} {rechazandoId.user.apellidos}{" "}
              quede rechazada?
            </p>
            <button
              type="button"
              disabled={accionando}
              onClick={rechazar}
              className="mt-4 w-full rounded-[10px] bg-red-600 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {accionando ? "Procesando..." : "Sí, rechazar"}
            </button>
            <button
              type="button"
              disabled={accionando}
              onClick={() => setRechazandoId(null)}
              className="mt-2 w-full rounded-[10px] px-4 py-2 text-[13px] font-semibold text-slate-muted hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}