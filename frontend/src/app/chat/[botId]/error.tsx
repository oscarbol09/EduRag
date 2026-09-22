"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Chat terminal error caught:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full glass-panel specular-highlight rounded-2xl border border-rose-500/30 p-8 text-center shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto mb-4 shadow-inner">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[10px] font-mono uppercase tracking-wider mb-2">
          Interrupción del Canal RAG
        </div>
        <h1 className="text-xl font-bold text-white font-display mb-2">Error de Sesión</h1>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          No se pudo establecer la sesión con este tutor pedagógico. Es posible que el recurso haya sido despublicado o exista una interrupción en el motor de inferencia.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/marketplace"
            className="btn-press flex-1 py-2.5 border border-white/10 text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-xl font-semibold text-xs transition-all"
          >
            Explorar tutores
          </Link>
          <button
            onClick={reset}
            className="btn-press flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl font-semibold text-xs shadow-lg shadow-rose-950/50 border border-rose-400/30 transition-all"
          >
            Reconectar
          </button>
        </div>
      </div>
    </div>
  );
}
