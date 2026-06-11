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

  const loadChatbot = useCallback(async () => {
    try {
      const cb = await api.chatbots.get(chatbotId);
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
    } catch {
      toast.error("No se pudo cargar el chatbot");
    } finally {
      setIsLoading(false);
    }
  }, [chatbotId]);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await api.documents.list(chatbotId);
      setDocuments(docs);
    } catch {
      // Documentos opcionales — no bloquear la vista
    }
  }, [chatbotId]);

  useEffect(() => {
    loadChatbot();
    loadDocuments();
  }, [loadChatbot, loadDocuments]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Uso de UpdateChatbotPayload — sin casts `as Partial<Chatbot>` (MEN-03)
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
      toast.success("Chatbot actualizado correctamente");
    } catch {
      toast.error("No se pudo actualizar el chatbot");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await api.documents.upload(chatbotId, file);
      await loadDocuments();
      toast.success(`"${file.name}" subido correctamente`);
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
      toast.success("Documento eliminado");
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
      toast.success("Chatbot publicado en el marketplace");
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
      const updated = await api.chatbots.update(chatbotId, payload as Partial<Chatbot>);
      setChatbot(updated);
      toast.success("Chatbot retirado del marketplace");
    } catch {
      toast.error("No se pudo despublicar el chatbot");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleConfirmAction = () => {
    if (confirm.action === "deleteDoc") handleDeleteDocumentConfirm();
    else if (confirm.action === "publish") handlePublishConfirm();
    else if (confirm.action === "unpublish") handleUnpublishConfirm();
  };

  const CONFIRM_CONTENT: Record<NonNullable<ConfirmAction>, { title: string; description: string; confirmLabel: string; variant: "danger" | "warning" }> = {
    deleteDoc: { title: "¿Eliminar este documento?", description: "Se eliminará el documento y sus chunks del índice. Esta acción no se puede deshacer.", confirmLabel: "Sí, eliminar", variant: "danger" },
    publish: { title: "¿Publicar este chatbot?", description: "El chatbot será visible para los estudiantes en el marketplace.", confirmLabel: "Sí, publicar", variant: "warning" },
    unpublish: { title: "¿Retirar del marketplace?", description: "El chatbot dejará de ser visible para los estudiantes.", confirmLabel: "Sí, retirar", variant: "warning" },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Chatbot no encontrado</h2>
          <Link href="/teacher" className="text-brand-600 hover:underline mt-2 block font-medium">Volver al panel</Link>
        </div>
      </div>
    );
  }

  const documentStatusLabels: Record<string, string> = {
    queued: "En cola", processing: "Procesando", indexed: "Indexado", error: "Error",
  };
  const documentStatusColors: Record<string, string> = {
    queued: "bg-yellow-100 text-yellow-700",
    processing: "bg-brand-100 text-brand-700",
    indexed: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };

  // Helper para clases de toggle buttons con accesibilidad
  const toggleBtn = (active: boolean) =>
    `flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg text-center transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 ${
      active ? "bg-white text-brand-700 shadow-sm border border-brand-100/50" : "text-gray-500 hover:text-gray-800"
    }`;

  return (
    <div className="min-h-screen bg-gray-50 bg-dot-grid flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      <Navbar
        variant="teacher"
        backTo="/teacher"
        backLabel="Volver al panel"
        title={`Editar: ${chatbot.name}`}
        actions={
          <div className="flex items-center gap-3.5">
            <Link href={`/chat/${chatbot.id}`} className="px-4 py-2 bg-brand-50 text-brand-700 border border-brand-100/50 rounded-xl font-bold text-sm shadow-sm transition-all hover:bg-brand-100">
              Probar Tutor
            </Link>
            {chatbot.is_published ? (
              <button
                onClick={() => setConfirm({ action: "unpublish" })}
                disabled={isPublishing}
                className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-bold text-sm shadow transition-all disabled:opacity-50"
              >
                {isPublishing ? "..." : "Despublicar"}
              </button>
            ) : (
              <button
                onClick={() => setConfirm({ action: "publish" })}
                disabled={isPublishing}
                className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold text-sm shadow transition-all disabled:opacity-50"
              >
                {isPublishing ? "..." : "Publicar"}
              </button>
            )}
          </div>
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Formulario de configuración */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 font-display">Configuración del Tutor</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  Nombre * <HelpTooltip text="Ej: Tutor de Matemáticas." />
                </label>
                <input id="name" name="name" type="text" value={formData.name} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-xs transition-all" required />
              </div>

              <div>
                <label htmlFor="subject_area" className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  Área temática * <HelpTooltip text="Ej: Álgebra Lineal." />
                </label>
                <input id="subject_area" name="subject_area" type="text" value={formData.subject_area} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-xs transition-all" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Nivel educativo — grupo ARIA radio (MEN-02) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                    Nivel educativo <HelpTooltip text="Complejidad de las explicaciones." />
                  </label>
                  <div role="radiogroup" aria-label="Nivel educativo" className="flex gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                    {([
                      { value: "secondary", label: "🏫 Sec." },
                      { value: "university", label: "🎓 Univ." },
                    ] as const).map((opt) => (
                      <button key={opt.value} type="button"
                        role="radio" aria-checked={formData.education_level === opt.value}
                        onClick={() => setFormData((p) => ({ ...p, education_level: opt.value }))}
                        className={toggleBtn(formData.education_level === opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tono — grupo ARIA radio (MEN-02) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                    Tono <HelpTooltip text="Estilo del lenguaje con el alumno." />
                  </label>
                  <div role="radiogroup" aria-label="Tono de comunicación" className="flex gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                    {([
                      { value: "friendly", label: "😊 Amig." },
                      { value: "formal", label: "👔 Form." },
                      { value: "technical", label: "🔬 Téc." },
                    ] as const).map((opt) => (
                      <button key={opt.value} type="button"
                        role="radio" aria-checked={formData.tone === opt.value}
                        onClick={() => setFormData((p) => ({ ...p, tone: opt.value }))}
                        className={toggleBtn(formData.tone === opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Restricción — grupo ARIA radio (MEN-02) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                    Restricción <HelpTooltip text="Rigidez del tutor frente al contexto." />
                  </label>
                  <div role="radiogroup" aria-label="Nivel de restricción" className="flex gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                    {([
                      { value: "strict", label: "🔒 Estr." },
                      { value: "guided", label: "🧭 Guia." },
                      { value: "open", label: "🌐 Abie." },
                    ] as const).map((opt) => (
                      <button key={opt.value} type="button"
                        role="radio" aria-checked={formData.restriction_level === opt.value}
                        onClick={() => setFormData((p) => ({ ...p, restriction_level: opt.value }))}
                        className={toggleBtn(formData.restriction_level === opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Proveedor LLM — grupo ARIA radio (MEN-02) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                    Proveedor LLM <HelpTooltip text="Motor inteligente activo." />
                  </label>
                  <div role="radiogroup" aria-label="Proveedor LLM" className="flex gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-100">
                    <button type="button" role="radio" aria-checked={formData.llm_provider === "openrouter"}
                      onClick={() => setFormData((p) => ({ ...p, llm_provider: "openrouter" }))}
                      className={toggleBtn(formData.llm_provider === "openrouter")}
                    >
                      ✨ OpenRouter
                    </button>
                    <button type="button" role="radio" aria-checked={false} disabled
                      aria-disabled="true"
                      className="flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg text-center opacity-40 cursor-not-allowed text-gray-400"
                    >
                      🔒 Claude
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="welcome_message" className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  Mensaje de bienvenida <HelpTooltip text="Saludo al alumno al abrir el chat." />
                </label>
                <textarea id="welcome_message" name="welcome_message" value={formData.welcome_message ?? ""} onChange={handleChange}
                  rows={2} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-xs transition-all resize-none" />
              </div>

              <div>
                <label htmlFor="system_prompt_override" className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  Instrucciones personalizadas <HelpTooltip text="Pautas que debe seguir el LLM." />
                </label>
                <textarea id="system_prompt_override" name="system_prompt_override" value={formData.system_prompt_override ?? ""} onChange={handleChange}
                  rows={3} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-xs transition-all resize-none" />
              </div>

              <button type="submit" className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm shadow transition-all">
                Guardar cambios
              </button>
            </form>

            {chatbot.embed_code && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-700 mb-2">Código de Embed (Iframe Moodle)</h3>
                <textarea readOnly value={chatbot.embed_code} rows={2}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  aria-label="Código iframe para Moodle"
                  className="w-full px-3 py-2 text-[10px] bg-gray-50 border border-gray-100 rounded-xl font-mono text-gray-500 cursor-text" />
              </div>
            )}
          </div>

          {/* Sección de documentos */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 font-display">Documentos</h2>

            <div className="mb-6">
              <label className="block" aria-label="Subir documento">
                <div className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-colors cursor-pointer ${isUploading ? "border-brand-300 bg-brand-50" : "border-gray-200 hover:border-brand-400"}`}>
                  <div className="text-center">
                    {isUploading ? (
                      <Spinner />
                    ) : (
                      <svg className="mx-auto h-8 w-8 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    )}
                    <p className="text-sm text-gray-500">{isUploading ? "Subiendo..." : "Arrastra o haz clic para subir"}</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT, MD (máx 20 MB)</p>
                    <p className="text-[10px] text-amber-600 mt-1 font-medium">⚠️ Solo PDFs digitales — los escaneados no son compatibles</p>
                  </div>
                </div>
                <input type="file" accept=".md,.txt,.pdf,.docx" onChange={handleFileUpload} className="sr-only" disabled={isUploading} aria-label="Seleccionar archivo para subir" />
              </label>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <p className="font-medium text-gray-700 mb-1">Sin documentos aún</p>
                <p>Sube PDFs, DOCX o TXT para entrenar tu chatbot</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.filename}</p>
                        <p className="text-xs text-gray-500">{doc.chunk_count} chunks</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-lg font-medium ${documentStatusColors[doc.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {documentStatusLabels[doc.status] ?? doc.status}
                      </span>
                      <button
                        onClick={() => setConfirm({ action: "deleteDoc", docId: doc.id })}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label={`Eliminar documento ${doc.filename}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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

      {/* Modal de confirmación — reemplaza confirm() nativo (CRIT-02) */}
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

      {/* Sistema de toasts — reemplaza alert() nativo (CRIT-02) */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
