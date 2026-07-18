const DIRECT_SUPABASE_HOST = /^db\.([a-z0-9]+)\.supabase\.co$/i;

type PoolMode = "session" | "transaction";

/** Convert a Supabase direct URL into its IPv4 Supavisor equivalent. */
export function resolveDatabaseUrl(
  rawUrl: string,
  mode: PoolMode,
  region = process.env.SUPABASE_REGION,
): string {
  const url = new URL(rawUrl);
  const match = DIRECT_SUPABASE_HOST.exec(url.hostname);

  if (!match || !region) return rawUrl;

  const projectRef = match[1];
  url.hostname = `aws-0-${region}.pooler.supabase.com`;
  url.port = mode === "transaction" ? "6543" : "5432";
  url.username = `${decodeURIComponent(url.username)}.${projectRef}`;
  url.searchParams.set("sslmode", "require");
  url.searchParams.set("uselibpqcompat", "true");

  if (mode === "transaction") url.searchParams.set("pgbouncer", "true");
  else url.searchParams.delete("pgbouncer");

  return url.toString();
}
