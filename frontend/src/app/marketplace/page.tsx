"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApp } from "@/lib/context";
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              EduRAG
            </Link>
            <div className="flex gap-4 items-center">
              {auth.user ? (
                <>
                  <span className="text-sm text-gray-600">
                    Hola, <strong className="text-gray-900">{auth.user.email}</strong>
                  </span>
                  {auth.user.role === "admin" && (
                    <Link href="/admin" className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium">
                      Panel Admin
                    </Link>
                  )}
                  {auth.user.role === "teacher" && (
                    <Link href="/teacher" className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium">
                      Panel Docente
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      router.push("/");
                    }}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                    Iniciar sesión
                  </Link>
                  <Link href="/register" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Regístrate
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Marketplace Educativo</h1>
          <p className="text-xl text-gray-600">Encuentra chatbots creados por docentes</p>
        </div>

        <div className="mb-8">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o área temática..."
            className="w-full max-w-xl mx-auto block px-6 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredChatbots.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-600">No se encontraron chatbots</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChatbots.map((chatbot) => (
              <div key={chatbot.id} className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{chatbot.name}</h3>
                    <span className="text-sm text-blue-600">{chatbot.subject_area}</span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    chatbot.education_level === "secondary" ? "bg-orange-100 text-orange-700" : "bg-purple-100 text-purple-700"
                  }`}>
                    {chatbot.education_level === "secondary" ? "Secundaria" : "Universidad"}
                  </span>
                </div>

                <div className="flex gap-2 text-xs text-gray-500 mb-4">
                  <span className="px-2 py-1 bg-gray-100 rounded">{chatbot.tone}</span>
                  <span className="px-2 py-1 bg-gray-100 rounded">{chatbot.restriction_level}</span>
                </div>

                <Link
                  href={`/chat/${chatbot.id}`}
                  className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
