function normalizePath(value: string, label: string) {
  const normalized = value.trim().replace(/^\/+|\/+$/g, "");
  if (!normalized) throw new Error(`${label} no puede estar vacío.`);
  const parts = normalized.split("/");
  if (parts.some((part) => !part || part === "." || part === ".." || part.includes("\\") || /[\u0000-\u001f\u007f]/.test(part))) {
    throw new Error(`${label} no es válido.`);
  }
  return normalized;
}

export function objectStorageKey(key: string, prefix = process.env.OBJECT_STORAGE_PREFIX ?? "") {
  const normalizedKey = normalizePath(key, "La clave del objeto");
  const trimmedPrefix = prefix.trim();
  if (!trimmedPrefix) return normalizedKey;
  const normalizedPrefix = normalizePath(trimmedPrefix, "El prefijo del almacenamiento");
  if (normalizedKey === normalizedPrefix || normalizedKey.startsWith(`${normalizedPrefix}/`)) return normalizedKey;
  return `${normalizedPrefix}/${normalizedKey}`;
}
