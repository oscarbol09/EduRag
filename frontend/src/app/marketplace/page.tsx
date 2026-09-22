"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApp } from "@/lib/context";
import { Navbar } from "@/components/Navbar";
import { EmptyState } from "@/components/EmptyState";
import { Spinner } from "@/components/Spinner";
import type { Chatbot } from "@/lib/types";

export default function MarketplacePage() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<"all" | "secondary" | "university">("all");
  const router = useRouter();
  const { auth, logout } = useApp();

  const loadChatbots = useCallback(async () => {
    try {
      const list = await api.chatbots.list();
      setChatbots(list.filter((cb) => cb.is_published));
    } catch (error) {
      console.error("Error loading chatbots:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChatbots();
  }, [loadChatbots]);

  const filteredChatbots = chatbots.filter((cb) => {
    const matchesSearch =
      cb.name.toLowerCase().includes(search.toLowerCase()) ||
      cb.subject_area.toLowerCase().includes(search.toLowerCase());
    const matchesLevel =
      selectedLevel === "all" || cb.education_level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="min-h-screen bg-[#07080c] flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar
        variant="public"
        actions={
          <div className="flex gap-2 sm:gap-3 items-center">
            {auth.user ? (
              <>
                <span className="text-xs text-slate-300 hidden sm:inline-block">
                  Hola, <strong className="text-white font-semibold">
                    {auth.user.firstName || (auth.user.institution && auth.user.institution.includes(" | ") 
                      ? auth.user.institution.split(" | ")[0] 
                      : auth.user.email)}
                  </strong>
                </span>
                {auth.user.role === "admin" && (
                  <Link href="/admin" className="btn-press px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/10 rounded-lg text-xs font-semibold transition-all">
                    Panel Admin
                  </Link>
                )}
                {auth.user.role === "teacher" && (
                  <Link href="/teacher" className="btn-press px-3 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold transition-all">
                    Panel Docente
                  </Link>
                )}
                <button
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                  className="btn-press px-3 py-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg text-xs font-semibold transition-all"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-3 py-1.5 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors">
                  Iniciar sesión
                </Link>
                <Link href="/register" className="btn-press px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-950/40 border border-indigo-400/30 transition-all">
                  Registrarse
                </Link>
              </>
            )}
          </div>
        }
      />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex-1 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-500/30 text-[11px] font-mono text-indigo-300 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 led-pulse" />
            CATÁLOGO CURRICULAR VERIFICADO
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white font-display tracking-tight">
            Marketplace Educativo
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Explora asistentes pedagógicos creados por docentes con contenidos verificados y rigor conceptual
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="max-w-xl mx-auto mb-10 space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tutor por materia, tema o nombre..."
              className="w-full pl-10 pr-4 py-2.5 glass-panel text-slate-100 placeholder:text-slate-500 rounded-xl border border-white/15 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs sm:text-sm transition-all"
            />
          </div>

          {/* Level Filter Chips */}
          <div className="flex items-center justify-center gap-2 font-mono text-xs">
            <button
              type="button"
              onClick={() => setSelectedLevel("all")}
              className={`btn-press px-3 py-1 rounded-lg border transition-all ${
                selectedLevel === "all"
                  ? "bg-indigo-600 text-white border-indigo-400/50 shadow-sm"
                  : "bg-white/[0.03] text-slate-400 border-white/10 hover:border-white/20"
              }`}
            >
              Todos ({chatbots.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedLevel("university")}
              className={`btn-press px-3 py-1 rounded-lg border transition-all ${
                selectedLevel === "university"
                  ? "bg-indigo-600 text-white border-indigo-400/50 shadow-sm"
                  : "bg-white/[0.03] text-slate-400 border-white/10 hover:border-white/20"
              }`}
            >
              Universidad
            </button>
            <button
              type="button"
              onClick={() => setSelectedLevel("secondary")}
              className={`btn-press px-3 py-1 rounded-lg border transition-all ${
                selectedLevel === "secondary"
                  ? "bg-indigo-600 text-white border-indigo-400/50 shadow-sm"
                  : "bg-white/[0.03] text-slate-400 border-white/10 hover:border-white/20"
              }`}
            >
              Secundaria
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Spinner />
          </div>
        ) : filteredChatbots.length === 0 ? (
          <EmptyState
            title="No se encontraron chatbots"
            description={search ? `No hay resultados para "${search}". Intenta con otros términos o cambia el filtro de nivel.` : "Aún no hay tutores publicados en el marketplace."}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChatbots.map((chatbot) => (
              <div key={chatbot.id} className="bento-card p-6 flex flex-col justify-between h-full group">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div>
                      <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block mb-1">
                        {chatbot.subject_area}
                      </span>
                      <h3 className="font-bold text-white text-base leading-tight font-display group-hover:text-indigo-300 transition-colors">
                        {chatbot.name}
                      </h3>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded-md border flex-shrink-0 ${
                      chatbot.education_level === "secondary" 
                        ? "bg-amber-950/70 text-amber-300 border-amber-500/40" 
                        : "bg-indigo-950/70 text-indigo-300 border-indigo-500/40"
                    }`}>
                      {chatbot.education_level === "secondary" ? "Secundaria" : "Universidad"}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300 mb-6 bg-[#07080c]/70 rounded-xl p-3.5 border border-white/10 font-mono">
                    <p className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Tono:</span>
                      <strong className="text-slate-200 capitalize font-medium">{chatbot.tone}</strong>
                    </p>
                    <p className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Restricción:</span>
                      <strong className="text-slate-200 capitalize font-medium">{chatbot.restriction_level}</strong>
                    </p>
                  </div>
                </div>

                <Link
                  href={`/chat/${chatbot.id}`}
                  className="btn-press block w-full text-center px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl font-semibold text-xs shadow-lg shadow-indigo-950/50 border border-indigo-400/30 transition-all"
                >
                  Consultar Tutor Académico →
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
