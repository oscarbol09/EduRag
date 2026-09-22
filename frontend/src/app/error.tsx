"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07080c] px-4 py-12 relative overflow-hidden font-sans">
      <div className="absolute inset-0 blueprint-grid opacity-50 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full glass-panel specular-highlight rounded-2xl border border-rose-500/30 p-8 text-center relative z-10 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto mb-4 shadow-inner">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[10px] font-mono uppercase tracking-wider mb-2">
          Interrupción del Sistema
        </div>
        <h1 className="text-xl font-bold text-white font-display mb-2">Error de Ejecución</h1>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Se produjo una excepción inesperada en el cliente web. La traza ha sido aislada para proteger la integridad de los datos.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="btn-press flex-1 py-2.5 border border-white/10 text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-xl font-semibold text-xs transition-all"
          >
            Ir al inicio
          </Link>
          <button
            onClick={reset}
            className="btn-press flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl font-semibold text-xs shadow-lg shadow-rose-950/50 border border-rose-400/30 transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}
