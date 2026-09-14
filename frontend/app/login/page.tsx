import type { Metadata } from "next";
import Script from "next/script";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión | Marketplace Moa",
};

export default function LoginPage() {
  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />
      <LoginForm />
    </>
  );
}