import Link from "next/link";

export default function AccessDeniedPage() {
  return <main className="grid min-h-screen place-items-center bg-[var(--surface)] p-6"><div className="max-w-md text-center"><p className="font-mono text-sm text-red-600">403</p><h1 className="mt-2 text-3xl font-semibold">Acceso no autorizado</h1><p className="mt-3 text-sm text-[var(--muted)]">Tu cuenta no tiene el permiso necesario para realizar esta operación.</p><Link className="mt-6 inline-block font-semibold text-[var(--brand)]" href="/dashboard">Volver al panel</Link></div></main>;
}
