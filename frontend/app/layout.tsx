import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import MobileNav from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "Marketplace Moa",
  description: "Compra y vende en tu comunidad",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="bg-surface text-ink">
        <AuthProvider>
          <AppShell>{children}</AppShell>
          <MobileNav />
        </AuthProvider>
      </body>
    </html>
  );
}