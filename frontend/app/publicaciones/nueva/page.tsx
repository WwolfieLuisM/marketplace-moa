import type { Metadata } from "next";
import NuevaPublicacionForm from "./NuevaPublicacionForm";

export const metadata: Metadata = {
  title: "Publicar producto | Marketplace Moa",
  description: "Crea una nueva publicación con tus productos en Marketplace Moa.",
};

export default function NuevaPublicacionPage() {
  return <NuevaPublicacionForm />;
}