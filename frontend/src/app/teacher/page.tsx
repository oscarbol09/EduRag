"use client";

import { useState, useEffect } from "react";
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
        // Métricas opcionales
      }
    } catch {
      toast.error("No se pudo cargar la lista de chatbots");
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-brand-600 selection:text-white">
      <Navbar
        variant="teacher"
        actions={
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="text-xs text-zinc-500 hidden sm:inline-block">
              Docente: <strong className="text-zinc-900 font-semibold">
                {auth.user?.firstName ?? auth.user?.email}
              </strong>
            </span>
            <Link
              href="/teacher/chatbots/new"
              className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold text-xs shadow-sm btn-press transition-colors inline-flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Chatbot
            </Link>
            <Link
              href="/teacher/settings"
              className="px-3 py-1.5 bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-lg font-semibold text-xs shadow-sm btn-press transition-colors"
            >
              Configuración
            </Link>
            <button
              onClick={() => { logout(); router.push("/"); }}
              className="px-2.5 py-1.5 text-zinc-500 hover:text-red-700 hover:bg-red-50 rounded-lg font-semibold text-xs transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        }
      />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight font-display">Panel del Docente</h1>
          <p className="text-zinc-500 text-xs sm:text-sm mt-1">Gestiona tus asistentes inteligentes, documentos indexados y parámetros de respuesta</p>
        </div>

        {!isLoading && chatbots.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total de Chatbots"
              value={metrics?.totalChatbots ?? chatbots.length}
              icon={
                <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              }
            />
            <MetricCard
              label="Bots Publicados"
              value={metrics?.publishedChatbots ?? chatbots.filter((cb) => cb.is_published).length}
              icon={
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <MetricCard
              label="Docs Indexados"
              value={metrics?.totalDocuments ?? 0}
              icon={
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <MetricCard
              label="Consultas (Semana)"
              value={metrics?.weeklyConversations ?? 0}
              icon={
                <svg className="w-5 h-5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              }
            />
          </div>
        )}

        {isLoading ? (
          <div className="py-20 flex justify-center"><Spinner /></div>
        ) : chatbots.length === 0 ? (
          <EmptyState
            title="No tienes chatbots creados"
            description="Comienza creando tu primer tutor inteligente y sube tus apuntes de clase."
            action={{ label: "Crear Chatbot Educativo", href: "/teacher/chatbots/new" }}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chatbots.map((chatbot) => (
              <div key={chatbot.id} className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm craft-card flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div>
                      <h3 className="font-bold text-zinc-950 text-base leading-tight font-display">{chatbot.name}</h3>
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mt-0.5">{chatbot.subject_area}</span>
                    </div>
                    <StatusBadge status={chatbot.is_published ? "published" : "draft"} />
                  </div>

                  <div className="space-y-1.5 text-xs text-zinc-600 mb-6 bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                    <p className="flex justify-between">
                      <span className="text-zinc-400">Nivel:</span>
                      <strong className="text-zinc-800 font-medium">{chatbot.education_level === "secondary" ? "Secundaria" : "Universidad"}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-zinc-400">Tono:</span>
                      <strong className="text-zinc-800 font-medium capitalize">{chatbot.tone}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-zinc-400">Restricción:</span>
                      <strong className="text-zinc-800 font-medium capitalize">{chatbot.restriction_level}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-zinc-100">
                  <Link href={`/teacher/chatbots/${chatbot.id}`} className="flex-1 text-center px-3 py-1.5 border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 font-semibold text-xs shadow-sm transition-colors btn-press">
                    Editar
                  </Link>
                  <Link href={`/chat/${chatbot.id}`} className="flex-1 text-center px-3 py-1.5 bg-brand-50 text-brand-700 border border-brand-200/60 rounded-lg hover:bg-brand-100 font-semibold text-xs shadow-sm transition-colors btn-press">
                    Probar Tutor
                  </Link>
                  <button
                    onClick={() => setDeleteTarget(chatbot.id)}
                    className="px-2.5 py-1.5 text-zinc-400 hover:text-red-700 hover:bg-red-50 rounded-lg font-semibold text-xs transition-colors"
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

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-5 shadow-sm flex items-center gap-3.5 craft-card select-none">
      <div className="w-10 h-10 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
        {icon}
      </div>
      <div>
        <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider block">{label}</span>
        <strong className="text-xl sm:text-2xl font-black text-zinc-950 tabular-nums">{value}</strong>
      </div>
    </div>
  );
}

