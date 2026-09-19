"use client";

import { useEffect } from "react";

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Chat error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 mx-auto mb-4">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Error al cargar el chatbot</h1>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          No se pudo iniciar la sesión con este asistente. Es posible que el recurso haya sido modificado o exista una interrupción temporal de red.
        </p>
        <button
          onClick={reset}
          className="btn-press px-5 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-semibold text-sm transition-colors shadow-sm"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
