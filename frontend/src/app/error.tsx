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
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-12 font-sans text-zinc-100">
      <div className="max-w-md w-full card-clean rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-rose-400 mx-auto mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-zinc-100 mb-2">Error de Ejecución</h1>
        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          Se produjo un error inesperado al procesar la solicitud.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="btn-press flex-1 py-2.5 border border-zinc-800 text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg font-medium text-xs transition-colors"
          >
            Ir al inicio
          </Link>
          <button
            onClick={reset}
            className="btn-press flex-1 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg font-medium text-xs transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}
