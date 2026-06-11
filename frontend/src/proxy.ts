import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://edurag-production.up.railway.app";

export function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const isDev = process.env.NODE_ENV === "development";
  const { pathname } = request.nextUrl;

  const isEmbedRoute = pathname === "/chat" || pathname.startsWith("/chat/");
  const isAuthRoute = ["/login", "/register", "/admin", "/teacher"].some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // CSP con nonce para Next.js, unsafe-inline necesario para Google Sign-In
  // (identidad visual) que inyecta scripts inline dinámicamente.
  // strict-dynamic deshabilitado porque rompe Google Sign-In al bloquear
  // la carga de scripts desde accounts.google.com y sus inline injection.
  // unsafe-eval solo en dev (Fast Refresh de React).
  // frame-ancestors * solo en /chat/[botId] (embebible en Moodle).
  const cspParts = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://accounts.google.com https://www.googletagmanager.com${
      isDev ? " 'unsafe-eval'" : ""
    }`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `connect-src 'self' ${API_URL} https://fonts.googleapis.com https://fonts.gstatic.com`,
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' blob: data:",
    isEmbedRoute ? "frame-ancestors *" : "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];

  const csp = cspParts.join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", csp);

  // Auth pages: Cache-Control estricto para evitar caché de contenido sensible
  if (isAuthRoute) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
