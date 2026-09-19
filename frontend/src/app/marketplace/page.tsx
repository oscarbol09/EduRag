"use client";

import { useEffect, useState } from "react";
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
  const router = useRouter();
  const { auth, logout } = useApp();

  useEffect(() => {
    loadChatbots();
  }, []);

  const loadChatbots = async () => {
    try {
      const list = await api.chatbots.list();
      setChatbots(list.filter((cb) => cb.is_published));
    } catch (error) {
      console.error("Error loading chatbots:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredChatbots = chatbots.filter(
    (cb) =>
      cb.name.toLowerCase().includes(search.toLowerCase()) ||
      cb.subject_area.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-brand-600 selection:text-white">
      <Navbar
        variant="public"
        actions={
          <div className="flex gap-2 sm:gap-3 items-center">
            {auth.user ? (
              <>
                <span className="text-xs text-zinc-600 hidden sm:inline-block">
                  Hola, <strong className="text-zinc-900 font-semibold">
                    {auth.user.firstName || (auth.user.institution && auth.user.institution.includes(" | ") 
                      ? auth.user.institution.split(" | ")[0] 
                      : auth.user.email)}
                  </strong>
                </span>
                {auth.user.role === "admin" && (
                  <Link href="/admin" className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 rounded-lg text-xs font-semibold btn-press transition-colors">
                    Panel Admin
                  </Link>
                )}
                {auth.user.role === "teacher" && (
                  <Link href="/teacher" className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-lg text-xs font-semibold btn-press transition-colors">
                    Panel Docente
                  </Link>
                )}
                <button
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                  className="px-3 py-1.5 text-zinc-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold btn-press transition-colors"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-3 py-1.5 text-zinc-700 hover:bg-zinc-100 rounded-lg text-xs font-semibold transition-colors">
                  Iniciar sesión
                </Link>
                <Link href="/register" className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold btn-press transition-colors shadow-sm">
                  Registrarse
                </Link>
              </>
            )}
          </div>
        }
      />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex-1">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 font-display tracking-tight">Marketplace Educativo</h1>
          <p className="text-xs sm:text-sm text-zinc-600">Explora asistentes pedagógicos creados por docentes con contenidos verificados</p>
        </div>

        <div className="max-w-md mx-auto mb-8 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o materia..."
            className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg shadow-sm focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-xs sm:text-sm transition-all text-zinc-900 bg-white"
          />
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Spinner />
          </div>
        ) : filteredChatbots.length === 0 ? (
          <EmptyState
            title="No se encontraron chatbots"
            description={search ? `No hay resultados para "${search}". Intenta con otros términos.` : "Aún no hay tutores publicados en el marketplace."}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChatbots.map((chatbot) => (
              <div key={chatbot.id} className="bg-white rounded-xl border border-zinc-200 p-6 craft-card flex flex-col justify-between h-full relative shadow-sm">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div>
                      <h3 className="font-bold text-zinc-950 text-base leading-tight font-display">{chatbot.name}</h3>
                      <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider block mt-1">{chatbot.subject_area}</span>
                    </div>
                    <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border flex-shrink-0 ${
                      chatbot.education_level === "secondary" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-indigo-50 text-indigo-800 border-indigo-200"
                    }`}>
                      {chatbot.education_level === "secondary" ? "Secundaria" : "Universidad"}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-zinc-600 mb-6 bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                    <p className="flex justify-between">
                      <span className="text-zinc-500">Tono:</span>
                      <strong className="text-zinc-800 capitalize font-medium">{chatbot.tone}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-zinc-500">Restricción:</span>
                      <strong className="text-zinc-800 capitalize font-medium">{chatbot.restriction_level}</strong>
                    </p>
                  </div>
                </div>

                <Link
                  href={`/chat/${chatbot.id}`}
                  className="block w-full text-center px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold text-xs shadow-sm btn-press transition-colors"
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

