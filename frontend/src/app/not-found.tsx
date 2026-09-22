import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#07080c] flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-16 relative overflow-hidden">
        <div className="absolute inset-0 blueprint-grid opacity-50 pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full glass-panel specular-highlight rounded-2xl border border-white/10 p-8 text-center relative z-10 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto mb-4 shadow-inner">
            <span className="text-2xl font-mono font-bold">404</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-slate-300 text-[10px] font-mono uppercase tracking-wider mb-2">
            Ruta No Encontrada
          </div>
          <h1 className="text-xl font-bold text-white font-display mb-2">
            Página Fuera de Índice
          </h1>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            El recurso o endpoint que estás intentando acceder no existe o fue reubicado en la arquitectura didáctica de EduRAG.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="btn-press flex-1 py-2.5 border border-white/10 text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-xl font-semibold text-xs transition-all"
            >
              Ir a la portada
            </Link>
            <Link
              href="/marketplace"
              className="btn-press flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl font-semibold text-xs shadow-lg shadow-indigo-950/50 border border-indigo-400/30 transition-all text-center"
            >
              Ver Marketplace
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
