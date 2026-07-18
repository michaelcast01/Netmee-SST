export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen w-full min-w-0 overflow-x-hidden bg-[var(--navy)] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-[var(--brand)] font-bold">N</div><div><p className="font-semibold">NETMEE EPP Seguro</p><p className="text-xs text-slate-400">Prevención antes de cada labor</p></div></div>
        <div className="max-w-xl"><p className="text-sm font-semibold text-violet-300">SEGURIDAD OPERACIONAL</p><h1 className="mt-4 text-5xl font-semibold leading-tight tracking-tight">Cada verificación protege una vida.</h1><p className="mt-5 max-w-lg text-lg leading-8 text-slate-300">Inspecciones, inventario y acciones preventivas con trazabilidad para todo el SG-SST.</p></div>
        <p className="text-xs text-slate-500">Acceso exclusivo para personal autorizado.</p>
      </section>
      <section className="grid w-full min-w-0 place-items-center overflow-hidden bg-[var(--surface)] p-4 sm:p-10"><div className="w-full min-w-0 max-w-md rounded-2xl border border-[var(--line)] bg-white p-5 shadow-xl shadow-black/5 sm:p-9">{children}</div></section>
    </main>
  );
}
