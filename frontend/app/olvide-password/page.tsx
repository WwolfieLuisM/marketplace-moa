import type { Metadata } from "next";
import OlvidePasswordForm from "./OlvidePasswordForm";

export const metadata: Metadata = {
  title: "Recuperar contraseña | Marketplace Moa",
};

export default function OlvidePasswordPage() {
  return <OlvidePasswordForm />;
}