import type { Metadata } from "next";
import AdminDashboard from "./AdminDashboard";

export const metadata: Metadata = {
  title: "Admin | Marketplace Moa",
  description: "Panel de administración de Marketplace Moa.",
};

export default function AdminPage() {
  return <AdminDashboard />;
}