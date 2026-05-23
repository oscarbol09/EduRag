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
    } catch (error) {
      console.error("Error loading chatbots:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (auth.isLoading || (auth.token && !auth.user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }

  if (!auth.user || auth.user.role !== "teacher") {
    return null;
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
    <div className="min-h-screen bg-gray-50">
      <Navbar
        actions={
          <>
            <span className="text-sm text-gray-600 mr-2">
              Hola, <strong className="text-gray-900">
                {auth.user?.institution && auth.user.institution.includes(" | ")
                  ? auth.user.institution.split(" | ")[0]
                  : auth.user?.email}
              </strong>
            </span>
            {auth.user?.role === "admin" && (
              <Link href="/admin" className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Admin
              </Link>
            )}
            <Link href="/teacher/chatbots/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              + Nuevo Chatbot
            </Link>
            <button onClick={() => { logout(); router.push("/"); }} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">
              Cerrar sesión
            </button>
          </>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Panel del Docente</h1>
          <p className="text-gray-600">Gestiona tus chatbots educativos</p>
        </div>

        {isLoading ? (
          <Spinner />
        ) : chatbots.length === 0 ? (
          <EmptyState
            icon="🤖"
            title="No tienes chatbots"
            description="Crea tu primer chatbot educativo"
            action={{ label: "Crear chatbot", href: "/teacher/chatbots/new" }}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chatbots.map((chatbot) => (
              <div key={chatbot.id} className="bg-white rounded-xl shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{chatbot.name}</h3>
                    <span className="text-sm text-gray-500">{chatbot.subject_area}</span>
                  </div>
                  <StatusBadge status={chatbot.is_published ? "published" : "draft"} />
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p>Nivel: {chatbot.education_level === "secondary" ? "Secundaria" : "Universidad"}</p>
                  <p>Tono: {chatbot.tone}</p>
                  <p>Restricción: {chatbot.restriction_level}</p>
                </div>

                <div className="flex gap-2">
                  <Link href={`/teacher/chatbots/${chatbot.id}`} className="flex-1 text-center px-3 py-2 bg-gray-100 rounded hover:bg-gray-200">
                    Editar
                  </Link>
                  <Link href={`/chat/${chatbot.id}`} className="flex-1 text-center px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                    Probar
                  </Link>
                  <button onClick={() => handleDeleteChatbot(chatbot.id)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded">
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