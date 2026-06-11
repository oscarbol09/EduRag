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
        <div className="text-6xl mb-4">💬</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Error en el chat</h1>
        <p className="text-gray-600 mb-6">
          No se pudo cargar este chatbot. Es posible que no exista o que haya ocurrido un error.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold transition-all"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
