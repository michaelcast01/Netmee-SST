const CANONICAL_PRODUCTION_ORIGIN = "https://netmee-sst.vercel.app";

function normalizeOrigin(value: string | undefined) {
  if (!value?.trim()) return null;

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

function isLocalOrigin(origin: string | null) {
  if (!origin) return false;
  const host = new URL(origin).hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

type AuthEnvironment = Partial<Record<"BETTER_AUTH_URL" | "BETTER_AUTH_TRUSTED_ORIGINS" | "VERCEL" | "VERCEL_PROJECT_PRODUCTION_URL" | "VERCEL_URL", string>>;

export function resolveAuthOrigins(env: AuthEnvironment = process.env as AuthEnvironment) {
  const explicit = normalizeOrigin(env.BETTER_AUTH_URL);
  const production = normalizeOrigin(env.VERCEL_PROJECT_PRODUCTION_URL);
  const deployment = normalizeOrigin(env.VERCEL_URL);
  const configured = (env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((value) => normalizeOrigin(value))
    .filter((value): value is string => Boolean(value));
  const isVercel = env.VERCEL === "1" || Boolean(production || deployment);

  const baseURL = isVercel
    ? (!isLocalOrigin(explicit) ? explicit : null) ??
      production ??
      CANONICAL_PRODUCTION_ORIGIN
    : explicit ?? "http://localhost:3000";

  const trustedOrigins = new Set([
    baseURL,
    ...configured,
    ...(isVercel
      ? [production, deployment, CANONICAL_PRODUCTION_ORIGIN].filter(
          (value): value is string => Boolean(value && !isLocalOrigin(value)),
        )
      : []),
  ]);

  return { baseURL, trustedOrigins: [...trustedOrigins] };
}
