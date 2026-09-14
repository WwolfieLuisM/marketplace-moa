import type { Metadata } from "next";
import DetallePublicacion from "./DetallePublicacion";

export const metadata: Metadata = {
  title: "Detalle de publicación | Marketplace Moa",
  description: "Conoce los productos, precios y datos de contacto del vendedor.",
};

export default function DetallePublicacionPage() {
  return <DetallePublicacion />;
}