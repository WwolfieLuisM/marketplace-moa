"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Button from "@/components/Button";
import ErrorBanner from "@/components/ErrorBanner";
import { IconBox, IconPlus, IconWarning } from "@/components/icons";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { REPARTOS_MOA } from "@/lib/types";
import type { Categoria, VendedorPerfil } from "@/lib/types";

const LIMITE_DIA = 5;
const LIMITE_TOTAL = 10;
const MAX_PRODUCTOS = 3;
const MAX_FOTOS = 3;

type FotoEstado = { file: File; preview: string; base64: string };

type ProductoForm = {
  nombre: string;
  descripcion: string;
  precio: string;
  cantidad: string;
  categoriaId: string;
  fotos: FotoEstado[];
};

function productoVacio(): ProductoForm {
  return { nombre: "", descripcion: "", precio: "", cantidad: "", categoriaId: "", fotos: [] };
}

function FotoThumb({ foto, onRemove }: { foto: FotoEstado; onRemove: () => void }) {
  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-line">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={foto.preview} alt="" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Quitar foto"
        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink/60 text-[11px] font-bold text-white"
      >
        x
      </button>
    </div>
  );
}

export default function NuevaPublicacionForm() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();

  const [perfil, setPerfil] = useState<VendedorPerfil | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [titulo, setTitulo] = useState("");
  const [reparto, setReparto] = useState("");
  const [conDomicilio, setConDomicilio] = useState(false);
  const [telefonoFijo, setTelefonoFijo] = useState("");
  const [telefonoMovil, setTelefonoMovil] = useState("");
  const [productos, setProductos] = useState<ProductoForm[]>([productoVacio()]);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cargando || !usuario) return;
    let activo = true;
    Promise.all([
      api.get<{ perfil: VendedorPerfil }>("/vendedores/me").catch(() => null),
      api.get<{ categorias: Categoria[] }>("/feed/categorias").catch(() => ({ categorias: [] })),
    ]).then(([perfilRes, catRes]) => {
      if (!activo) return;
      if (perfilRes) setPerfil(perfilRes.perfil);
      setCategorias(catRes.categorias);
      setCargandoInicial(false);
    });
    return () => { activo = false; };
  }, [usuario, cargando]);

  function restantesHoy() {
    if (!perfil || perfil.estadoSuscripcion !== "demo") return null;
    return Math.max(0, LIMITE_DIA - perfil.productosHoy);
  }

  function restantesTotal() {
    if (!perfil || perfil.estadoSuscripcion !== "demo") return null;
    return Math.max(0, LIMITE_TOTAL - perfil.productosTotalDemo);
  }

  const limitado = perfil?.estadoSuscripcion === "demo" && (restantesHoy() === 0 || restantesTotal() === 0);

  function limiteProductosForm() {
    if (!perfil || perfil.estadoSuscripcion !== "demo") return MAX_PRODUCTOS;
    const restantes = Math.min(restantesHoy() ?? MAX_PRODUCTOS, restantesTotal() ?? MAX_PRODUCTOS);
    return Math.max(0, Math.min(MAX_PRODUCTOS, restantes));
  }

  function agregarProducto() {
    if (productos.length >= MAX_PRODUCTOS || limitado || productos.length >= limiteProductosForm()) return;
    setProductos((p) => [...p, productoVacio()]);
  }

  function quitarProducto(idx: number) {
    setProductos((p) => p.filter((_, i) => i !== idx));
  }

  function actualizar(idx: number, campo: keyof ProductoForm, valor: string | FotoEstado[]) {
    setProductos((p) => p.map((item, i) => (i === idx ? { ...item, [campo]: valor } : item)));
  }

  async function seleccionarFotos(idx: number, files: FileList | null) {
    if (!files) return;
    const actuales = [...productos[idx].fotos];
    const disponibles = MAX_FOTOS - actuales.length;
    const aLeer = Array.from(files).slice(0, disponibles);
    for (const file of aLeer) {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      actuales.push({ file, preview: URL.createObjectURL(file), base64 });
    }
    actualizar(idx, "fotos", actuales);
  }

  function quitarFoto(idxProducto: number, idxFoto: number) {
    setProductos((p) =>
      p.map((item, i) =>
        i === idxProducto
          ? { ...item, fotos: item.fotos.filter((_, fi) => fi !== idxFoto) }
          : item
      )
    );
  }

  function validar(): string | null {
    if (!titulo.trim()) return "El título es obligatorio.";
    if (!reparto) return "Selecciona un reparto.";
    for (let i = 0; i < productos.length; i++) {
      const p = productos[i];
      const n = i + 1;
      if (!p.nombre.trim()) return `El producto ${n} necesita un nombre.`;
      if (!p.descripcion.trim()) return `El producto ${n} necesita una descripción.`;
      const precio = Number(p.precio);
      if (!Number.isFinite(precio) || precio <= 0) return `El producto ${n} necesita un precio válido (> 0).`;
      const cantidad = Number(p.cantidad);
      if (!Number.isInteger(cantidad) || cantidad < 0) return `El producto ${n} necesita una cantidad válida (>= 0).`;
      if (!p.categoriaId) return `Selecciona una categoría para el producto ${n}.`;
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validar();
    if (v) { setError(v); return; }
    setEnviando(true);
    setError(null);
    try {
      const data = await api.post<{ publicacion: { id: string } }>("/publicaciones", {
        titulo: titulo.trim(),
        reparto,
        conDomicilio,
        telefonoFijo: telefonoFijo.trim() || undefined,
        telefonoMovil: telefonoMovil.trim() || undefined,
        productos: productos.map((p) => ({
          nombre: p.nombre.trim(),
          descripcion: p.descripcion.trim(),
          precio: Number(p.precio),
          cantidad: Number(p.cantidad),
          categoriaId: Number(p.categoriaId),
          fotos: p.fotos.map((f) => f.base64),
        })),
      });
      router.push(`/publicaciones/${data.publicacion.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la publicación.");
    } finally {
      setEnviando(false);
    }
  }

  if (cargando || cargandoInicial) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-8">
          <p className="text-[14px] text-slate-muted">Cargando...</p>
        </main>
      </>
    );
  }

  if (!usuario) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-16 text-center">
          <IconWarning className="mx-auto h-10 w-10 text-slate-muted" />
          <p className="mt-3 text-[14px] text-slate-muted">Inicia sesión para publicar productos.</p>
          <a href="/login" className="mt-4 inline-block rounded-[10px] bg-brand px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-dark">
            Iniciar sesión
          </a>
        </main>
      </>
    );
  }

  if (!perfil) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-16 text-center">
          <IconWarning className="mx-auto h-10 w-10 text-brand-light" />
          <p className="mt-3 text-[14px] text-slate-muted">
            Necesitas ser vendedor aprobado para publicar productos.
          </p>
          <a href="/vendedor/solicitud" className="mt-4 inline-block rounded-[10px] bg-brand px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-dark">
            Solicitar ser vendedor
          </a>
        </main>
      </>
    );
  }

  const rh = restantesHoy();
  const rt = restantesTotal();

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-8">
        <h1 className="mb-1 text-[22px] font-bold text-ink">Nueva publicación</h1>
        <p className="mb-6 text-[14px] text-slate-muted">Agrega hasta 3 productos con fotos y precios.</p>

        {perfil.estadoSuscripcion === "demo" && (
          <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-[13px] text-ink">
            <p>
              Plan <strong>demo</strong>: te quedan{" "}
              <strong>{rh !== null ? rh : "?"}</strong> productos hoy y{" "}
              <strong>{rt !== null ? rt : "?"}</strong> en total.
            </p>
            {limitado && (
              <p className="mt-1 text-[12px] text-brand-dark">
                Has alcanzado el límite. Mañana se reinicia el contador diario.
              </p>
            )}
          </div>
        )}

        <ErrorBanner message={error} />

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-3">
            <div>
              <label htmlFor="titulo" className="mb-1 block text-[13px] font-semibold text-ink">
                Título de la publicación
              </label>
              <input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Arroz, frijoles y productos básicos"
                disabled={limitado}
                className="h-12 w-full rounded-xl border border-line bg-white px-4 text-[14px] text-ink outline-none placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-orange-100 disabled:opacity-50"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="reparto" className="mb-1 block text-[13px] font-semibold text-ink">Reparto</label>
                <select
                  id="reparto"
                  value={reparto}
                  onChange={(e) => setReparto(e.target.value)}
                  disabled={limitado}
                  className="h-12 w-full rounded-xl border border-line bg-white px-3 text-[14px] text-ink outline-none focus:border-brand disabled:opacity-50"
                  required
                >
                  <option value="">Selecciona...</option>
                  {REPARTOS_MOA.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-[14px] text-ink">
                  <input
                    type="checkbox"
                    checked={conDomicilio}
                    onChange={(e) => setConDomicilio(e.target.checked)}
                    disabled={limitado}
                    className="h-4 w-4 rounded border-line text-brand accent-brand disabled:opacity-50"
                  />
                  Envío a domicilio
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="telFijo" className="mb-1 block text-[13px] font-semibold text-ink">Teléfono fijo</label>
                <input
                  id="telFijo"
                  value={telefonoFijo}
                  onChange={(e) => setTelefonoFijo(e.target.value)}
                  placeholder="Opcional"
                  disabled={limitado}
                  className="h-12 w-full rounded-xl border border-line bg-white px-4 text-[14px] text-ink outline-none placeholder:text-slate-400 focus:border-brand disabled:opacity-50"
                />
              </div>
              <div>
                <label htmlFor="telMovil" className="mb-1 block text-[13px] font-semibold text-ink">Teléfono móvil</label>
                <input
                  id="telMovil"
                  value={telefonoMovil}
                  onChange={(e) => setTelefonoMovil(e.target.value)}
                  placeholder="Opcional"
                  disabled={limitado}
                  className="h-12 w-full rounded-xl border border-line bg-white px-4 text-[14px] text-ink outline-none placeholder:text-slate-400 focus:border-brand disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-[15px] font-bold text-ink">Productos ({productos.length}/{MAX_PRODUCTOS})</h2>
            <div className="space-y-5">
              {productos.map((prod, idx) => (
                <div key={idx} className="rounded-2xl border border-line bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-ink">Producto {idx + 1}</span>
                    {productos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => quitarProducto(idx)}
                        disabled={limitado}
                        className="text-[13px] font-semibold text-slate-muted hover:text-brand-dark disabled:opacity-40"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <input
                      value={prod.nombre}
                      onChange={(e) => actualizar(idx, "nombre", e.target.value)}
                      placeholder="Nombre del producto"
                      disabled={limitado}
                      className="h-11 w-full rounded-xl border border-line bg-surface px-4 text-[14px] text-ink outline-none placeholder:text-slate-400 focus:border-brand disabled:opacity-50"
                      required
                    />
                    <textarea
                      value={prod.descripcion}
                      onChange={(e) => actualizar(idx, "descripcion", e.target.value)}
                      placeholder="Descripción breve (calidad, origen, etc.)"
                      rows={2}
                      disabled={limitado}
                      className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-2.5 text-[14px] text-ink outline-none placeholder:text-slate-400 focus:border-brand disabled:opacity-50"
                      required
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-muted">Precio (CUP)</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={prod.precio}
                          onChange={(e) => actualizar(idx, "precio", e.target.value)}
                          placeholder="0"
                          disabled={limitado}
                          className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-[14px] text-ink outline-none focus:border-brand disabled:opacity-50"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-muted">Cantidad</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={prod.cantidad}
                          onChange={(e) => actualizar(idx, "cantidad", e.target.value)}
                          placeholder="0"
                          disabled={limitado}
                          className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-[14px] text-ink outline-none focus:border-brand disabled:opacity-50"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-muted">Categoría</label>
                        <select
                          value={prod.categoriaId}
                          onChange={(e) => actualizar(idx, "categoriaId", e.target.value)}
                          disabled={limitado}
                          className="h-10 w-full rounded-xl border border-line bg-surface px-2 text-[13px] text-ink outline-none focus:border-brand disabled:opacity-50"
                          required
                        >
                          <option value="">...</option>
                          {categorias.map((c) => (
                            <option key={c.id} value={String(c.id)}>{c.nombre}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="mb-1.5 block text-[11px] text-slate-muted">
                      Fotos ({prod.fotos.length}/{MAX_FOTOS})
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {prod.fotos.map((f, fi) => (
                        <FotoThumb
                          key={fi}
                          foto={f}
                          onRemove={() => quitarFoto(idx, fi)}
                        />
                      ))}
                      {prod.fotos.length < MAX_FOTOS && (
                        <button
                          type="button"
                          onClick={() => fileRefs.current[idx]?.click()}
                          disabled={limitado}
                          className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-line text-slate-400 transition-colors hover:border-brand hover:text-brand disabled:opacity-40"
                        >
                          <IconPlus className="h-6 w-6" />
                        </button>
                      )}
                      <input
                        ref={(el) => { fileRefs.current[idx] = el; }}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          void seleccionarFotos(idx, e.target.files);
                          if (e.target) e.target.value = "";
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {productos.length < MAX_PRODUCTOS && (
              <button
                type="button"
                onClick={agregarProducto}
                disabled={limitado || productos.length >= limiteProductosForm()}
                className="mt-4 flex items-center gap-2 rounded-xl border-2 border-dashed border-line px-4 py-3 text-[14px] font-semibold text-slate-600 transition-colors hover:border-brand hover:text-brand disabled:opacity-40"
              >
                <IconPlus className="h-5 w-5" />
                Agregar producto
              </button>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={enviando || limitado} className="px-8">
              {enviando ? "Publicando..." : "Publicar"}
            </Button>
          </div>
        </form>
      </main>
    </>
  );
}