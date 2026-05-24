import type { NextConfig } from "next";

// URL del backend en producción — usada en la directiva connect-src de CSP
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://edurag-production.up.railway.app";

// Cabeceras de seguridad globales aplicadas a todas las rutas excepto assets estáticos
const globalSecurityHeaders = [
  // Previene MIME-sniffing (CWE-693)
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Protección anti-Clickjacking para rutas normales de la app (CWE-1021)
  // La ruta /chat/[botId] sobreescribe esto para permitir el embed en Moodle/LMS
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  // Política de referrer segura
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Fuerza HTTPS en futuros accesos (HSTS)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Content Security Policy (CWE-693)
  // - default-src 'self': por defecto solo origen propio
  // - script-src: Next.js requiere 'unsafe-inline' para hydration y 'unsafe-eval' en dev
  // - style-src: Tailwind CSS + estilos en línea
  // - connect-src: permite llamadas al backend Railway + APIs de fuentes de Google
  // - font-src: Google Fonts + data URIs locales
  // - img-src: imágenes propias, blob y data URIs
  // - frame-ancestors 'self': complementa X-Frame-Options a nivel CSP
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      `connect-src 'self' ${API_URL} https://fonts.googleapis.com https://fonts.gstatic.com`,
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' blob: data:",
      "frame-src 'none'",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  // Previene apertura de ventanas no deseadas desde enlaces externos
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

// Cabeceras para páginas autenticadas (login, register, admin, teacher)
// Se añade Cache-Control estricto para evitar que contenido sensible quede en caché (CWE-525)
const authPageHeaders = [
  ...globalSecurityHeaders,
  {
    key: "Cache-Control",
    value: "no-store, no-cache, must-revalidate, private",
  },
  {
    key: "Pragma",
    value: "no-cache",
  },
  {
    key: "Expires",
    value: "0",
  },
];

// Cabeceras especiales para la ruta de chat embebido (/chat/[botId])
// Esta ruta es intencionalmente embebible en iframes de Moodle u otros LMS
const embedChatHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Permite que cualquier origen cargue el chat en un iframe (necesario para LMS externos)
  // Se omite X-Frame-Options para que frame-ancestors de CSP tome precedencia
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      `connect-src 'self' ${API_URL} https://fonts.googleapis.com https://fonts.gstatic.com`,
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' blob: data:",
      // Permite que cualquier origen incruste esta página en un iframe
      "frame-ancestors *",
      "object-src 'none'",
      "base-uri 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // "standalone" es para Docker/Railway — en Vercel no se usa
  images: {
    unoptimized: true,
  },

  async headers() {
    return [
      // ─── Páginas autenticadas / sensibles (Cache-Control estricto) ───────────
      {
        source: "/login",
        headers: authPageHeaders,
      },
      {
        source: "/register",
        headers: authPageHeaders,
      },
      {
        source: "/admin/:path*",
        headers: authPageHeaders,
      },
      {
        source: "/teacher/:path*",
        headers: authPageHeaders,
      },

      // ─── Ruta de chat embebido — permite iframe en LMS externos ───────────────
      {
        source: "/chat/:botId*",
        headers: embedChatHeaders,
      },

      // ─── Resto de rutas del frontend (marketplace, home, etc.) ───────────────
      {
        source: "/((?!_next/static|_next/image|favicon\\.ico|chat).*)",
        headers: globalSecurityHeaders,
      },
    ];
  },
};

export default nextConfig;
