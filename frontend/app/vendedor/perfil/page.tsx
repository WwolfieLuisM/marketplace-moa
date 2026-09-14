import type { Metadata } from "next";
import PerfilVendedor from "./PerfilVendedor";

export const metadata: Metadata = {
  title: "Mi perfil de vendedor | Marketplace Moa",
  description: "Estado de tu suscripción, publicaciones y acciones de vendedor.",
};

export default function PerfilVendedorPage() {
  return <PerfilVendedor />;
}