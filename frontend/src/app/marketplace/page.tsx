"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApp } from "@/lib/context";
import { Navbar } from "@/components/Navbar";
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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      <Navbar
        variant="public"
        actions={
          <div className="flex gap-4 items-center">
            {auth.user ? (
              <>
                <span className="text-sm text-gray-600 hidden sm:inline-block">
                  Hola, <strong className="text-gray-900 font-semibold">
                    {auth.user.firstName || (auth.user.institution && auth.user.institution.includes(" | ") 
                      ? auth.user.institution.split(" | ")[0] 
                      : auth.user.email)}
                  </strong>
                </span>
                {auth.user.role === "admin" && (
                  <Link href="/admin" className="px-4 py-2 bg-brand-50 text-brand-700 border border-brand-100/50 rounded-xl font-bold text-sm shadow-sm transition-all hover:bg-brand-100">
                    Panel Admin
                  </Link>
                )}
                {auth.user.role === "teacher" && (
                  <Link href="/teacher" className="px-4 py-2 bg-brand-50 text-brand-700 border border-brand-100/50 rounded-xl font-bold text-sm shadow-sm transition-all hover:bg-brand-100">
                    Panel Docente
                  </Link>
                )}
                <button
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl font-bold text-sm transition-all"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-xl font-bold text-sm transition-all">
                  Iniciar sesión
                </Link>
                <Link href="/register" className="px-4 py-2 bg-brand-600 text-white hover:bg-brand-700 rounded-xl font-bold text-sm shadow transition-all">
                  Regístrate
                </Link>
              </>
            )}
          </div>
        }
      />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 font-display">Marketplace Educativo</h1>
          <p className="text-lg text-gray-600">Encuentra chatbots creados por docentes para potenciar tu autoaprendizaje</p>
        </div>

        <div className="mb-8">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o área temática..."
            className="w-full max-w-xl mx-auto block px-6 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
          </div>
        ) : filteredChatbots.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-600 font-semibold">No se encontraron chatbots</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChatbots.map((chatbot) => (
              <div key={chatbot.id} className="bg-white rounded-2xl border border-gray-100 p-6 glow-card flex flex-col justify-between h-full relative overflow-hidden shadow-sm">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-extrabold text-gray-900 text-lg leading-tight font-display">{chatbot.name}</h3>
                      <span className="text-xs font-semibold text-brand-600 tracking-wider uppercase block mt-0.5">{chatbot.subject_area}</span>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      chatbot.education_level === "secondary" ? "bg-orange-100 text-orange-700 border border-orange-200" : "bg-purple-100 text-purple-700 border border-purple-200"
                    }`}>
                      {chatbot.education_level === "secondary" ? "Secundaria" : "Universidad"}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs text-gray-500 mb-6 bg-gray-50/50 rounded-xl p-3.5 border border-gray-100">
                    <p className="flex justify-between">
                      <span className="font-medium text-gray-400">Tono del Asistente:</span>
                      <strong className="text-gray-700 capitalize">{chatbot.tone}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="font-medium text-gray-400">Nivel Restricción:</span>
                      <strong className="text-gray-700 capitalize">{chatbot.restriction_level}</strong>
                    </p>
                  </div>
                </div>

                <Link
                  href={`/chat/${chatbot.id}`}
                  className="block w-full text-center px-4 py-2.5 bg-brand-600 text-white hover:bg-brand-700 rounded-xl font-bold text-xs shadow-sm transition-all"
                >
                  Probar chatbot
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
