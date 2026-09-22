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
      <div className="min-h-screen flex items-center justify-center bg-[#07080c]">
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
    <div className="min-h-screen bg-[#07080c] flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar
        variant="teacher"
        actions={
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline-block">
              Docente: <strong className="text-slate-100 font-semibold font-mono">
                {auth.user?.firstName ?? auth.user?.email}
              </strong>
            </span>
            <Link
              href="/teacher/chatbots/new"
              className="btn-press px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg font-semibold text-xs shadow-lg shadow-indigo-950/40 border border-indigo-400/30 transition-all inline-flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Tutor
            </Link>
            <Link
              href="/teacher/settings"
              className="btn-press px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 rounded-lg font-semibold text-xs transition-all"
            >
              Configuración BYOK
            </Link>
            <button
              onClick={() => { logout(); router.push("/"); }}
              className="btn-press px-2.5 py-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg font-semibold text-xs transition-all"
            >
              Cerrar sesión
            </button>
          </div>
        }
      />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
              Panel del Docente
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Gestiona tus asistentes pedagógicos, documentos curriculares indexados y parámetros de inferencia
            </p>
          </div>
        </div>

        {/* Bento Telemetry Row */}
        {!isLoading && chatbots.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total de Chatbots"
              value={metrics?.totalChatbots ?? chatbots.length}
              tag="DOCENTES // TOTAL"
              icon={
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              }
            />
            <MetricCard
              label="Bots Publicados"
              value={metrics?.publishedChatbots ?? chatbots.filter((cb) => cb.is_published).length}
              tag="MARKETPLACE // LIVE"
              icon={
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <MetricCard
              label="Docs Indexados"
              value={metrics?.totalDocuments ?? 0}
              tag="RAG // 1500C CHUNKS"
              icon={
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <MetricCard
              label="Consultas Semanales"
              value={metrics?.weeklyConversations ?? 0}
              tag="TELEMETRÍA // SSE"
              icon={
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
            description="Comienza desplegando tu primer tutor inteligente y sube tus guías curriculares o sílabos de clase."
            action={{ label: "Crear Tutor Pedagógico", href: "/teacher/chatbots/new" }}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chatbots.map((chatbot) => (
              <div key={chatbot.id} className="bento-card p-6 flex flex-col justify-between h-full group">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div>
                      <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block mb-0.5">
                        {chatbot.subject_area}
                      </span>
                      <h3 className="font-bold text-white text-base leading-tight font-display group-hover:text-indigo-300 transition-colors">
                        {chatbot.name}
                      </h3>
                    </div>
                    <StatusBadge status={chatbot.is_published ? "published" : "draft"} />
                  </div>

                  <div className="space-y-2 text-xs text-slate-300 mb-6 bg-[#07080c]/80 rounded-xl p-3.5 border border-white/10 font-mono">
                    <p className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Nivel:</span>
                      <strong className="text-slate-200 font-medium">{chatbot.education_level === "secondary" ? "Secundaria" : "Universidad"}</strong>
                    </p>
                    <p className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Tono:</span>
                      <strong className="text-slate-200 font-medium capitalize">{chatbot.tone}</strong>
                    </p>
                    <p className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Restricción:</span>
                      <strong className="text-slate-200 font-medium capitalize">{chatbot.restriction_level}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-white/10">
                  <Link 
                    href={`/teacher/chatbots/${chatbot.id}`} 
                    className="btn-press flex-1 text-center px-3 py-2 border border-white/15 text-slate-200 hover:text-white hover:bg-white/[0.06] rounded-xl font-semibold text-xs transition-all"
                  >
                    Editar & Docs
                  </Link>
                  <Link 
                    href={`/chat/${chatbot.id}`} 
                    className="btn-press flex-1 text-center px-3 py-2 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/30 rounded-xl font-semibold text-xs transition-all"
                  >
                    Probar Tutor
                  </Link>
                  <button
                    onClick={() => setDeleteTarget(chatbot.id)}
                    className="btn-press px-2.5 py-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-500/30 rounded-xl font-semibold text-xs transition-all"
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

function MetricCard({ icon, label, value, tag }: { icon: React.ReactNode; label: string; value: number; tag: string }) {
  return (
    <div className="bento-card p-4 sm:p-5 flex flex-col justify-between select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-[#07080c] border border-white/10 flex items-center justify-center shadow-inner" aria-hidden="true">
          {icon}
        </div>
        <span className="text-[10px] font-mono text-slate-500">{tag}</span>
      </div>
      <div>
        <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block">{label}</span>
        <strong className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums font-display">{value}</strong>
      </div>
    </div>
  );
}
