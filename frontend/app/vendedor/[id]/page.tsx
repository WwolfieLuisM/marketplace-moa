"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import ErrorBanner from "@/components/ErrorBanner";
import { IconBox, IconChat, IconClock, IconLocation, IconStore } from "@/components/icons";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFavoritos } from "@/lib/favoritos";
import type { FeedPublicacion } from "@/lib/types";

type PerfilPublico = {
  id: string;
  userId: string;
  tipo: string;
  nombre: string;
  apellidos?: string | null;
  reparto?: string | null;
  telefono?: string | null;
  nombreNegocio?: string | null;
  categoriaNegocio?: string | null;
  horarioAtencion?: string | null;
  direccionFisica?: string | null;
  zonas?: { id: string; reparto: string; costoDomicilio: string; tiempoEstimado: string }[];
};

export default function VendedorPublicoPage() {
  const params = useParams();
  const router = useRouter();
  const { usuario } = useAuth();
  const { esFavorito, toggle } = useFavoritos();

  const userId = params?.id as string;
  const [perfil, setPerfil] = useState<PerfilPublico | null>(null);
  const [publicaciones, setPublicaciones] = useState<FeedPublicacion[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let activo = true;
    setError(null);
    api
      .get<{ perfil: PerfilPublico; publicaciones: FeedPublicacion[] }>(`/vendedores/publico/${userId}`)
      .then((data) => {
        if (!activo) return;
        setPerfil(data.perfil);
        setPublicaciones(data.publicaciones);
      })
      .catch((e) => {
        if (activo) setError(e instanceof Error ? e.message : "No se pudo cargar el vendedor.");
      });
    return () => {
      activo = false;
    };
  }, [userId]);

  const nombreCompleto = [perfil?.nombre, perfil?.apellidos].filter(Boolean).join(" ") ?? "";
  const inicial = (perfil?.nombre ?? "")[0] ?? "V";

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8">
        <nav className="mb-4 text-[12px] text-slate-muted">
          <button onClick={() => router.push("/feed")} className="hover:text-brand">
            Feed
          </button>
          <span className="mx-2">/</span>
          <span className="text-slate-600">Vendedor</span>
        </nav>

        <ErrorBanner message={error} />

        {error ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <IconBox className="h-10 w-10 text-slate-muted" />
            <p className="text-[14px] text-slate-muted">
              {perfil ? "" : "No encontramos este vendedor o aún no tiene perfil aprobado."}
            </p>
            <button
              onClick={() => router.push("/feed")}
              className="mt-2 rounded-[10px] bg-brand px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-dark"
            >
              Volver al feed
            </button>
          </div>
        ) : !perfil ? (
          <p className="py-16 text-center text-[14px] text-slate-muted">
            Cargando vendedor...
          </p>
        ) : (
          <>
            <section className="rounded-2xl border border-line bg-white p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-avatar text-[22px] font-bold text-ink">
                  {inicial}
                </div>
                <div className="min-w-0">
                  <h1 className="text-[20px] font-bold text-ink">{nombreCompleto}</h1>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-muted">
                    {perfil.nombreNegocio && (
                      <span className="flex items-center gap-1">
                        <IconStore className="h-4 w-4" />
                        {perfil.nombreNegocio}
                      </span>
                    )}
                    {perfil.reparto && (
                      <span className="flex items-center gap-1">
                        <IconLocation className="h-4 w-4" />
                        {perfil.reparto}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {(perfil.categoriaNegocio || perfil.horarioAtencion || perfil.direccionFisica) && (
                <dl className="mt-4 grid gap-2 border-t border-line pt-4 text-[13px] sm:grid-cols-2">
                  {perfil.categoriaNegocio && (
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-slate-muted">
                        Categoría de negocio
                      </dt>
                      <dd className="mt-0.5 text-ink">{perfil.categoriaNegocio}</dd>
                    </div>
                  )}
                  {perfil.horarioAtencion && (
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-slate-muted">
                        Horario de atención
                      </dt>
                      <dd className="mt-0.5 flex items-center gap-1 text-ink">
                        <IconClock className="h-3.5 w-3.5 text-slate-muted" />
                        {perfil.horarioAtencion}
                      </dd>
                    </div>
                  )}
                  {perfil.direccionFisica && (
                    <div className="sm:col-span-2">
                      <dt className="text-[11px] uppercase tracking-wide text-slate-muted">
                        Dirección
                      </dt>
                      <dd className="mt-0.5 text-ink">{perfil.direccionFisica}</dd>
                    </div>
                  )}
                </dl>
              )}

              {usuario?.id !== perfil.userId && (
                <a
                  href={
                    usuario
                      ? `/mensajes/${perfil.userId}`
                      : `/mensajes?publicacion=${publicaciones[0]?.id ?? ""}`
                  }
                  className="mt-4 inline-flex items-center gap-2 rounded-[10px] bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
                >
                  <IconChat className="h-4 w-4" />
                  {usuario ? "Enviar mensaje" : "Inicia sesión para contactar"}
                </a>
              )}
            </section>

            <h2 className="mb-3 mt-8 text-[16px] font-bold text-ink">
              Publicaciones ({publicaciones.length})
            </h2>
            {publicaciones.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-white py-14 text-center">
                <IconBox className="h-8 w-8 text-slate-muted" />
                <p className="text-[13px] text-slate-muted">
                  Este vendedor aún no tiene publicaciones activas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {publicaciones.map((pub) => (
                  <ProductCard
                    key={pub.id}
                    publicacion={pub}
                    logueado={!!usuario}
                    esFavorito={esFavorito}
                    onToggleFavorito={(id) => void toggle(id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}