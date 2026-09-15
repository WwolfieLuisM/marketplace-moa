"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import ErrorBanner from "@/components/ErrorBanner";
import { IconHeart } from "@/components/icons";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFavoritos } from "@/lib/favoritos";
import { sintetizarPublicacion } from "@/lib/feed";
import type { FeedPublicacion, ProductoResultado } from "@/lib/types";

export default function FavoritosPage() {
  const { usuario, cargando } = useAuth();
  const { esFavorito, toggle } = useFavoritos();
  const [productos, setProductos] = useState<FeedPublicacion[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const data = await api.get<{ productos: ProductoResultado[] }>("/favoritos");
      setProductos(data.productos.map(sintetizarPublicacion));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los guardados.");
    } finally {
      setCargandoLista(false);
    }
  }, []);

  useEffect(() => {
    if (usuario) void cargar();
  }, [usuario, cargar]);

  // quitar el corazón retira la tarjeta de la lista en el acto (toggle optimista)
  const visibles = useMemo(
    () => productos.filter((p) => !p.productos[0] || esFavorito(p.productos[0].id)),
    [productos, esFavorito]
  );

  if (cargando || cargandoLista) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8">
          <p className="text-[14px] text-slate-muted">Cargando guardados...</p>
        </main>
      </>
    );
  }

  if (!usuario) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-16 text-center">
          <IconHeart className="mx-auto h-10 w-10 text-slate-muted" />
          <p className="mt-3 text-[14px] text-slate-muted">
            Inicia sesión para ver tus productos guardados.
          </p>
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
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-ink">Guardados</h1>
          <Link
            href="/feed"
            className="rounded-[10px] border-[1.5px] border-line px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:border-slate-300"
          >
            Buscar en el feed
          </Link>
        </div>

        <ErrorBanner message={error} />

        {visibles.length === 0 && !error ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-white py-16 text-center">
            <IconHeart className="h-10 w-10 text-slate-muted" />
            <p className="text-[14px] text-slate-muted">
              Aún no tienes productos guardados. Toca el corazón en cualquier producto del feed.
            </p>
            <Link
              href="/feed"
              className="mt-2 text-[14px] font-semibold text-brand hover:text-brand-dark"
            >
              Ir al feed
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {visibles.map((pub) => (
              <ProductCard
                key={pub.id}
                publicacion={pub}
                logueado
                esFavorito={esFavorito}
                onToggleFavorito={(id) => void toggle(id)}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}