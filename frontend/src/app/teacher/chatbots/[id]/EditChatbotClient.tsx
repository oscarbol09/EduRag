"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { Spinner } from "@/components/Spinner";
import { HelpTooltip } from "@/components/HelpTooltip";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ToastContainer, useToast } from "@/components/Toast";
import { StatusBadge } from "@/components/StatusBadge";
import type { Chatbot, Document, CreateChatbotData, UpdateChatbotPayload } from "@/lib/types";

type ConfirmAction = "deleteDoc" | "publish" | "unpublish" | null;

interface ConfirmState {
  action: ConfirmAction;
  docId?: string;
}

export default function EditChatbotClient() {
  const params = useParams();
  const chatbotId = params.id as string;

  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>({ action: null });

  const { toasts, toast, removeToast } = useToast();

  const [formData, setFormData] = useState<CreateChatbotData>({
    name: "",
    subject_area: "",
    education_level: "secondary",
    tone: "friendly",
    restriction_level: "guided",
    llm_provider: "openrouter",
  });

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await api.documents.list(chatbotId);
      setDocuments(docs);
    } catch {
      // Documentos opcionales
    }
  }, [chatbotId]);

  useEffect(() => {
    let ignore = false;
    const fetchInitialData = async () => {
      try {
        const [cb, docs] = await Promise.all([
          api.chatbots.get(chatbotId),
          api.documents.list(chatbotId).catch(() => []),
        ]);
        if (!ignore) {
          setChatbot(cb);
          setFormData({
            name: cb.name,
            subject_area: cb.subject_area,
            education_level: cb.education_level,
            tone: cb.tone,
            welcome_message: cb.welcome_message,
            system_prompt_override: cb.system_prompt_override,
            restriction_level: cb.restriction_level,
            llm_provider: cb.llm_provider,
          });
          setDocuments(docs);
        }
      } catch {
        if (!ignore) toast.error("No se pudo cargar el chatbot");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };
    fetchInitialData();
    return () => {
      ignore = true;
    };
  }, [chatbotId, toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: UpdateChatbotPayload = {
        name: formData.name,
        subject_area: formData.subject_area,
        education_level: formData.education_level,
        tone: formData.tone,
        welcome_message: formData.welcome_message,
        system_prompt_override: formData.system_prompt_override,
        restriction_level: formData.restriction_level,
        llm_provider: formData.llm_provider,
      };
      const updated = await api.chatbots.update(chatbotId, payload);
      setChatbot(updated);
      toast.success("Directivas actualizadas correctamente");
    } catch {
      toast.error("No se pudo actualizar el tutor pedagógico");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await api.documents.upload(chatbotId, file);
      await loadDocuments();
      toast.success(`"${file.name}" subido e indexado`);
    } catch {
      toast.error("No se pudo subir el documento");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteDocumentConfirm = async () => {
    if (!confirm.docId) return;
    try {
      await api.documents.delete(confirm.docId, chatbotId);
      setDocuments((prev) => prev.filter((d) => d.id !== confirm.docId));
      toast.success("Documento y fragmentos eliminados");
    } catch {
      toast.error("No se pudo eliminar el documento");
    } finally {
      setConfirm({ action: null });
    }
  };

  const handlePublishConfirm = async () => {
    setConfirm({ action: null });
    setIsPublishing(true);
    try {
      const updated = await api.chatbots.publish(chatbotId);
      setChatbot(updated);
      toast.success("Tutor publicado en el marketplace educativo");
    } catch {
      toast.error("No se pudo publicar el chatbot");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublishConfirm = async () => {
    setConfirm({ action: null });
    setIsPublishing(true);
    try {
      const payload: UpdateChatbotPayload = { is_published: false };
      const updated = await api.chatbots.update(chatbotId, payload);
      setChatbot(updated);
      toast.success("Tutor retirado a modo borrador");
    } catch {
      toast.error("No se pudo retirar el chatbot");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleConfirmAction = () => {
    if (confirm.action === "deleteDoc") handleDeleteDocumentConfirm();
    else if (confirm.action === "publish") handlePublishConfirm();
    else if (confirm.action === "unpublish") handleUnpublishConfirm();
  };

  const copyEmbedCode = () => {
    if (chatbot?.embed_code) {
      navigator.clipboard.writeText(chatbot.embed_code);
      setCopiedEmbed(true);
      toast.success("Código iframe copiado al portapapeles");
      setTimeout(() => setCopiedEmbed(false), 2500);
    }
  };

  const CONFIRM_CONTENT: Record<NonNullable<ConfirmAction>, { title: string; description: string; confirmLabel: string; variant: "danger" | "warning" }> = {
    deleteDoc: { title: "¿Eliminar este documento curricular?", description: "Se eliminará permanentemente el documento y sus fragmentos léxicos del índice contextual. Esta acción no se puede deshacer.", confirmLabel: "Sí, eliminar", variant: "danger" },
    publish: { title: "¿Publicar este asistente pedagógico?", description: "El tutor será visible y accesible para todos los estudiantes en el marketplace educativo.", confirmLabel: "Sí, publicar", variant: "warning" },
    unpublish: { title: "¿Retirar del marketplace?", description: "El tutor pasará a estado borrador y dejará de estar visible en el marketplace público.", confirmLabel: "Sí, retirar", variant: "warning" },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07080c] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="min-h-screen bg-[#07080c] flex items-center justify-center font-sans">
        <div className="text-center glass-panel p-8 rounded-2xl border border-white/10 max-w-sm">
          <h2 className="text-base font-bold text-white font-display">Tutor no encontrado</h2>
          <p className="text-xs text-slate-400 mt-1 mb-4">El identificador solicitado no existe o no pertenece a tu cuenta.</p>
          <Link href="/teacher" className="btn-press inline-flex px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all">
            Volver al panel
          </Link>
        </div>
      </div>
    );
  }

  const toggleBtn = (active: boolean) =>
    `flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg text-center transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 btn-press ${
      active
        ? "bg-indigo-950/80 text-white border border-indigo-500/50 shadow-sm"
        : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
    }`;

  return (
    <div className="min-h-screen bg-[#07080c] flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar
        variant="teacher"
        backTo="/teacher"
        backLabel="Volver al panel"
        title={`Studio: ${chatbot.name}`}
        actions={
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href={`/chat/${chatbot.id}`}
              className="btn-press px-3.5 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 hover:text-white border border-white/10 rounded-xl font-semibold text-xs transition-all inline-flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Probar Tutor
            </Link>
            {chatbot.is_published ? (
              <button
                onClick={() => setConfirm({ action: "unpublish" })}
                disabled={isPublishing}
                className="btn-press px-3.5 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/40 rounded-xl font-semibold text-xs shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {isPublishing ? "..." : "Despublicar"}
              </button>
            ) : (
              <button
                onClick={() => setConfirm({ action: "publish" })}
                disabled={isPublishing}
                className="btn-press px-3.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 rounded-xl font-semibold text-xs shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 led-pulse" />
                {isPublishing ? "..." : "Publicar"}
              </button>
            )}
          </div>
        }
      />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 relative z-10">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Columna Izquierda: Parámetros Pedagógicos (7 cols) */}
          <div className="lg:col-span-7 glass-panel specular-highlight rounded-2xl p-6 sm:p-7 border border-white/10 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Parámetros Pedagógicos
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {chatbot.id}</p>
                </div>
                <StatusBadge status={chatbot.is_published ? "published" : "draft"} />
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
                    Nombre del tutor * <HelpTooltip text="Nombre visible en el marketplace y en el encabezado del chat." />
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 bg-white/[0.04] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none text-xs text-white placeholder-slate-500 transition-all font-sans"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="subject_area" className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
                    Materia / Área * <HelpTooltip text="Área curricular o disciplina asociada." />
                  </label>
                  <input
                    id="subject_area"
                    name="subject_area"
                    type="text"
                    value={formData.subject_area}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 bg-white/[0.04] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none text-xs text-white placeholder-slate-500 transition-all font-sans"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
                      Nivel <HelpTooltip text="Complejidad adaptativa de las explicaciones." />
                    </label>
                    <div role="radiogroup" aria-label="Nivel educativo" className="flex gap-1 bg-[#07080c]/90 p-1 rounded-xl border border-white/10">
                      {([
                        { value: "secondary", label: "Secundaria" },
                        { value: "university", label: "Universidad" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={formData.education_level === opt.value}
                          onClick={() => setFormData((p) => ({ ...p, education_level: opt.value }))}
                          className={toggleBtn(formData.education_level === opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
                      Tono <HelpTooltip text="Estilo y registro pedagógico." />
                    </label>
                    <div role="radiogroup" aria-label="Tono de comunicación" className="flex gap-1 bg-[#07080c]/90 p-1 rounded-xl border border-white/10">
                      {([
                        { value: "friendly", label: "Amigable" },
                        { value: "formal", label: "Formal" },
                        { value: "technical", label: "Técnico" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={formData.tone === opt.value}
                          onClick={() => setFormData((p) => ({ ...p, tone: opt.value }))}
                          className={toggleBtn(formData.tone === opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
                      Restricción <HelpTooltip text="Rigidez del tutor frente a los documentos curriculares." />
                    </label>
                    <div role="radiogroup" aria-label="Nivel de restricción" className="flex gap-1 bg-[#07080c]/90 p-1 rounded-xl border border-white/10">
                      {([
                        { value: "strict", label: "Estricto" },
                        { value: "guided", label: "Guiado" },
                        { value: "open", label: "Abierto" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={formData.restriction_level === opt.value}
                          onClick={() => setFormData((p) => ({ ...p, restriction_level: opt.value }))}
                          className={toggleBtn(formData.restriction_level === opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
                      Inferencia <HelpTooltip text="Motor activo para la generación de respuestas." />
                    </label>
                    <div role="radiogroup" aria-label="Proveedor LLM" className="flex gap-1 bg-[#07080c]/90 p-1 rounded-xl border border-white/10">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={formData.llm_provider === "openrouter"}
                        onClick={() => setFormData((p) => ({ ...p, llm_provider: "openrouter" }))}
                        className={toggleBtn(formData.llm_provider === "openrouter")}
                      >
                        OpenRouter
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={false}
                        disabled
                        aria-disabled="true"
                        className="flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg text-center opacity-30 cursor-not-allowed text-slate-500"
                      >
                        Claude
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="welcome_message" className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1">
                    Mensaje de bienvenida <HelpTooltip text="Saludo al estudiante al abrir el chat." />
                  </label>
                  <textarea
                    id="welcome_message"
                    name="welcome_message"
                    value={formData.welcome_message ?? ""}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3.5 py-2 bg-white/[0.04] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none text-xs text-white placeholder-slate-500 transition-all font-sans resize-none"
                  />
                </div>

                <div>
                  <label htmlFor="system_prompt_override" className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1">
                    Instrucciones didácticas personalizadas <HelpTooltip text="Pautas obligatorias que debe acatar el LLM." />
                  </label>
                  <textarea
                    id="system_prompt_override"
                    name="system_prompt_override"
                    value={formData.system_prompt_override ?? ""}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3.5 py-2 bg-white/[0.04] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none text-xs text-white placeholder-slate-500 transition-all font-sans resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-press w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl font-semibold text-xs shadow-lg shadow-indigo-950/50 border border-indigo-400/30 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Guardando cambios...
                    </>
                  ) : (
                    "Guardar Parámetros Didácticos"
                  )}
                </button>
              </form>
            </div>

            {/* Embed Code Widget */}
            {chatbot.embed_code && (
              <div className="mt-6 pt-5 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Código Embebible (Moodle / Canvas LMS)
                  </h3>
                  <button
                    onClick={copyEmbedCode}
                    className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors btn-press inline-flex items-center gap-1"
                  >
                    {copiedEmbed ? "✓ Copiado" : "Copiar iframe"}
                  </button>
                </div>
                <div className="relative">
                  <textarea
                    readOnly
                    value={chatbot.embed_code}
                    rows={2}
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                    aria-label="Código iframe para Moodle"
                    className="w-full px-3 py-2 text-[11px] bg-[#07080c] border border-white/10 rounded-xl font-mono text-cyan-300 cursor-text resize-none focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha: Document Studio (5 cols) */}
          <div className="lg:col-span-5 glass-panel specular-highlight rounded-2xl p-6 sm:p-7 border border-white/10 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-4">
              <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
                <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Document Studio
              </h2>
              <span className="text-[11px] font-mono text-slate-400 bg-white/[0.04] px-2.5 py-0.5 rounded-md border border-white/10">
                {documents.length} archivos
              </span>
            </div>

            {/* Dropzone */}
            <div className="mb-5">
              <label className="block cursor-pointer" aria-label="Subir documento curricular">
                <div className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl transition-all ${
                  isUploading
                    ? "border-cyan-500/80 bg-cyan-950/30"
                    : "border-white/15 hover:border-indigo-400/60 bg-white/[0.02] hover:bg-white/[0.05]"
                }`}>
                  <div className="text-center p-4">
                    {isUploading ? (
                      <Spinner size="sm" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto mb-2 shadow-inner">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                    )}
                    <p className="text-xs font-semibold text-white">
                      {isUploading ? "Indexando fragmentos léxicos..." : "Arrastra o selecciona un archivo"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">PDF, DOCX, TXT, MD (máx 20 MB)</p>
                  </div>
                </div>
                <input
                  type="file"
                  accept=".md,.txt,.pdf,.docx"
                  onChange={handleFileUpload}
                  className="sr-only"
                  disabled={isUploading}
                  aria-label="Seleccionar archivo curricular para subir"
                />
              </label>
            </div>

            {/* File List */}
            {documents.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs flex-1 flex flex-col items-center justify-center border border-white/5 rounded-xl bg-[#07080c]/50 p-6">
                <svg className="w-8 h-8 text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="font-semibold text-slate-300 mb-0.5">Sin documentos indexados</p>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  Sube apuntes, diapositivas o guías didácticas para alimentar el contexto léxico del tutor
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 flex-1 overflow-auto max-h-[420px] pr-1">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-[#07080c]/90 rounded-xl border border-white/10 hover:border-white/20 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center flex-shrink-0 text-cyan-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
                          {doc.filename}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400">
                          {doc.chunk_count} fragmentos · 1500c/chunk
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={doc.status} />
                      <button
                        onClick={() => setConfirm({ action: "deleteDoc", docId: doc.id })}
                        className="btn-press p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-all"
                        aria-label={`Eliminar documento ${doc.filename}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {confirm.action && (
        <ConfirmModal
          isOpen
          title={CONFIRM_CONTENT[confirm.action].title}
          description={CONFIRM_CONTENT[confirm.action].description}
          confirmLabel={CONFIRM_CONTENT[confirm.action].confirmLabel}
          cancelLabel="Cancelar"
          variant={CONFIRM_CONTENT[confirm.action].variant}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirm({ action: null })}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
