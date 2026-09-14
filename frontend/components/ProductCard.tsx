"use client";

import Link from "next/link";
import type { FeedPublicacion } from "@/lib/types";
import { IconBox, IconLocation } from "./icons";

function nombreVendedor(pub: FeedPublicacion) {
  if (!pub.vendedor?.user) return "Vendedor";
  const { nombre, apellidos } = pub.vendedor.user;
  return [nombre, apellidos].filter(Boolean).join(" ");
}

function fotoPrincipal(pub: FeedPublicacion) {
  for (const prod of pub.productos) {
    if (prod.fotos?.length) return prod.fotos[0].url;
  }
  return null;
}

export default function ProductCard({
  publicacion,
  logueado,
}: {
  publicacion: FeedPublicacion;
  logueado: boolean;
}) {
  const foto = fotoPrincipal(publicacion);

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={foto}
          alt={publicacion.titulo}
          className="h-36 w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-36 w-full items-center justify-center bg-orange-50 text-brand">
          <IconBox className="h-10 w-10" />
        </div>
      )}

      <div className="p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h2 className="text-[15px] font-bold leading-snug text-ink">{publicacion.titulo}</h2>
          <span className="flex shrink-0 items-center gap-1 text-[12px] text-slate-muted">
            <IconLocation className="h-3.5 w-3.5" />
            {publicacion.reparto || "—"}
          </span>
        </div>
        <p className="mb-3 text-[13px] text-slate-muted">{nombreVendedor(publicacion)}</p>

        <ul className="mb-4 flex flex-col gap-2">
          {publicacion.productos.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg bg-surface px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-ink">{p.nombre}</p>
                {p.categoria && (
                  <p className="text-[11px] text-slate-muted">{p.categoria.nombre}</p>
                )}
              </div>
              <span className="shrink-0 text-[13px] font-bold text-brand">{p.precio} CUP</span>
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <Link
            href={`/publicaciones/${publicacion.id}`}
            className="flex-1 rounded-[10px] border-[1.5px] border-line px-3 py-2 text-center text-[13px] font-semibold text-slate-700 hover:border-slate-300"
          >
            Ver
          </Link>
          {logueado ? (
            <Link
              href={`/mensajes?publicacion=${publicacion.id}`}
              className="flex-1 rounded-[10px] bg-brand px-3 py-2 text-center text-[13px] font-semibold text-white hover:bg-brand-dark"
            >
              Contactar vendedor
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex-1 rounded-[10px] bg-brand px-3 py-2 text-center text-[13px] font-semibold text-white hover:bg-brand-dark"
            >
              Contactar vendedor
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}