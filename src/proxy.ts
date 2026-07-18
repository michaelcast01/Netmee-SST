import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

const protectedPrefixes = ["/dashboard", "/inspecciones", "/inventario", "/novedades", "/reportes", "/administracion"];

export function proxy(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const sessionCookie = getSessionCookie(request);

  if (request.nextUrl.pathname === "/") {
    const destination = new URL(sessionCookie ? "/dashboard" : "/login", request.url);
    const redirect = NextResponse.redirect(destination);
    redirect.headers.set("x-request-id", requestId);
    return redirect;
  }

  if (protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix)) && !sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    const redirect = NextResponse.redirect(loginUrl);
    redirect.headers.set("x-request-id", requestId);
    return redirect;
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
