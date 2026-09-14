import type { Metadata } from "next";
import SolicitudForm from "./SolicitudForm";

export const metadata: Metadata = {
  title: "Ser vendedor | Marketplace Moa",
  description: "Solicita tu licencia de vendedor en Marketplace Moa.",
};

export default function SolicitudPage() {
  return <SolicitudForm />;
}