"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const sinHeader =
    pathname.startsWith("/login") ||
    pathname.startsWith("/registro") ||
    pathname.startsWith("/mensajes/") ||
    pathname === "/ping";

  return (
    <>
      {!sinHeader && <Header />}
      {children}
    </>
  );
}