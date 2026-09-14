import type { Metadata } from "next";
import RegistroForm from "./RegistroForm";

export const metadata: Metadata = {
  title: "Regístrate | Marketplace Moa",
};

export default function RegistroPage() {
  return <RegistroForm />;
}