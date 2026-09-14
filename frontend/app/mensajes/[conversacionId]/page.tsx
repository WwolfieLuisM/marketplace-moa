"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Avatar from "@/components/Avatar";
import ErrorBanner from "@/components/ErrorBanner";
import { IconBack, IconBox, IconCheck, IconCheckDouble, IconSend } from "@/components/icons";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { claveDia, formatearHora, inicioDeDia } from "@/lib/fecha";
import type { DetallePublicacion, HiloConversacion, Mensaje } from "@/lib/types";

const POLL_MS = 12000;

type ContextoProducto = { id: string; nombre: string; precio?: string };

export default function HiloMensajesPage() {
  const router = useRouter();
  const params = useParams();
  const query = useSearchParams();
  const { usuario, cargando } = useAuth();
  const otroUserId = String(params.conversacionId ?? "");

  const publicacionId = query.get("publicacion");
  const productoId = query.get("producto");

  const [otro, setOtro] = useState<HiloConversacion["otroUsuario"] | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [contexto, setContexto] = useState<ContextoProducto | null>(null);
  const [cargandoHilo, setCargandoHilo] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const listaRef = useRef<HTMLDivElement>(null);
  const cargadoRef = useRef(false);

  const cargarHilo = useCallback(async () => {
    if (!otroUserId) return;
    try {
      const data = await api.get<{ conversacion: HiloConversacion }>(
        `/mensajes/conversaciones/${otroUserId}`
      );
      setOtro(data.conversacion.otroUsuario);
      setMensajes(data.conversacion.mensajes);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir la conversación.");
    } finally {
      cargadoRef.current = true;
      setCargandoHilo(false);
    }
  }, [otroUserId]);

  // Contexto del producto: ?publicacion + ?producto (viene de "Contactar vendedor"),
  // o el último mensaje con producto de la conversación ya existente.
  useEffect(() => {
    if (publicacionId && productoId) {
      api
        .get<{ publicacion: DetallePublicacion }>(`/publicaciones/${publicacionId}`)
        .then((data) => {
          const prod = data.publicacion.productos?.find((p) => p.id === productoId);
          if (prod) setContexto({ id: prod.id, nombre: prod.nombre, precio: prod.precio });
        })
        .catch(() => {});
      return;
    }
    const ultimo = mensajes[mensajes.length - 1];
    if (ultimo?.producto) setContexto({ id: ultimo.producto.id, nombre: ultimo.producto.nombre });
    else setContexto(null);
  }, [publicacionId, productoId, mensajes]);

  useEffect(() => {
    if (usuario) void cargarHilo();
  }, [usuario, cargarHilo, otroUserId]);

  // Scroll al fondo cuando cambian los mensajes.
  useEffect(() => {
    const el = listaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensajes]);

  // Polling cada 12 s mientras el hilo está abierto (decisión de robustez).
  useEffect(() => {
    if (!otroUserId || !usuario) return;
    const timer = setInterval(cargarHilo, POLL_MS);
    return () => clearInterval(timer);
  }, [otroUserId, usuario, cargarHilo]);

  const agrupados = useMemo(() => {
    const hoy = inicioDeDia(new Date());
    const ayer = inicioDeDia(new Date(Date.now() - 86400000));
    return mensajes
      .reduce<{ clave: string; items: Mensaje[] }[]>((acc, m) => {
        const clave = claveDia(m.creadoEn, hoy, ayer);
        const ultimo = acc[acc.length - 1];
        if (ultimo && ultimo.clave === clave) ultimo.items.push(m);
        else acc.push({ clave, items: [m] });
        return acc;
      }, [])
      .filter((g) => g.items.length > 0);
  }, [mensajes]);

  async function enviar() {
    const contenido = texto.trim();
    if (!contenido || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const data = await api.post<{ mensaje: Mensaje }>("/mensajes", {
        destinatarioId: otroUserId,
        productoId: contexto?.id ?? null,
        contenido,
      });
      setMensajes((prev) => (prev.some((m) => m.id === data.mensaje.id) ? prev : [...prev, data.mensaje]));
      setTexto("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar el mensaje.");
    } finally {
      setEnviando(false);
    }
  }

  if (cargando || cargandoHilo) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-surface">
        <div className="flex h-14 items-center gap-3 border-b border-line bg-white px-4">
          <Link href="/mensajes" aria-label="Volver a mensajes" className="text-slate-600">
            <IconBack className="h-5 w-5" />
          </Link>
          <p className="text-[14px] text-slate-muted">Cargando conversación...</p>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-center bg-surface px-6 text-center">
        <p className="text-[14px] text-slate-muted">Inicia sesión para ver esta conversación.</p>
        <Link
          href="/login"
          className="mt-4 rounded-[10px] bg-brand px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-dark"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  const nombreOtro = otro ? [otro.nombre, otro.apellidos].filter(Boolean).join(" ") : "Conversación";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-surface">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <Link href="/mensajes" aria-label="Volver a mensajes" className="text-slate-600">
          <IconBack className="h-5 w-5" />
        </Link>
        <Avatar nombre={otro?.nombre} apellidos={otro?.apellidos} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-ink">{nombreOtro}</p>
          <p className="text-[12px] text-slate-muted">Vendedor del feed</p>
        </div>
      </header>

      {contexto && (
        <div className="flex items-center gap-2.5 border-b border-orange-200 bg-orange-50 px-4 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-avatar text-brand">
            <IconBox className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-dark">
              Sobre este producto
            </p>
            <p className="truncate text-[13px] font-semibold text-ink">{contexto.nombre}</p>
          </div>
          {contexto.precio && (
            <span className="shrink-0 text-[13px] font-bold text-brand">{contexto.precio} CUP</span>
          )}
        </div>
      )}

      <ErrorBanner message={error} />

      <div ref={listaRef} className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-4">
        {agrupados.map((grupo) => (
          <div key={grupo.clave}>
            <p className="my-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-muted">
              {grupo.clave}
            </p>
            {grupo.items.map((m) => {
              const mia = m.remitenteId === usuario.id;
              return (
                <div key={m.id} className={`mb-2.5 flex max-w-[78%] ${mia ? "justify-end self-end" : "self-start"}`}>
                  <div>
                    <div
                      className={`rounded-[16px] px-3.5 py-2.5 text-[14px] leading-relaxed ${
                        mia
                          ? "rounded-br-[4px] bg-brand text-white"
                          : "rounded-bl-[4px] border border-line bg-white text-ink"
                      }`}
                    >
                      {m.contenido}
                    </div>
                    <div className={`mt-0.5 flex items-center gap-1 text-[10.5px] text-slate-muted ${mia ? "justify-end" : ""}`}>
                      {formatearHora(m.creadoEn)}
                      {mia &&
                        (m.leido ? (
                          <IconCheckDouble className="h-3.5 w-3.5 text-brand" />
                        ) : (
                          <IconCheck className="h-3.5 w-3.5 text-slate-400" />
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {mensajes.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-[14px] text-slate-muted">
              {contexto
                ? "Este chat se abre para hablar de este producto. Escribe tu primer mensaje."
                : "Aún no hay mensajes en esta conversación."}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-line bg-white px-3 py-2.5">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void enviar();
            }
          }}
          placeholder="Escribe un mensaje..."
          rows={1}
          className="max-h-24 min-h-[40px] flex-1 resize-none rounded-[20px] border-[1.5px] border-line bg-white px-4 py-2.5 text-[14px] text-ink outline-none placeholder:text-slate-400 focus:border-brand"
        />
        <button
          onClick={() => void enviar()}
          disabled={enviando || !texto.trim()}
          aria-label="Enviar mensaje"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-dark disabled:opacity-40"
        >
          <IconSend className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
}