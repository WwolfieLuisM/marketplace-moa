"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FeedPublicacion } from "@/lib/types";
import { tiempoRelativo } from "@/lib/fecha";
import { useAuth } from "@/lib/auth";
import { IconChat, IconEye, IconHeart, IconLocation } from "@/components/icons";

function nombreVendedor(pub: FeedPublicacion) {
  const u = pub.vendedor?.user;
  if (!u?.nombre) return "Vendedor";
  return [u.nombre, u.apellidos].filter(Boolean).join(" ");
}

function iniciales(n: string) {
  const partes = n.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || "") + (partes[1]?.[0] || "")).toUpperCase();
}

function fotoPrincipalDe(pub: FeedPublicacion): string | null {
  for (const prod of pub.productos) {
    const foto = prod.fotos?.[0];
    if (foto?.url) return foto.url;
  }
  return null;
}

function prodPrincipal(pub: FeedPublicacion) {
  return pub.productos[0];
}

function otrosProductos(pub: FeedPublicacion) {
  return pub.productos.slice(1).slice(0, 3);
}

function numVendedor(pub: FeedPublicacion): string | null {
  const t = pub.telefonoMovil || pub.telefonoFijo;
  return t && t.trim() ? t.trim() : null;
}

export default function ProductCard({
  publicacion,
  logueado: logueadoProp,
  esFavorito,
  onToggleFavorito,
}: {
  publicacion: FeedPublicacion;
  logueado?: boolean;
  esFavorito?: (productoId: string) => boolean;
  onToggleFavorito?: (productoId: string) => void;
}) {
  const router = useRouter();
  const { usuario } = useAuth();
  const logueado = logueadoProp ?? !!usuario;
  const foto = fotoPrincipalDe(publicacion);
  const principal = prodPrincipal(publicacion);
  const otros = otrosProductos(publicacion);
  const telefono = numVendedor(publicacion);
  const nombre = nombreVendedor(publicacion);
  const fav = principal ? esFavorito?.(principal.id) ?? false : false;

  function toggleFav() {
    if (!logueado) {
      router.push("/login");
      return;
    }
    if (principal) onToggleFavorito?.(principal.id);
  }

  function irContacto() {
    if (!logueado) {
      router.push("/login");
      return;
    }
    router.push(`/mensajes?publicacion=${publicacion.id}`);
  }

  return (
    <article className="card">
      <div className="pub-head">
        <div className="avatar">{iniciales(nombre)}</div>
        <div className="pub-meta">
          <span className="pub-name">{nombre}</span>
          <div className="pub-sub">
            <span className="badge badge-active">
              <svg width="5" height="5" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" fill="currentColor" /></svg>
              Activo
            </span>
            <span className="badge badge-zone">
              <IconLocation width={8} height={8} />
              {publicacion.reparto || "Moa"}
            </span>
            <span className="pub-time">{tiempoRelativo(publicacion.creadoEn)}</span>
          </div>
        </div>
      </div>

      <button className="circle-btn kebab-btn" aria-label="Más opciones">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="12" cy="19" r="1.2" /></svg>
      </button>

      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt={principal?.nombre || publicacion.titulo} className="thumb" loading="lazy" />
      ) : (
        <div className="thumb" style={{ background: "linear-gradient(135deg,#3A2818,#221808)" }}>
          <div className="thumb-placeholder">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
            Sin foto aún
          </div>
        </div>
      )}

      <button
        className={`heart-btn${fav ? " active" : ""}`}
        aria-label={fav ? "Quitar de guardados" : "Guardar"}
        aria-pressed={fav}
        onClick={toggleFav}
      >
        <IconHeart width={18} height={18} fill={fav ? "currentColor" : "none"} />
      </button>

      <div className="primary-prod">
        <div className="primary-prod-title">{principal?.nombre || publicacion.titulo}</div>
        <div className="primary-prod-row">
          <div className="primary-prod-price">{principal?.precio ? `${principal.precio} CUP` : "—"}</div>
          {otros.length > 0 && <span className="prod-count-lbl">+ {otros.length} productos más</span>}
        </div>
      </div>

      {otros.length > 0 && (
        <div className="secondary-wrap">
          <div className="secondary-lbl">También en esta publicación</div>
          <div className="secondary-grid">
            {otros.map((prod) => (
              <div className="product-mini" key={prod.id}>
                <div className="product-mini-image" style={{ background: "linear-gradient(135deg,#2E3A22,#1C2412)" }}>
                  <div className="mini-placeholder">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                  </div>
                </div>
                <div className="product-mini-info">
                  <div className="product-mini-title">{prod.nombre}</div>
                  <div className="product-mini-price">{prod.precio} CUP</div>
                  <div className="product-mini-status">Disponible</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pub-footer">
        <div className="phone-chip">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 012 4.18 2 2 0 014 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
          {telefono || "Sin número"}
        </div>
        <div className="pub-actions">
          <Link href={`/publicaciones/${publicacion.id}`} className="action-btn">
            <IconEye width={13} height={13} />
            Ver
          </Link>
          <button className="action-btn primary" onClick={irContacto}>
            <IconChat width={13} height={13} />
            Contactar
          </button>
        </div>
      </div>
    </article>
  );
}