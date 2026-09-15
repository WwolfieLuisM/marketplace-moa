import type { Metadata } from "next";
import AdminVendedores from "./AdminVendedores";

export const metadata: Metadata = {
  title: "Vendedores | Admin Marketplace Moa",
  description: "Aprueba o rechaza licencias de vendedor.",
};

export default function AdminVendedoresPage() {
  return <AdminVendedores />;
}