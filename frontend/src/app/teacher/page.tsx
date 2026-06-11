"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApp } from "@/lib/context";
import { useRequireRole } from "@/hooks/useRequireRole";
import { Navbar } from "@/components/Navbar";
import { Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ToastContainer, useToast } from "@/components/Toast";
import type { Chatbot } from "@/lib/types";
import { useEffect } from "react";

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
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const router = useRouter();
  const { auth, logout } = useApp();
  const { isChecking, isAuthorized } = useRequireRole("teacher");
  const { toasts, toast, removeToast } = useToast();

  useEffect(() => {
    if (isAuthorized) loadChatbots();
  }, [isAuthorized]);

  const loadChatbots = async () => {
    try {
      const list = await api.chatbots.list(auth.user?.id ?? undefined);
      setChatbots(list);
      try {
        const met = await api.teacher.getMetrics();
        setMetrics(met);
      } catch {
        // Métricas opcionales — no bloquear si fallan
      }
    } catch {
      toast.error("No se pudo cargar la lista de chatbots");
    } finally {
      setIsLoading(false);
    }
  };

  // Spinner mientras verifica auth
  if (isChecking || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.chatbots.delete(deleteTarget);
      setChatbots((prev) => prev.filter((cb) => cb.id !== deleteTarget));
      toast.success("Chatbot eliminado correctamente");
    } catch {
      toast.error("No se pudo eliminar el chatbot");
    } finally {
      setDeleteTarget(null);
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
                {auth.user?.firstName ?? auth.user?.email}
              </strong>
            </span>
            <Link href="/teacher/chatbots/new" className="px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-bold text-sm shadow hover:shadow-md transition-all">
              + Nuevo Chatbot
            </Link>
            <Link href="/teacher/settings" className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold text-sm shadow-sm transition-all">
              ⚙️ Configuración
            </Link>
            <button
              onClick={() => { logout(); router.push("/"); }}
              className="px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl font-bold text-sm transition-all"
            >
              Cerrar sesión
            </button>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-10 flex-1">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight font-display">Panel del Docente</h1>
          <p className="text-gray-500 text-sm mt-1">Crea y gestiona tus asistentes inteligentes para estudiantes</p>
        </div>

        {!isLoading && chatbots.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <MetricCard icon="🤖" label="Total de Chatbots" value={metrics?.totalChatbots ?? chatbots.length} color="brand" />
            <MetricCard icon="✅" label="Bots Publicados" value={metrics?.publishedChatbots ?? chatbots.filter((cb) => cb.is_published).length} color="green" />
            <MetricCard icon="📄" label="Docs Indexados" value={metrics?.totalDocuments ?? 0} color="indigo" />
            <MetricCard icon="💬" label="Conversaciones (Semana)" value={metrics?.weeklyConversations ?? 0} color="accent" />
          </div>
        )}

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
              <div key={chatbot.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm glow-card flex flex-col justify-between h-full">
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
                      <strong className="text-gray-700">{chatbot.education_level === "secondary" ? "Secundaria" : "Universidad"}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="font-medium text-gray-400">Tono:</span>
                      <strong className="text-gray-700 capitalize">{chatbot.tone}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="font-medium text-gray-400">Restricción:</span>
                      <strong className="text-gray-700 capitalize">{chatbot.restriction_level}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Link href={`/teacher/chatbots/${chatbot.id}`} className="flex-1 text-center px-3 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold text-xs shadow-sm transition-all">
                    Editar
                  </Link>
                  <Link href={`/chat/${chatbot.id}`} className="flex-1 text-center px-3 py-2 bg-brand-50 text-brand-700 border border-brand-100/50 rounded-xl hover:bg-brand-100 font-bold text-xs shadow-sm transition-all">
                    Probar Tutor
                  </Link>
                  <button
                    onClick={() => setDeleteTarget(chatbot.id)}
                    className="px-3 py-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl font-bold text-xs transition-all"
                    aria-label={`Eliminar chatbot ${chatbot.name}`}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal de confirmación — reemplaza confirm() nativo (CRIT-02) */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="¿Eliminar este chatbot?"
        description="Se eliminarán permanentemente el chatbot y todos sus documentos. Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Sistema de toasts — reemplaza alert() nativo (CRIT-02) */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function MetricCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    brand: "bg-brand-50 border-brand-100",
    green: "bg-green-50 border-green-100",
    indigo: "bg-indigo-50 border-indigo-100",
    accent: "bg-accent-50 border-accent-100",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-4 glow-card select-none">
      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl ${colorMap[color] ?? "bg-gray-50 border-gray-100"}`} aria-hidden="true">{icon}</div>
      <div>
        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">{label}</span>
        <strong className="text-2xl font-black text-gray-900">{value}</strong>
      </div>
    </div>
  );
}
