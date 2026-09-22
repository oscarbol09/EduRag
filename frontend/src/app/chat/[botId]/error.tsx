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
    console.error("Chat error caught:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 font-sans text-zinc-100">
      <div className="max-w-md w-full card-clean rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-rose-400 mx-auto mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-zinc-100 mb-2">Error de Sesión</h1>
        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          No se pudo establecer la sesión con este tutor pedagógico. Es posible que el recurso haya sido despublicado o exista una interrupción temporal.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/marketplace"
            className="btn-press flex-1 py-2.5 border border-zinc-800 text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg font-medium text-xs transition-colors"
          >
            Explorar tutores
          </Link>
          <button
            onClick={reset}
            className="btn-press flex-1 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg font-medium text-xs transition-colors"
          >
            Reconectar
          </button>
        </div>
      </div>
    </div>
  );
}
