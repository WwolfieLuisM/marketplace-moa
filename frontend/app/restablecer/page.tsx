import type { Metadata } from "next";
import { Suspense } from "react";
import RestablecerForm from "./RestablecerForm";

export const metadata: Metadata = {
  title: "Restablecer contraseña | Marketplace Moa",
};

export default function RestablecerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-[14px] text-slate-300">
          Cargando...
        </div>
      }
    >
      <RestablecerForm />
    </Suspense>
  );
}