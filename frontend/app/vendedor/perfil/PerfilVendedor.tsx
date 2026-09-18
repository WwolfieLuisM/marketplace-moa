"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { VendedorPerfil, MiPublicacion, Producto } from "@/lib/types";

const LIMITE_DIA = 5;
const LIMITE_TOTAL = 10;

const ETIQUETA_TIPO: Record<string, string> = {
  individual: "Individual",
  tcp: "Negocio TCP",
  empresa_estatal: "Empresa estatal",
};

const COLOR_ESTADO_PRODUCTO: Record<string, string> = {
  activo: "bg-green-900/40 text-green-300",
  pausado: "bg-amber-900/40 text-amber-300",
  vendido: "bg-white/10 text-white/50",
  eliminado: "bg-red-900/40 text-red-300",
};

const ETIQUETA_ESTADO_PRODUCTO: Record<string, string> = {
  activo: "Activo",
  pausado: "Pausado",
  vendido: "Vendido",
  eliminado: "Eliminado",
};

function badgeLicencia(estado: string): string {
  if (estado === "aprobado") return "bg-green-900/40 text-green-300";
  if (estado === "rechazado") return "bg-red-900/40 text-red-300";
  return "bg-amber-900/40 text-amber-300";
}

function badgeSuscripcion(estado: string): string {
  if (estado === "activo") return "bg-green-900/40 text-green-300";
  if (estado === "exento") return "bg-sky-900/40 text-sky-300";
  if (estado === "vencido") return "bg-red-900/40 text-red-300";
  return "bg-amber-900/40 text-amber-300";
}

function precioCUP(value?: string | number) {
  if (value == null) return null;
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return null;
  return num.toLocaleString("es-CU", { minimumFractionDigits: 2 });
}

function formatearFecha(fecha?: string | null) {
  if (!fecha) return null;
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-CU");
}

