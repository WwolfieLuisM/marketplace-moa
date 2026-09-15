"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FeedPublicacion, Producto } from "@/lib/types";
import { tiempoRelativo } from "@/lib/fecha";
import { IconBox, IconHeart, IconLocation } from "./icons";

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

function BadgeDisponible({ producto }: { producto: Producto }) {
  const disponible = producto.estado === "activo" && producto.cantidad > 0;
  return (
    <span
      className={`shrink-0 text-[10px] font-bold uppercase tracking-wide ${
        disponible ? "text-success" : "text-slate-muted"
      }`}
    >
      {disponible ? "Disponible" : "Agotado"}
    </span>
  );
}

export default function ProductCard({
  publicacion,
  logueado,
  esFavorito,
  onToggleFavorito,
}: {
  publicacion: FeedPublicacion;
  logueado: boolean;
  esFavorito?: (productoId: string) => boolean;
  onToggleFavorito?: (productoId: string) => void;
}) {
  const router = useRouter();
  const foto = fotoPrincipal(publicacion);

  function toggleFavorito(productoId: string) {
    if (!logueado) {
      router.push("/login");
      return;
    }
    onToggleFavorito?.(productoId);
  }

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
        <p className="mb-3 flex items-center gap-1.5 text-[13px] text-slate-muted">
          <span className="truncate">{nombreVendedor(publicacion)}</span>
          <span className="text-slate-300">·</span>
          <span className="shrink-0">{tiempoRelativo(publicacion.creadoEn)}</span>
        </p>

        <ul className="mb-4 flex flex-col gap-2">
          {publicacion.productos.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-semibold text-ink">{p.nombre}</span>
                  <BadgeDisponible producto={p} />
                </p>
                {p.categoria && (
                  <p className="text-[11px] text-slate-muted">{p.categoria.nombre}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="text-[13px] font-bold text-brand">{p.precio} CUP</span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorito(p.id);
                  }}
                  aria-label={
                    esFavorito?.(p.id) ? "Quitar de guardados" : "Guardar en favoritos"
                  }
                  aria-pressed={esFavorito?.(p.id) ?? false}
                  className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                    esFavorito?.(p.id)
                      ? "text-brand"
                      : "text-slate-400 hover:text-brand"
                  }`}
                >
                  <IconHeart
                    className="h-[17px] w-[17px]"
                    fill={esFavorito?.(p.id) ? "currentColor" : "none"}
                  />
                </button>
              </div>
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
          <Link
            href={logueado ? `/mensajes?publicacion=${publicacion.id}` : "/login"}
            className="flex-1 rounded-[10px] bg-brand px-3 py-2 text-center text-[13px] font-semibold text-white hover:bg-brand-dark"
          >
            Contactar vendedor
          </Link>
        </div>
      </div>
    </article>
  );
}