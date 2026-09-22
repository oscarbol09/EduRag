"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function TeacherError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Teacher dashboard error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-12 font-sans text-zinc-100">
      <div className="max-w-md w-full card-clean rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-amber-400 mx-auto mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-zinc-100 mb-2">Error en el Panel Docente</h1>
        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          No se pudieron cargar los datos curriculares o los asistentes pedagógicos. Verifica tu conexión de red o reintenta.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/teacher"
            className="btn-press flex-1 py-2.5 border border-zinc-800 text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg font-medium text-xs transition-colors"
          >
            Recargar panel
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
