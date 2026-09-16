"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ComponentType } from "react";
import Header from "@/components/Header";
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
import type { Categoria, FeedPublicacion, ProductoResultado } from "@/lib/types";

const PAGE_SIZE = 20;

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

const OPCIONES_ORDEN = [
  { valor: "relevancia", etiqueta: "Relevancia" },
  { valor: "recientes", etiqueta: "Más recientes" },
  { valor: "menor_precio", etiqueta: "Menor precio" },
  { valor: "mayor_precio", etiqueta: "Mayor precio" },
];

function unir(prev: FeedPublicacion[], nuevos: FeedPublicacion[]) {
  const mapa = new Map(prev.map((p) => [p.id, p]));
  for (const n of nuevos) mapa.set(n.id, n);
  return Array.from(mapa.values());
}

export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8">
          <h1 className="text-2xl font-bold text-ink sm:text-[28px]">
            ¿Qué estás buscando en Moa?
          </h1>
          <p className="mt-1 text-[14px] text-slate-muted">
            Publicaciones de comercios y vendedores del municipio.
          </p>
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
  const [orden, setOrden] = useState("relevancia");
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
          if (orden) params.set("orden", orden);
          params.set("page", String(n));
          const data = await api.get<{ feed: FeedPublicacion[]; page: number }>(`/feed?${params}`);
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
    [vista, qAplicada, reparto, categoriaId, orden]
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
  }, [vista, qAplicada, reparto, categoriaId, orden, cargarPagina]);

  useEffect(() => {
    api
      .get<{ categorias: Categoria[] }>("/feed/categorias")
      .then((d) => setCategorias(d.categorias))
      .catch(() => setCategorias([]));
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
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8">
        <h1 className="text-2xl font-bold text-ink sm:text-[28px]">
          ¿Qué estás buscando en Moa?
        </h1>
        <p className="mt-1 text-[14px] text-slate-muted">
          Publicaciones de comercios y vendedores del municipio.
        </p>

<div className="mt-6 space-y-3">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              ref={buscarRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto (ej. arroz, pollo, medicamento)"
              className="h-12 w-full rounded-xl border border-line bg-white pl-11 pr-4 text-[14px] text-ink outline-none placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1">
            {categorias
              .filter((c) => c.nombre !== "Test Job")
              .map((c) => {
                const Icono = ICONOS_CATEGORIA[c.nombre] || IconBox;
                const activa = categoriaId === String(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => aplicarFiltro("categoria", activa ? "" : String(c.id))}
                    className={`flex h-[70px] w-[68px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border transition-colors ${
                      activa
                        ? "border-brand bg-brand text-white"
                        : "border-line bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Icono className="h-6 w-6" />
                    <span
                      className={`w-full truncate px-1 text-center text-[11px] font-semibold ${
                        activa ? "text-white" : "text-slate-600"
                      }`}
                    >
                      {c.nombre}
                    </span>
                  </button>
                );
              })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={reparto}
              onChange={(e) => aplicarFiltro("reparto", e.target.value)}
              className="h-11 rounded-xl border border-line bg-white px-3 text-[14px] text-ink outline-none focus:border-brand"
            >
              <option value="">Todos los repartos</option>
              {REPARTOS_MOA.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              value={categoriaId}
              onChange={(e) => aplicarFiltro("categoria", e.target.value)}
              className="h-11 rounded-xl border border-line bg-white px-3 text-[14px] text-ink outline-none focus:border-brand"
            >
              <option value="">Todas las categorías</option>
              {categorias
                .filter((c) => c.nombre !== "Test Job")
                .map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </option>
                ))}
            </select>
            {vista !== "busqueda" && (
              <select
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
                className="h-11 rounded-xl border border-line bg-white px-3 text-[14px] text-ink outline-none focus:border-brand"
              >
                {OPCIONES_ORDEN.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    Ordenar: {o.etiqueta}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <ErrorBanner message={error} />

        <section className="mt-8">
          <h2 className="mb-4 text-[15px] font-bold text-ink">
            {vista === "busqueda"
              ? `Resultados para "${qAplicada}"`
              : "Publicaciones recientes"}
            {!cargando && publicaciones.length > 0 && ` (${publicaciones.length})`}
          </h2>

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