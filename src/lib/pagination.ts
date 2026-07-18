export const DEFAULT_PAGE_SIZE = 20;

export function parsePage(value: string | undefined) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function cleanSearch(value: string | undefined, max = 100) {
  return value?.trim().slice(0, max) ?? "";
}
