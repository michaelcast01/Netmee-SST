import Link from "next/link";

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center bg-[var(--surface)] p-6"><div className="text-center"><p className="font-mono text-sm text-[var(--brand)]">404</p><h1 className="mt-2 text-3xl font-semibold">Página no encontrada</h1><Link className="mt-6 inline-block text-sm font-semibold text-[var(--brand)]" href="/">Volver al panel</Link></div></main>;
}
