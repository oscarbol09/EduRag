"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Verificar si ya se otorgó o denegó consentimiento previamente
    const consent = localStorage.getItem("edurag_cookie_consent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem("edurag_cookie_consent", "all");
    setShowBanner(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cookie_consent_updated", { detail: { consent: "all" } }));
    }
  };

  const handleAcceptEssentialOnly = () => {
    localStorage.setItem("edurag_cookie_consent", "essential_only");
    setShowBanner(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cookie_consent_updated", { detail: { consent: "essential_only" } }));
    }
  };

  if (!showBanner) return null;

  return (
    <aside
      aria-label="Aviso de cookies y privacidad"
      role="region"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-200"
    >
      <div className="card-clean rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-md p-5 shadow-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs flex-shrink-0" aria-hidden="true">
            🍪
          </div>
          <div className="space-y-1">
            <h2 className="text-xs font-semibold text-zinc-100">
              Control de Cookies y Almacenamiento Local
            </h2>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Utilizamos almacenamiento local técnico necesario para la sesión y autenticación segura. Puedes consultar los detalles en nuestra{" "}
              <Link href="/privacy" className="text-zinc-200 underline hover:text-white transition-colors">
                Política de Privacidad
              </Link>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleAcceptEssentialOnly}
            className="btn-press flex-1 py-2 px-3 rounded-lg border border-zinc-800 text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 font-medium text-xs transition-colors"
          >
            Solo esenciales
          </button>
          <button
            onClick={handleAcceptAll}
            className="btn-press flex-1 py-2 px-3 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition-colors shadow-sm"
          >
            Aceptar todas
          </button>
        </div>
      </div>
    </aside>
  );
}
