import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Marketplace Moa</h1>
      <p className="mt-2 text-neutral-600">
        Smoke test de la conexión frontend ↔ backend (Render).
      </p>
      <Link
        href="/ping"
        className="mt-6 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
      >
        Ir a /ping
      </Link>
    </main>
  );
}