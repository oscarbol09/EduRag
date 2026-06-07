"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApp } from "@/lib/context";
import { Navbar } from "@/components/Navbar";
import { Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import type { Chatbot } from "@/lib/types";

export default function TeacherDashboard() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [metrics, setMetrics] = useState<{
    totalChatbots: number;
    publishedChatbots: number;
    totalDocuments: number;
    weeklyConversations: number;
    channelStatus: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { auth, logout } = useApp();

  useEffect(() => {
    if (!auth.isLoading) {
      if (!auth.token) {
        router.push("/login");
      } else if (auth.user) {
        if (auth.user.role !== "teacher") {
          if (auth.user.role === "admin") {
            router.push("/admin");
          } else {
            router.push("/marketplace");
          }
        } else {
          loadChatbots();
        }
      }
    }
  }, [auth.user, auth.token, auth.isLoading]);

  const loadChatbots = async () => {
    try {
      const list = await api.chatbots.list(auth.user?.id || undefined);
      setChatbots(list);
      try {
        const met = await api.teacher.getMetrics();
        setMetrics(met);
      } catch (err) {
        console.error("Error loading metrics:", err);
      }
    } catch (error) {
      console.error("Error loading chatbots:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (auth.isLoading || (auth.token && !auth.user) || !auth.user || auth.user.role !== "teacher") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }

  const handleDeleteChatbot = async (id: string) => {
    if (!confirm("¿Eliminar este chatbot?")) return;
    try {
      await api.chatbots.delete(id);
      setChatbots((prev) => prev.filter((cb) => cb.id !== id));
    } catch (error) {
      console.error("Error deleting chatbot:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 bg-dot-grid flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      <Navbar
        variant="teacher"
        actions={
          <div className="flex items-center gap-3.5">
            <span className="text-sm text-gray-500 hidden sm:inline-block">
              Hola, <strong className="text-gray-900 font-semibold">
                {auth.user?.firstName || auth.user?.email}
              </strong>
            </span>
            <Link
              href="/teacher/chatbots/new"
              className="px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-bold text-sm shadow hover:shadow-md transition-all"
            >
              + Nuevo Chatbot
            </Link>
            <Link
              href="/teacher/settings"
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold text-sm shadow-sm transition-all"
            >
              ⚙️ Configuración
            </Link>
            <button
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl font-bold text-sm transition-all"
            >
              Cerrar sesión
            </button>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-10 flex-1">
        {/* Encabezado */}
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight font-display">Panel del Docente</h1>
          <p className="text-gray-500 text-sm mt-1">Crea y gestiona tus asistentes inteligentes para estudiantes</p>
        </div>

        {/* Fila de Estadísticas */}
        {!isLoading && chatbots.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-4 glow-card select-none">
              <div className="w-12 h-12 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-center text-xl">🤖</div>
              <div>
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Total de Chatbots</span>
                <strong className="text-2xl font-black text-gray-900">{metrics?.totalChatbots ?? chatbots.length}</strong>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-4 glow-card select-none">
              <div className="w-12 h-12 bg-green-50 border border-green-100 rounded-xl flex items-center justify-center text-xl">✅</div>
              <div>
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Bots Publicados</span>
                <strong className="text-2xl font-black text-gray-900">{metrics?.publishedChatbots ?? chatbots.filter(cb => cb.is_published).length}</strong>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-4 glow-card select-none">
              <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-xl">📄</div>
              <div>
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Docs Indexados</span>
                <strong className="text-2xl font-black text-gray-900">{metrics?.totalDocuments ?? 0}</strong>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-4 glow-card select-none">
              <div className="w-12 h-12 bg-accent-50 border border-accent-100 rounded-xl flex items-center justify-center text-xl">💬</div>
              <div>
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Conversaciones (Semana)</span>
                <strong className="text-2xl font-black text-gray-900">{metrics?.weeklyConversations ?? 0}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Listado o vacíos */}
        {isLoading ? (
          <div className="py-20 flex justify-center"><Spinner /></div>
        ) : chatbots.length === 0 ? (
          <EmptyState
            icon="🤖"
            title="No tienes chatbots creados"
            description="Comienza creando tu primer tutor inteligente y sube tus apuntes de clase."
            action={{ label: "Crear Chatbot Educativo", href: "/teacher/chatbots/new" }}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chatbots.map((chatbot) => (
              <div key={chatbot.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm glow-card flex flex-col justify-between h-full relative overflow-hidden">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-extrabold text-gray-900 text-lg leading-tight font-display">{chatbot.name}</h3>
                      <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase block mt-0.5">{chatbot.subject_area}</span>
                    </div>
                    <StatusBadge status={chatbot.is_published ? "published" : "draft"} />
                  </div>

                  <div className="space-y-2.5 text-xs text-gray-500 mb-6 bg-gray-50/50 rounded-xl p-3.5 border border-gray-100">
                    <p className="flex justify-between">
                      <span className="font-medium text-gray-400">Nivel Educativo:</span>
                      <strong className="text-gray-700 capitalize">{chatbot.education_level === "secondary" ? "Secundaria" : "Universidad"}</strong>
                    </p>
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

                <div className="flex gap-2 pt-2">
                  <Link
                    href={`/teacher/chatbots/${chatbot.id}`}
                    className="flex-1 text-center px-3 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold text-xs shadow-sm transition-all"
                  >
                    Editar
                  </Link>
                  <Link
                    href={`/chat/${chatbot.id}`}
                    className="flex-1 text-center px-3 py-2 bg-brand-50 text-brand-700 border border-brand-100/50 rounded-xl hover:bg-brand-100 font-bold text-xs shadow-sm transition-all"
                  >
                    Probar Tutor
                  </Link>
                  <button
                    onClick={() => handleDeleteChatbot(chatbot.id)}
                    className="px-3 py-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl font-bold text-xs transition-all"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}