"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Avatar from "@/components/Avatar";
import ErrorBanner from "@/components/ErrorBanner";
import { IconChat } from "@/components/icons";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatearLista, inicioDeDia } from "@/lib/fecha";
import type { Conversacion, DetallePublicacion } from "@/lib/types";

export default function MensajesPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { usuario, cargando } = useAuth();

  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const data = await api.get<{ conversaciones: Conversacion[] }>("/mensajes/conversaciones");
      setConversaciones(data.conversaciones);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las conversaciones.");
    } finally {
      setCargandoLista(false);
    }
  }, []);

  // "Contactar vendedor" llega con ?publicacion=... ; resolvemos al vendedor y
  // abrimos el hilo con contexto de producto (backend no expone userId en el feed).
  useEffect(() => {
    const publicacionId = params.get("publicacion");
    if (!publicacionId) return;
    api
      .get<{ publicacion: DetallePublicacion }>(`/publicaciones/${publicacionId}`)
      .then((data) => {
        const vendedorId = data.publicacion.vendedor?.user?.id;
        if (!vendedorId) throw new Error("La publicación no tiene vendedor visible.");
        const primerProducto = data.publicacion.productos?.[0];
        const query = new URLSearchParams({ publicacion: publicacionId });
        if (primerProducto) query.set("producto", primerProducto.id);
        router.replace(`/mensajes/${vendedorId}?${query.toString()}`);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) {
          setError("La publicación ya no está disponible.");
        } else {
          setError(e instanceof Error ? e.message : "No se pudo iniciar la conversación.");
        }
      });
  }, [params, router]);

  useEffect(() => {
    if (usuario) void cargar();
  }, [usuario, cargar]);

  const hoyInicio = inicioDeDia(new Date());
  const ayerInicio = inicioDeDia(new Date(Date.now() - 86400000));

  if (cargando || cargandoLista) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-8">
          <p className="text-[14px] text-slate-muted">Cargando mensajes...</p>
        </main>
      </>
    );
  }

  if (!usuario) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-16 text-center">
          <IconChat className="mx-auto h-10 w-10 text-slate-muted" />
          <p className="mt-3 text-[14px] text-slate-muted">
            Inicia sesión para ver tus conversaciones.
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
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-8">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-ink">Mensajes</h1>
          <Link
            href="/feed"
            className="rounded-[10px] border-[1.5px] border-line px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:border-slate-300"
          >
            Buscar en el feed
          </Link>
        </div>

        <ErrorBanner message={error} />

        {conversaciones.length === 0 && !error ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-white py-16 text-center">
            <IconChat className="h-10 w-10 text-slate-muted" />
            <p className="text-[14px] text-slate-muted">
              Aún no tienes conversaciones. Contacta a un vendedor desde el feed.
            </p>
            <Link
              href="/feed"
              className="mt-2 text-[14px] font-semibold text-brand hover:text-brand-dark"
            >
              Ir al feed
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {conversaciones.map((c) => (
              <li key={c.otroUsuarioId}>
                <Link
                  href={`/mensajes/${c.otroUsuarioId}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface"
                >
                  <Avatar nombre={c.otroUsuario.nombre} apellidos={c.otroUsuario.apellidos} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[14px] font-semibold text-ink">
                        {[c.otroUsuario.nombre, c.otroUsuario.apellidos].filter(Boolean).join(" ")}
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-muted">
                        {formatearLista(c.ultimoMensaje.creadoEn, hoyInicio, ayerInicio)}
                      </span>
                    </p>
                    <p className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] text-slate-muted">
                        {c.ultimoMensaje.remitenteId === usuario.id && "Tú: "}
                        {c.ultimoMensaje.contenido}
                      </span>
                      {c.noLeidos > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">
                          {c.noLeidos}
                        </span>
                      )}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}