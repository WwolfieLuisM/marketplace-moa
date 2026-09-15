"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { useAuth } from "@/lib/auth";
import { IconHeart, IconHouse, IconPlus, IconSearch, IconUser } from "./icons";

function Item({
  href,
  icon: Icono,
  label,
  activa,
}: {
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  activa: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`flex flex-col items-center gap-0.5 py-1.5 ${
        activa ? "text-brand" : "text-slate-500"
      }`}
    >
      <Icono className="h-[22px] w-[22px]" />
      <span className="text-[10px] font-semibold">{label}</span>
    </Link>
  );
}

export default function MobileNav() {
  const pathname = usePathname();
  const { usuario } = useAuth();

  if (
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/registro") ||
    pathname?.startsWith("/admin")
  ) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-center px-2">
        <Item href="/feed" icon={IconHouse} label="Inicio" activa={pathname === "/feed"} />
        <Item href="/feed?buscar=1" icon={IconSearch} label="Buscar" activa={false} />
        <div className="flex justify-center">
          <Link
            href={usuario ? "/publicaciones/nueva" : "/login"}
            aria-label="Publicar producto"
            className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full border-4 border-surface bg-brand text-white shadow-lg transition-colors hover:bg-brand-dark"
          >
            <IconPlus className="h-6 w-6" />
          </Link>
        </div>
        <Item
          href="/favoritos"
          icon={IconHeart}
          label="Guardados"
          activa={pathname?.startsWith("/favoritos") ?? false}
        />
        <Item
          href="/perfil"
          icon={IconUser}
          label="Perfil"
          activa={pathname?.startsWith("/perfil") ?? false}
        />
      </div>
    </nav>
  );
}