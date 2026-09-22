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
    <div className="min-h-screen flex items-center justify-center bg-[#07080c] px-4 py-12 relative overflow-hidden font-sans">
      <div className="absolute inset-0 blueprint-grid opacity-50 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full glass-panel specular-highlight rounded-2xl border border-amber-500/30 p-8 text-center relative z-10 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto mb-4 shadow-inner">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[10px] font-mono uppercase tracking-wider mb-2">
          Fallo de Sincronización
        </div>
        <h1 className="text-xl font-bold text-white font-display mb-2">Error en el Panel Docente</h1>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          No se pudieron cargar los datos curriculares o los asistentes pedagógicos. Verifica tu conexión de red o reintenta la sincronización.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/teacher"
            className="btn-press flex-1 py-2.5 border border-white/10 text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-xl font-semibold text-xs transition-all"
          >
            Recargar panel
          </Link>
          <button
            onClick={reset}
            className="btn-press flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl font-semibold text-xs shadow-lg shadow-amber-950/50 border border-amber-400/30 transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}
