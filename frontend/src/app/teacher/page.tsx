"use client";

import { useState, useEffect, useCallback } from "react";
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

  const loadChatbots = useCallback(async () => {
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
  }, [auth.user?.id, toast]);

  useEffect(() => {
    if (isAuthorized) {
      loadChatbots();
    }
  }, [isAuthorized, loadChatbots]);

  if (isChecking || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
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
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-100">
      <Navbar
        variant="teacher"
        actions={
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="text-xs text-zinc-400 hidden sm:inline-block">
              Docente:{" "}
              <strong className="text-zinc-200 font-medium">
                {auth.user?.firstName ?? auth.user?.email}
              </strong>
            </span>
            <Link
              href="/teacher/chatbots/new"
              className="btn-press px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg font-medium text-xs transition-colors inline-flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Tutor
            </Link>
            <Link
              href="/teacher/settings"
              className="btn-press px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg font-medium text-xs transition-colors"
            >
              Configuración BYOK
            </Link>
            <button
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="btn-press px-2.5 py-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg font-medium text-xs transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        }
      />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">
              Panel del Docente
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">
              Gestiona tus tutores pedagógicos, documentos curriculares indexados y parámetros didácticos
            </p>
          </div>
        </div>

        {/* Telemetry Row */}
        {!isLoading && chatbots.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total de Tutores"
              value={metrics?.totalChatbots ?? chatbots.length}
              icon={
                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              }
            />
            <MetricCard
              label="Tutores Publicados"
              value={metrics?.publishedChatbots ?? chatbots.filter((cb) => cb.is_published).length}
              icon={
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <MetricCard
              label="Documentos Indexados"
              value={metrics?.totalDocuments ?? 0}
              icon={
                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <MetricCard
              label="Consultas Semanales"
              value={metrics?.weeklyConversations ?? 0}
              icon={
                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
            title="No tienes asistentes pedagógicos creados"
            description="Comienza creando tu primer tutor inteligente y sube tus guías curriculares o sílabos de clase."
            action={{ label: "Crear Tutor Pedagógico", href: "/teacher/chatbots/new" }}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chatbots.map((chatbot) => (
              <div key={chatbot.id} className="card-clean p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700 transition-all flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div>
                      <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                        {chatbot.subject_area}
                      </span>
                      <h3 className="font-semibold text-zinc-100 text-base leading-snug">
                        {chatbot.name}
                      </h3>
                    </div>
                    <StatusBadge status={chatbot.is_published ? "published" : "draft"} />
                  </div>

                  <div className="space-y-2 text-xs text-zinc-300 mb-6 bg-zinc-950/60 rounded-lg p-3 border border-zinc-800/60">
                    <p className="flex justify-between items-center text-[11px]">
                      <span className="text-zinc-400">Nivel:</span>
                      <strong className="text-zinc-200 font-medium">{chatbot.education_level === "secondary" ? "Secundaria" : "Universidad"}</strong>
                    </p>
                    <p className="flex justify-between items-center text-[11px]">
                      <span className="text-zinc-400">Tono:</span>
                      <strong className="text-zinc-200 font-medium capitalize">{chatbot.tone}</strong>
                    </p>
                    <p className="flex justify-between items-center text-[11px]">
                      <span className="text-zinc-400">Restricción:</span>
                      <strong className="text-zinc-200 font-medium capitalize">{chatbot.restriction_level}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-zinc-800/60">
                  <Link 
                    href={`/teacher/chatbots/${chatbot.id}`} 
                    className="btn-press flex-1 text-center px-3 py-2 border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-lg font-medium text-xs transition-colors"
                  >
                    Editar & Docs
                  </Link>
                  <Link 
                    href={`/chat/${chatbot.id}`} 
                    className="btn-press flex-1 text-center px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg font-medium text-xs transition-colors"
                  >
                    Probar Tutor
                  </Link>
                  <button
                    onClick={() => setDeleteTarget(chatbot.id)}
                    className="btn-press p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors"
                    aria-label={`Eliminar chatbot ${chatbot.name}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="¿Eliminar este asistente pedagógico?"
        description="Se eliminarán permanentemente el chatbot, su configuración didáctica y todos los fragmentos documentales indexados. Esta acción no se puede deshacer."
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
    <div className="card-clean p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center" aria-hidden="true">
          {icon}
        </div>
      </div>
      <div>
        <span className="text-xs font-medium text-zinc-400 block mb-0.5">{label}</span>
        <strong className="text-2xl sm:text-3xl font-bold text-zinc-100 tabular-nums">{value}</strong>
      </div>
    </div>
  );
}
