import type { NextConfig } from "next";

// Cabeceras de seguridad globales aplicadas a todas las rutas excepto assets estáticos
// NOTA: Content-Security-Policy se maneja en middleware.ts con nonces dinámicos por request
const globalSecurityHeaders = [
  // Previene MIME-sniffing (CWE-693)
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Protección anti-Clickjacking — CSP frame-ancestors en middleware maneja esto también
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
  // Previene apertura de ventanas no deseadas desde enlaces externos
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

// Cabeceras para páginas autenticadas (login, register, admin, teacher)
// Cache-Control estricto manejado también en middleware.ts como defensa adicional
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
// CSP con frame-ancestors * se maneja en middleware.ts
const embedChatHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
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
