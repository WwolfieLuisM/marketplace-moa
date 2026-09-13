import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketplace Moa",
  description: "Prueba de conexión con el backend",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="bg-neutral-100 text-neutral-900">{children}</body>
    </html>
  );
}