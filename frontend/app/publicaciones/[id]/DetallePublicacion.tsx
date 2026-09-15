"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import type { DetallePublicacion } from "@/lib/types";

function Loader({ text = "Cargando..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-sm text-white/60">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      <span>{text}</span>
    </div>
  );
}

function formatCUP(value?: string | number) {
  if (value == null || value === "") return null;
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return null;
  return num.toLocaleString("es-CU", { minimumFractionDigits: 2 });
}

export default function DetallePublicacion() {
  const params = useParams();
  const router = useRouter();
  const publicacionId = params?.id as string;

  const [data, setData] = useState<DetallePublicacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!publicacionId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/publicaciones/${publicacionId}`,
          { credentials: "include" },
        );
        if (r.status === 404) {
          if (!cancelled) setError("Publicación no encontrada.");
          return;
        }
        if (!r.ok) throw new Error("No se pudo cargar la publicación.");
        const d = await r.json();
        if (!cancelled) setData(d.publicacion ?? d);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error al cargar.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [publicacionId]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-[800px] px-4 py-6">
          <Loader />
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-[800px] px-4 py-6">
          <div className="rounded border border-white/10 bg-white/5 px-5 py-16 text-center text-white/60">
            <p>{error}</p>
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

  if (!data) return null;

  const v = data.vendedor;
  const vNombre = [v?.user?.nombre, v?.user?.apellidos].filter(Boolean).join(" ") || "Vendedor";
  const zonas = (v?.zonas ?? []).filter((z) => z.reparto === data.reparto);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-[800px] px-4 py-6 text-white">
        <nav className="mb-4 text-xs text-white/40">
          <button onClick={() => router.push("/feed")} className="hover:text-white/70">
            Feed
          </button>
          <span className="mx-2">/</span>
          <span className="text-white/70">Publicación</span>
        </nav>

        <h1 className="mb-1 text-2xl font-bold">{data.titulo}</h1>
        <p className="mb-5 text-sm text-white/40">
          {data.reparto}
          {data.creadoEn && (
            <> · {new Date(data.creadoEn).toLocaleDateString("es-CU")}</>
          )}
        </p>

        <div className="flex flex-wrap gap-2 text-xs">
          {data.reparto && (
            <span className="rounded bg-white/10 px-2 py-0.5 text-white/60">{data.reparto}</span>
          )}
          {data.conDomicilio && (
            <span className="rounded bg-green-900/40 px-2 py-0.5 text-green-300">Envío a domicilio</span>
          )}
          {v?.nombreNegocio && (
            <span className="rounded bg-white/10 px-2 py-0.5 text-white/60">{v.nombreNegocio}</span>
          )}
        </div>

        <section className="mt-8 space-y-6">
          {data.productos.map((prod) => (
            <div
              key={prod.id}
              className="rounded border border-white/10 bg-white/5 p-4"
            >
              {prod.fotos && prod.fotos.length > 0 && (
                <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
                  {prod.fotos.map((f) => (
                    <img
                      key={f.id}
                      src={f.url}
                      alt={prod.nombre}
                      className="h-40 w-40 flex-shrink-0 rounded object-cover"
                    />
                  ))}
                </div>
              )}
              <h2 className="text-lg font-semibold">{prod.nombre}</h2>
              {prod.descripcion && (
                <p className="mt-1 text-sm text-white/50">{prod.descripcion}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                <span className="font-bold text-orange-400">
                  {formatCUP(prod.precio) !== null ? `$${formatCUP(prod.precio)}` : "Consultar"}
                </span>
                {prod.categoria && (
                  <span className="text-white/40">· {prod.categoria.nombre}</span>
                )}
                {prod.cantidad > 0 && (
                  <span className="text-white/30">· {prod.cantidad} disponibles</span>
                )}
              </div>
              <a
                href={v?.userId ? `/mensajes/${v.userId}?publicacion=${data.id}&producto=${prod.id}` : `/mensajes?publicacion=${data.id}&producto=${prod.id}`}
                className="mt-3 inline-block rounded bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-500"
              >
                Consultar
              </a>
            </div>
          ))}
        </section>

        {(data.telefonoFijo || data.telefonoMovil) && (
          <section className="mt-8 rounded border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold">Teléfonos de contacto</h3>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {data.telefonoFijo && (
                <a href={`tel:${data.telefonoFijo}`} className="text-orange-400 hover:underline">
                  Fijo: {data.telefonoFijo}
                </a>
              )}
              {data.telefonoMovil && (
                <a href={`tel:${data.telefonoMovil}`} className="text-orange-400 hover:underline">
                  Móvil: {data.telefonoMovil}
                </a>
              )}
            </div>
          </section>
        )}

        {v && (
          <section className="mt-8 rounded border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-700 text-sm font-bold">
                {vNombre[0]}
              </div>
              <div>
                <p className="font-semibold">{vNombre}</p>
                {v.horarioAtencion && (
                  <p className="text-xs text-white/40">{v.horarioAtencion}</p>
                )}
              </div>
            </div>
            {v.direccionFisica && (
              <p className="mt-2 text-sm text-white/40">📍 {v.direccionFisica}</p>
            )}
            {v.userId && (
              <a
                href={`/vendedor/${v.userId}`}
                className="mt-3 inline-block rounded border border-white/15 px-3 py-1.5 text-xs font-semibold text-orange-300 hover:bg-white/10"
              >
                Ver perfil del vendedor
              </a>
            )}
          </section>
        )}

        {data.conDomicilio && zonas.length > 0 && (
          <section className="mt-6 rounded border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold">Zonas de domicilio</h3>
            <div className="mt-2 space-y-2 text-sm">
              {zonas.map((z) => (
                <div key={z.id} className="flex justify-between text-white/60">
                  <span>{z.reparto}</span>
                  <span>
                    {formatCUP(z.costoDomicilio) !== null ? `$${formatCUP(z.costoDomicilio)}` : "—"} · {z.tiempoEstimado}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-8">
          <a
            href={v?.userId ? `/mensajes/${v.userId}?publicacion=${data.id}` : `/mensajes?publicacion=${data.id}`}
            className="block w-full rounded bg-orange-600 py-3 text-center text-sm font-semibold text-white hover:bg-orange-500"
          >
            Contactar vendedor
          </a>
        </div>
      </main>
    </>
  );
}