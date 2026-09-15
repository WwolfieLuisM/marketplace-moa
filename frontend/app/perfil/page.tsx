import type { Metadata } from "next";
import PerfilForm from "./PerfilForm";

export const metadata: Metadata = {
  title: "Mi perfil | Marketplace Moa",
  description: "Edita tus datos personales en Marketplace Moa.",
};

export default function PerfilPage() {
  return <PerfilForm />;
}