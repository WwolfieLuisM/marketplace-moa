"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ComponentType } from "react";
import ProductCard from "@/components/ProductCard";
import ErrorBanner from "@/components/ErrorBanner";
import {
  IconAlimento,
  IconBebida,
  IconBelleza,
  IconBox,
  IconHogar,
  IconRopa,
  IconSearch,
  IconServicios,
  IconTecnologia,
} from "@/components/icons";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFavoritos } from "@/lib/favoritos";
import { sintetizarPublicacion } from "@/lib/feed";
import { REPARTOS_MOA } from "@/lib/types";
import type {
  Categoria,
  FeedPublicacion,
  ProductoResultado,
} from "@/lib/types";

const PAGE_SIZE = 12;

const ICONOS_CATEGORIA: Record<string, ComponentType<{ className?: string }>> = {
  Alimentos: IconAlimento,
  Bebidas: IconBebida,
  "Ropa y calzado": IconRopa,
  "Hogar y muebles": IconHogar,
  Tecnología: IconTecnologia,
  "Belleza y salud": IconBelleza,
  Servicios: IconServicios,
  Otros: IconBox,
};

function unir(prev: FeedPublicacion[], nuevos: FeedPublicacion[]) {
  const mapa = new Map(prev.map((p) => [p.id, p]));
  for (const n of nuevos) mapa.set(n.id, n);
  return Array.from(mapa.values());
}

export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <main className="moa-board main-page">
          <section className="welcome">
            <h1>¿Qué estás buscando en Moa?</h1>
            <p>Publicaciones de comercios y vendedores del municipio.</p>
          </section>
        </main>
      }
    >
      <ContenidoFeed />
    </Suspense>
  );
}

function ContenidoFeed() {
  const { usuario } = useAuth();
  const { esFavorito, toggle } = useFavoritos();
  const searchParams = useSearchParams();
  const buscarRef = useRef<HTMLInputElement>(null);

  const [publicaciones, setPublicaciones] = useState<FeedPublicacion[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [query, setQuery] = useState("");
  const [qAplicada, setQAplicada] = useState("");
  const [reparto, setReparto] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [vista, setVista] = useState<"feed" | "busqueda">("feed");
  const [pagina, setPagina] = useState(1);
  const [hayMas, setHayMas] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reqId = useRef(0);

  const cargarPagina = useCallback(
    async (n: number, append: boolean) => {
      const id = ++reqId.current;
      try {
        if (vista === "busqueda") {
          const data = await api.get<{ productos: ProductoResultado[]; page: number }>(
            `/feed/productos?q=${encodeURIComponent(qAplicada)}&page=${n}`
          );
          if (id !== reqId.current) return;
          const items = data.productos.map(sintetizarPublicacion);
          setPublicaciones((prev) => (append ? unir(prev, items) : items));
          setHayMas(items.length === PAGE_SIZE);
        } else {
          const params = new URLSearchParams();
          if (reparto) params.set("reparto", reparto);
          if (categoriaId) params.set("categoria", categoriaId);
          params.set("page", String(n));
          const data = await api.get<{ feed: FeedPublicacion[]; page: number }>(
            `/feed?${params}`
          );
          if (id !== reqId.current) return;
          setPublicaciones((prev) => (append ? unir(prev, data.feed) : data.feed));
          setHayMas(data.feed.length === PAGE_SIZE);
        }
        setError(null);
      } catch (e) {
        if (id !== reqId.current) return;
        setError(e instanceof Error ? e.message : "No se pudo cargar el feed.");
      } finally {
        if (id === reqId.current) {
          setCargando(false);
          setCargandoMas(false);
        }
      }
    },
    [vista, qAplicada, reparto, categoriaId]
  );

  // búsqueda con debounce: escribe -> consulta /feed/productos ; vacío -> vuelve al feed
  useEffect(() => {
    const t = setTimeout(() => {
      const q = query.trim();
      if (q === qAplicada) return;
      setQAplicada(q);
      setVista(q ? "busqueda" : "feed");
    }, 350);
    return () => clearTimeout(t);
  }, [query, qAplicada]);

  // recarga desde la página 1 al cambiar filtros, término o modo
  useEffect(() => {
    setCargando(true);
    setPublicaciones([]);
    setPagina(1);
    setHayMas(true);
    void cargarPagina(1, false);
  }, [vista, qAplicada, reparto, categoriaId, cargarPagina]);

  const [categoriasData, setCategoriasData] = useState<Categoria[]>([]);

  useEffect(() => {
    api
      .get<{ categorias: Categoria[] }>("/feed/categorias")
      .then((d) => setCategoriasData(d.categorias))
      .catch(() => setCategoriasData([]));
  }, []);

  // la ruta viene con ?buscar=1 desde el nav móvil: enfoca y abre el buscador
  useEffect(() => {
    if (searchParams.get("buscar")) {
      const t = setTimeout(() => buscarRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  function cargarMas() {
    const n = pagina + 1;
    setPagina(n);
    setCargandoMas(true);
    void cargarPagina(n, true);
  }

  function aplicarFiltro(kind: "reparto" | "categoria", value: string) {
    if (kind === "reparto") setReparto(value);
    else setCategoriaId(value);
    setQuery("");
  }

  return (
    <>
      <main className="moa-board main-page">
        <section className="welcome">
          <h1>¿Qué estás buscando en Moa?</h1>
          <p>Publicaciones de comercios y vendedores del municipio.</p>
        </section>

        <section className="search-row">
          <div className="search-box">
            <IconSearch />
            <input
              ref={buscarRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto (ej. arroz, pollo, medicamento)"
            />
          </div>
        </section>

        <div className="cat-row">
          {categoriasData
            .filter((c) => c.nombre !== "Test Job")
            .map((c) => {
              const Icono = ICONOS_CATEGORIA[c.nombre] || IconBox;
              const activa = categoriaId === String(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => aplicarFiltro("categoria", activa ? "" : String(c.id))}
                  className={`cat ${activa ? "active" : ""}`}
                >
                  <Icono className="icon" />
                  <span>{c.nombre}</span>
                </button>
              );
            })}
        </div>

        <div className="feed-hdr">
          <h2>
            {vista === "busqueda"
              ? `Resultados para "${qAplicada}"`
              : "Publicaciones"}
            {!cargando && publicaciones.length > 0 && (
              <span> ({publicaciones.length})</span>
            )}
          </h2>
          <div className="feed-tools">
            <select
              value={reparto}
              onChange={(e) => aplicarFiltro("reparto", e.target.value)}
              className="sort-select"
            >
              <option value="">Todos los repartos</option>
              {REPARTOS_MOA.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ErrorBanner message={error} />

        <section className="mt-8">
          {cargando ? (
            <p className="text-[14px] text-slate-muted">Cargando publicaciones...</p>
          ) : publicaciones.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <IconBox className="h-10 w-10 text-slate-muted" />
              <p className="text-[14px] text-slate-muted">
                {vista === "busqueda"
                  ? `No encontramos productos para "${qAplicada}".`
                  : "Aún no hay publicaciones con estos filtros."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
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
              {hayMas && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={cargarMas}
                    disabled={cargandoMas}
                    className="rounded-[10px] border-[1.5px] border-line px-6 py-2.5 text-[14px] font-semibold text-slate-700 hover:border-slate-300 disabled:opacity-50"
                  >
                    {cargandoMas ? "Cargando..." : "Cargar más"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </>
  );
}
