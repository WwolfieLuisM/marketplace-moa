"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ErrorBanner from "@/components/ErrorBanner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Resumen = {
  usuarios: number;
  vendedores: number;
  vendedoresPendientes: number;
  licenciasActivas: number;
  publicaciones: number;
  productos: number;
  mensajes: number;
  favoritos: number;
  reportes: number;
};

const nf = new Intl.NumberFormat("es-CU", { maximumFractionDigits: 0 });

export default function AdminDashboard() {
  const { usuario, cargando } = useAuth();
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario || usuario.rol !== "admin" || resumen) return;
    api
      .get<{ resumen: Resumen }>("/admin/resumen")
      .then((data) => setResumen(data.resumen))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "No se pudo cargar el resumen.")
      );
  }, [usuario, resumen]);

  if (cargando) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8">
          <p className="text-[14px] text-slate-muted">Cargando...</p>
        </main>
      </>
    );
  }

  if (!usuario) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-16 text-center">
          <p className="text-[14px] text-slate-muted">Inicia sesión como administrador.</p>
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

  if (usuario.rol !== "admin") {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-16 text-center">
          <p className="text-[14px] text-slate-muted">No tienes permisos para acceder aquí.</p>
        </main>
      </>
    );
  }

  const tarjetas: { etiqueta: string; valor: number; href?: string; destacar?: boolean }[] = [
    { etiqueta: "Usuarios", valor: resumen?.usuarios ?? 0 },
    { etiqueta: "Vendedores", valor: resumen?.vendedores ?? 0 },
    { etiqueta: "Licencias activas", valor: resumen?.licenciasActivas ?? 0 },
    {
      etiqueta: "Pendientes de aprobar",
      valor: resumen?.vendedoresPendientes ?? 0,
      href: "/admin/vendedores",
      destacar: resumen?.vendedoresPendientes ? true : false,
    },
    { etiqueta: "Publicaciones", valor: resumen?.publicaciones ?? 0 },
    { etiqueta: "Productos", valor: resumen?.productos ?? 0 },
    { etiqueta: "Mensajes", valor: resumen?.mensajes ?? 0 },
    { etiqueta: "Favoritos", valor: resumen?.favoritos ?? 0 },
    { etiqueta: "Reportes", valor: resumen?.reportes ?? 0 },
  ];

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8">
        <h1 className="text-[22px] font-bold text-ink">Panel de administración</h1>
        <p className="mt-1 text-[14px] text-slate-muted">Resumen general de Marketplace Moa.</p>

        <ErrorBanner message={error} />

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tarjetas.map((t) => {
            const contenido = (
              <>
                <p className="text-[12px] font-semibold text-slate-muted">{t.etiqueta}</p>
                <p
                  className={`mt-1 text-[28px] font-bold leading-none ${
                    t.destacar ? "text-brand" : "text-ink"
                  }`}
                >
                  {nf.format(t.valor)}
                </p>
              </>
            );
            if (t.href) {
              return (
                <Link
                  key={t.etiqueta}
                  href={t.href}
                  className={`rounded-2xl border p-4 transition-colors ${
                    t.destacar
                      ? "border-brand/30 bg-brand/5 hover:border-brand/60"
                      : "border-line bg-white hover:border-slate-300"
                  }`}
                >
                  {contenido}
                </Link>
              );
            }
            return (
              <div key={t.etiqueta} className="rounded-2xl border border-line bg-white p-4">
                {contenido}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/admin/vendedores"
            className="rounded-[10px] bg-brand px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-dark"
          >
            Gestionar vendedores
          </Link>
          <Link
            href="/perfil"
            className="rounded-[10px] border-[1.5px] border-line bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-700 hover:border-slate-300"
          >
            Mi perfil
          </Link>
        </div>
      </main>
    </>
  );
}