export default function PerfilVendedor() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [cargando, setCargando] = useState(true);
  const [perfil, setPerfil] = useState<VendedorPerfil | null>(null);
  const [publicaciones, setPublicaciones] = useState<MiPublicacion[]>([]);
  const [error, setError] = useState("");
  const [accionando, setAccionando] = useState<string>("");

  const recargar = useCallback(async () => {
    try {
      const [p, pubs] = await Promise.all([
        api.get<{ perfil: VendedorPerfil }>("/vendedores/me"),
        api.get<{ publicaciones: MiPublicacion[] }>("/vendedores/me/publicaciones"),
      ]);
      setPerfil(p.perfil);
      setPublicaciones(pubs.publicaciones ?? []);
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el perfil.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    recargar();
  }, [accessToken, recargar, router]);

  const accionProducto = async (pub: MiPublicacion, prod: Producto, estado: string) => {
    if (accionando) return;
    setAccionando(`${pub.id}-${prod.id}`);
    try {
      await api.patch(`/publicaciones/${pub.id}/productos/${prod.id}`, { estado });
      await recargar();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar el producto.");
    } finally {
      setAccionando("");
    }
  };

  const eliminarPublicacion = async (pub: MiPublicacion) => {
    if (!window.confirm(`Eliminar la publicación "${pub.titulo}"?`)) return;
    setAccionando(pub.id);
    try {
      await api.del(`/publicaciones/${pub.id}`);
      await recargar();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar la publicación.");
    } finally {
      setAccionando("");
    }
  };

if (cargando) {
    return (
      <>
        <main className="mx-auto max-w-[720px] px-4 py-6">
          <div className="flex justify-center py-24">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        </main>
      </>
    );
  }

  if (!perfil) {
    return (
      <>
        <main className="mx-auto max-w-[720px] px-4 py-6">
          {error && (
            <div className="mb-4 rounded border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
          <div className="rounded border border-white/10 bg-white/5 p-6 text-center">
            <p className="text-sm text-white/60">Todavía no eres vendedor.</p>
            <button
              onClick={() => router.push("/vendedor/solicitud")}
              className="mt-4 rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500"
            >
              Solicitar ser vendedor
            </button>
          </div>
        </main>
      </>
    );
  }

  const puedePublicar = perfil.estadoLicencia === "aprobado";
  const suscripcionActiva = ["demo", "activo", "exento"].includes(perfil.estadoSuscripcion);
  const puedePublicarAhora = puedePublicar && suscripcionActiva;
  const restoDia = LIMITE_DIA - perfil.productosHoy;
  const restoTotal = LIMITE_TOTAL - perfil.productosTotalDemo;

return (
    <>
      <main className="mx-auto max-w-[720px] px-4 py-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold">Mi perfil de vendedor</h1>
          {puedePublicarAhora && (
            <button
              onClick={() => router.push("/publicaciones/nueva")}
              className="rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500"
            >
              Nueva publicación
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="mt-6 rounded border border-white/10 bg-white/5 p-4">
          {perfil.nombreNegocio && (
            <p className="text-sm font-semibold text-white/80">{perfil.nombreNegocio}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className={"rounded px-2 py-0.5 " + badgeLicencia(perfil.estadoLicencia)}>
              Licencia: {perfil.estadoLicencia}
            </span>
            <span className={"rounded px-2 py-0.5 " + badgeSuscripcion(perfil.estadoSuscripcion)}>
              Suscripción: {perfil.estadoSuscripcion}
            </span>
            <span className="rounded bg-white/10 px-2 py-0.5 text-white/60">
              {ETIQUETA_TIPO[perfil.tipo] ?? perfil.tipo}
            </span>
          </div>

          {perfil.horarioAtencion && (
            <p className="mt-2 text-xs text-white/40">Horario: {perfil.horarioAtencion}</p>
          )}
          {perfil.direccionFisica && (
            <p className="mt-1 text-xs text-white/40">Dirección: {perfil.direccionFisica}</p>
          )}

          <div className="mt-3 space-y-1 text-xs text-white/50">
            <p>
              Plan demo: {perfil.productosHoy}/{LIMITE_DIA} hoy · {perfil.productosTotalDemo}/{LIMITE_TOTAL} en total
              {restoDia > 0 && restoTotal > 0
                ? ` (te quedan ${restoDia} hoy, ${restoTotal} en total)`
                : " — alcanzaste el límite del plan demo. Contáctate con un administrador para activar el plan."}
            </p>
            {perfil.estadoSuscripcion === "demo" && formatearFecha(perfil.demoTerminaEn) && (
              <p>La demo termina el {formatearFecha(perfil.demoTerminaEn)}.</p>
            )}
            {perfil.estadoSuscripcion === "activo" && formatearFecha(perfil.suscripcionVenceEn) && (
              <p>La suscripción vence el {formatearFecha(perfil.suscripcionVenceEn)}.</p>
            )}
            {perfil.estadoSuscripcion === "exento" && <p>Estás exento de pago.</p>}
            {!puedePublicar && (
              <p className="text-amber-300">
                Tu licencia está {perfil.estadoLicencia}. No puedes publicar hasta que un administrador la apruebe.
              </p>
            )}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-white/70">Mis publicaciones</h2>
          {publicaciones.length === 0 ? (
            <p className="rounded border border-white/10 bg-white/5 p-4 text-sm text-white/40">
              Aún no tienes publicaciones.
            </p>
          ) : (
            <div className="space-y-4">
              {publicaciones.map((pub) => (
                <div key={pub.id} className="rounded border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{pub.titulo}</p>
                      <p className="text-xs text-white/40">
                        {pub.reparto} · creada el {formatearFecha(pub.creadoEn) ?? ""}
                      </p>
                    </div>
                    <span
                      className={"rounded px-2 py-0.5 text-xs " + (pub.estado === "activo"
                        ? "bg-green-900/40 text-green-300"
                        : "bg-white/10 text-white/50")}
                    >
                      {pub.estado}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {pub.productos.map((prod) => (
                      <div
                        key={prod.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded bg-white/5 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm">
                            {prod.nombre}{" "}
                            {precioCUP(prod.precio) !== null && (
                              <span className="text-orange-400">· ${precioCUP(prod.precio)}</span>
                            )}
                          </p>
                          <span className={"mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] " + (COLOR_ESTADO_PRODUCTO[prod.estado] ?? "")}>
                            {ETIQUETA_ESTADO_PRODUCTO[prod.estado] ?? prod.estado}
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          {(prod.estado === "activo" || prod.estado === "pausado") && (
                            <button
                              onClick={() => accionProducto(pub, prod, prod.estado === "activo" ? "pausado" : "activo")}
                              disabled={!!accionando}
                              className="rounded bg-white/10 px-2 py-1 text-xs text-white/70 hover:bg-white/20 disabled:opacity-40"
                            >
                              {prod.estado === "activo" ? "Pausar" : "Activar"}
                            </button>
                          )}
                          {prod.estado === "activo" && (
                            <button
                              onClick={() => accionProducto(pub, prod, "vendido")}
                              disabled={!!accionando}
                              className="rounded bg-green-800/40 px-2 py-1 text-xs text-green-300 hover:bg-green-800/60 disabled:opacity-40"
                            >
                              Vendido
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

<div className="mt-3 flex items-center gap-3">
                    {pub.estado === "activo" && (
                      <button
                        onClick={() => router.push(`/publicaciones/${pub.id}`)}
                        className="text-xs text-white/40 hover:text-white/70"
                      >
                        Ver en el feed
                      </button>
                    )}
                    {pub.estado !== "eliminado" && (
                      <button
                        onClick={() => eliminarPublicacion(pub)}
                        disabled={!!accionando}
                        className="text-xs text-red-400/80 hover:text-red-300 disabled:opacity-40"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
