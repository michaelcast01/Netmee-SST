"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--surface)] p-6">
      <div className="max-w-md rounded-2xl border border-[var(--line)] bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-red-600">No fue posible cargar esta vista</p>
        <h1 className="mt-2 text-2xl font-semibold">Ocurrió un error inesperado.</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">Intenta nuevamente. Si el problema continúa, contacta al administrador.</p>
        <button className="mt-6 rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white" onClick={reset}>Reintentar</button>
      </div>
    </main>
  );
}
