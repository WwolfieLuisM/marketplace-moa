"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import Avatar from "./Avatar";
import { IconChat, IconHouse, IconLogo, IconLogout } from "./icons";

export default function Header() {
  const { usuario, cargando, logout } = useAuth();
  const [noLeidos, setNoLeidos] = useState(0);

  useEffect(() => {
    if (!usuario) return;
    let activo = true;
    const cargar = async () => {
      try {
        const data = await api.get<{ noLeidos: number }>("/mensajes/no-leidos");
        if (activo) setNoLeidos(data.noLeidos);
      } catch { /* ignorar */ }
    };
    void cargar();
    const t = setInterval(cargar, 30000);
    return () => { activo = false; clearInterval(t); };
  }, [usuario]);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/feed" className="flex items-center gap-2">
          <IconLogo className="h-8 w-8" />
          <span className="text-[17px] font-bold text-ink">Marketplace Moa</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/feed"
            aria-label="Inicio (feed)"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-surface"
          >
            <IconHouse className="h-5 w-5" />
          </Link>
          {cargando ? null : usuario ? (
            <>
              <Link
                href="/mensajes"
                aria-label={`Mensajes${noLeidos ? `, ${noLeidos} sin leer` : ""}`}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-surface"
              >
                <IconChat className="h-5 w-5" />
                {noLeidos > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold leading-none text-white">
                    {noLeidos}
                  </span>
                )}
              </Link>
              <Link href="/perfil" aria-label="Mi perfil">
                <Avatar nombre={usuario.nombre} apellidos={usuario.apellidos} />
              </Link>
              {usuario.rol === "admin" && (
                <Link
                  href="/admin"
                  className="rounded-lg px-2 py-1.5 text-[13px] font-semibold text-brand hover:bg-orange-50"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={logout}
                aria-label="Cerrar sesión"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-surface"
              >
                <IconLogout className="h-5 w-5" />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-[10px] bg-brand px-3 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}