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
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      <Navbar
        variant="public"
        actions={
          <div className="flex gap-2 sm:gap-3 items-center">
            {auth.user ? (
              <>
                <span className="text-xs text-zinc-400 hidden sm:inline-block">
                  Hola, <strong className="text-zinc-200 font-medium">
                    {auth.user.firstName || (auth.user.institution && auth.user.institution.includes(" | ") 
                      ? auth.user.institution.split(" | ")[0] 
                      : auth.user.email)}
                  </strong>
                </span>
                {auth.user.role === "admin" && (
                  <Link href="/admin" className="btn-press px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-lg text-xs font-medium transition-colors">
                    Panel Admin
                  </Link>
                )}
                {auth.user.role === "teacher" && (
                  <Link href="/teacher" className="btn-press px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg text-xs font-medium transition-colors">
                    Panel Docente
                  </Link>
                )}
                <button
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                  className="btn-press px-3 py-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs font-medium transition-colors"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-3 py-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs font-medium transition-colors">
                  Iniciar sesión
                </Link>
                <Link href="/register" className="btn-press px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg text-xs font-semibold shadow-sm transition-colors">
                  Registrarse
                </Link>
              </>
            )}
          </div>
        }
      />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex-1 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 tracking-tight">
            Marketplace Educativo
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Explora asistentes pedagógicos creados por docentes con contenidos y fuentes curriculares verificadas
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="max-w-xl mx-auto mb-10 space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por materia, tema o nombre..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 rounded-xl focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700 outline-none text-xs sm:text-sm transition-all"
            />
          </div>

          {/* Level Filter Chips */}
          <div className="flex items-center justify-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setSelectedLevel("all")}
              className={`btn-press px-3 py-1 rounded-lg border transition-all ${
                selectedLevel === "all"
                  ? "bg-zinc-100 text-zinc-900 border-zinc-100 font-medium shadow-sm"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              Todos ({chatbots.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedLevel("university")}
              className={`btn-press px-3 py-1 rounded-lg border transition-all ${
                selectedLevel === "university"
                  ? "bg-zinc-100 text-zinc-900 border-zinc-100 font-medium shadow-sm"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              Universidad
            </button>
            <button
              type="button"
              onClick={() => setSelectedLevel("secondary")}
              className={`btn-press px-3 py-1 rounded-lg border transition-all ${
                selectedLevel === "secondary"
                  ? "bg-zinc-100 text-zinc-900 border-zinc-100 font-medium shadow-sm"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
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
            title="No se encontraron tutores"
            description={search ? `No hay resultados para "${search}". Intenta con otros términos o cambia el filtro de nivel.` : "Aún no hay tutores publicados en el marketplace."}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChatbots.map((chatbot) => (
              <div key={chatbot.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between h-full hover:border-zinc-700 transition-all group">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div>
                      <span className="text-xs text-zinc-400 block mb-1">
                        {chatbot.subject_area}
                      </span>
                      <h3 className="font-semibold text-zinc-100 text-base leading-tight">
                        {chatbot.name}
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 text-[11px] rounded-full border border-zinc-800 bg-zinc-900 text-zinc-300 flex-shrink-0">
                      {chatbot.education_level === "secondary" ? "Secundaria" : "Universidad"}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-zinc-400 mb-6 bg-zinc-950/70 rounded-xl p-3.5 border border-zinc-800/80">
                    <p className="flex justify-between items-center text-[11px]">
                      <span>Tono didáctico:</span>
                      <strong className="text-zinc-300 capitalize font-medium">{chatbot.tone}</strong>
                    </p>
                    <p className="flex justify-between items-center text-[11px]">
                      <span>Restricción:</span>
                      <strong className="text-zinc-300 capitalize font-medium">{chatbot.restriction_level}</strong>
                    </p>
                  </div>
                </div>

                <Link
                  href={`/chat/${chatbot.id}`}
                  className="btn-press block w-full text-center px-4 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl font-medium text-xs shadow-sm transition-colors"
                >
                  Consultar Tutor
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
