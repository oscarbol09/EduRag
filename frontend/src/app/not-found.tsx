import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-100">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full card-clean rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-8 text-center">
          <div className="w-14 h-14 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300 mx-auto mb-4">
            <span className="text-xl font-bold font-mono">404</span>
          </div>
          <h1 className="text-xl font-bold text-zinc-100 mb-2">
            Página No Encontrada
          </h1>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
            El recurso que estás intentando acceder no existe o fue reubicado en la plataforma EduRAG.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="btn-press flex-1 py-2.5 border border-zinc-800 text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg font-medium text-xs transition-colors"
            >
              Ir a la portada
            </Link>
            <Link
              href="/marketplace"
              className="btn-press flex-1 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg font-medium text-xs transition-colors text-center"
            >
              Ver Marketplace
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
