import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
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
          {children}
          <MobileNav />
        </AuthProvider>
      </body>
    </html>
  );
}