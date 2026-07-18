import Link from "next/link";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  pathname: string;
  params: Record<string, string | undefined>;
};

function hrefFor(pathname: string, params: PaginationProps["params"], page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  query.set("page", String(page));
  return `${pathname}?${query.toString()}`;
}

export function Pagination({ page, pageSize, total, pathname, params }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Paginación" className="flex items-center justify-between border-t border-[var(--line)] px-5 py-4 text-sm">
      <p className="text-[var(--muted)]">Página {page} de {pages} · {total} registros</p>
      <div className="flex gap-2">
        {page > 1 ? <Link className="rounded-lg border border-[var(--line)] px-3 py-2 font-semibold" href={hrefFor(pathname, params, page - 1)}>Anterior</Link> : null}
        {page < pages ? <Link className="rounded-lg border border-[var(--line)] px-3 py-2 font-semibold" href={hrefFor(pathname, params, page + 1)}>Siguiente</Link> : null}
      </div>
    </nav>
  );
}
