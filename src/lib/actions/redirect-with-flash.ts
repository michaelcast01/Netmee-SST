import { redirect } from "next/navigation";

export function redirectWithFlash(pathname: string, flash: { error?: string; success?: string }) {
  const params = new URLSearchParams();
  if (flash.error) params.set("error", flash.error);
  if (flash.success) params.set("success", flash.success);
  const query = params.toString();
  redirect(query ? `${pathname}?${query}` : pathname);
}

export function flashFromSearchParams(params: { error?: string; success?: string }) {
  return {
    error: params.error ? decodeURIComponent(params.error) : undefined,
    success: params.success ? decodeURIComponent(params.success) : undefined,
  };
}

export function actionErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Ocurrió un error inesperado. Intenta de nuevo.";
}
