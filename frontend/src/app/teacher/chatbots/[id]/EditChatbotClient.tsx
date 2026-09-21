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
      const updated = await api.chatbots.update(chatbotId, payload);
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
    deleteDoc: { title: "¿Eliminar este documento?", description: "Se eliminará el documento y sus fragmentos del índice contextual. Esta acción no se puede deshacer.", confirmLabel: "Sí, eliminar", variant: "danger" },
    publish: { title: "¿Publicar este chatbot?", description: "El tutor será visible y accesible para los estudiantes en el marketplace educativo.", confirmLabel: "Sí, publicar", variant: "warning" },
    unpublish: { title: "¿Retirar del marketplace?", description: "El chatbot pasará a modo borrador y dejará de estar visible en el marketplace.", confirmLabel: "Sí, retirar", variant: "warning" },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center">
          <h2 className="text-base font-semibold text-zinc-900">Chatbot no encontrado</h2>
          <Link href="/teacher" className="text-brand-600 hover:underline mt-2 block text-xs font-medium">Volver al panel</Link>
        </div>
      </div>
    );
  }

  const documentStatusLabels: Record<string, string> = {
    queued: "En cola", processing: "Indexando", indexed: "Indexado", error: "Error",
  };
  const documentStatusColors: Record<string, string> = {
    queued: "bg-yellow-50 text-yellow-800 border-yellow-200",
    processing: "bg-blue-50 text-blue-800 border-blue-200",
    indexed: "bg-emerald-50 text-emerald-800 border-emerald-200",
    error: "bg-red-50 text-red-800 border-red-200",
  };

  const toggleBtn = (active: boolean) =>
    `flex-1 py-1.5 px-2 text-xs font-semibold rounded-md text-center transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1 ${
      active ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50"
    }`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-brand-600 selection:text-white">
      <Navbar
        variant="teacher"
        backTo="/teacher"
        backLabel="Volver al panel"
        title={`Editar: ${chatbot.name}`}
        actions={
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href={`/chat/${chatbot.id}`} className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 rounded-lg font-semibold text-xs transition-colors btn-press">
              Probar Tutor
            </Link>
            {chatbot.is_published ? (
              <button
                onClick={() => setConfirm({ action: "unpublish" })}
                disabled={isPublishing}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs shadow-sm transition-colors btn-press disabled:opacity-50"
              >
                {isPublishing ? "..." : "Despublicar"}
              </button>
            ) : (
              <button
                onClick={() => setConfirm({ action: "publish" })}
                disabled={isPublishing}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs shadow-sm transition-colors btn-press disabled:opacity-50"
              >
                {isPublishing ? "..." : "Publicar"}
              </button>
            )}
          </div>
        }
      />

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Formulario de configuración */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
            <h2 className="text-base font-bold text-zinc-950 mb-4 font-display">Parámetros Pedagógicos</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1">
                  Nombre del tutor * <HelpTooltip text="Nombre visible en la plataforma y el chat." />
                </label>
                <input id="name" name="name" type="text" value={formData.name} onChange={handleChange}
                  className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-xs text-zinc-900 transition-all" required />
              </div>

              <div>
                <label htmlFor="subject_area" className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1">
                  Materia / Área * <HelpTooltip text="Área de conocimiento asociada." />
                </label>
                <input id="subject_area" name="subject_area" type="text" value={formData.subject_area} onChange={handleChange}
                  className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-xs text-zinc-900 transition-all" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1">
                    Nivel educativo <HelpTooltip text="Complejidad de las explicaciones." />
                  </label>
                  <div role="radiogroup" aria-label="Nivel educativo" className="flex gap-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
                    {([
                      { value: "secondary", label: "Secundaria" },
                      { value: "university", label: "Universidad" },
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

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1">
                    Tono <HelpTooltip text="Estilo del lenguaje con el alumno." />
                  </label>
                  <div role="radiogroup" aria-label="Tono de comunicación" className="flex gap-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
                    {([
                      { value: "friendly", label: "Amigable" },
                      { value: "formal", label: "Formal" },
                      { value: "technical", label: "Técnico" },
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1">
                    Restricción <HelpTooltip text="Rigidez del tutor frente al contexto." />
                  </label>
                  <div role="radiogroup" aria-label="Nivel de restricción" className="flex gap-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
                    {([
                      { value: "strict", label: "Estricto" },
                      { value: "guided", label: "Guiado" },
                      { value: "open", label: "Abierto" },
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

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1">
                    Motor LLM <HelpTooltip text="Proveedor activo de inferencia." />
                  </label>
                  <div role="radiogroup" aria-label="Proveedor LLM" className="flex gap-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
                    <button type="button" role="radio" aria-checked={formData.llm_provider === "openrouter"}
                      onClick={() => setFormData((p) => ({ ...p, llm_provider: "openrouter" }))}
                      className={toggleBtn(formData.llm_provider === "openrouter")}
                    >
                      OpenRouter
                    </button>
                    <button type="button" role="radio" aria-checked={false} disabled
                      aria-disabled="true"
                      className="flex-1 py-1.5 px-2 text-xs font-semibold rounded-md text-center opacity-40 cursor-not-allowed text-zinc-400"
                    >
                      Claude
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="welcome_message" className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1">
                  Mensaje de bienvenida <HelpTooltip text="Saludo al alumno al abrir el chat." />
                </label>
                <textarea id="welcome_message" name="welcome_message" value={formData.welcome_message ?? ""} onChange={handleChange}
                  rows={2} className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-xs text-zinc-900 transition-all resize-none" />
              </div>

              <div>
                <label htmlFor="system_prompt_override" className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1">
                  Instrucciones personalizadas <HelpTooltip text="Pautas que debe seguir el LLM." />
                </label>
                <textarea id="system_prompt_override" name="system_prompt_override" value={formData.system_prompt_override ?? ""} onChange={handleChange}
                  rows={3} className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-xs text-zinc-900 transition-all resize-none" />
              </div>

              <button type="submit" className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold text-xs shadow-sm btn-press transition-colors">
                Guardar cambios
              </button>
            </form>

            {chatbot.embed_code && (
              <div className="mt-6 pt-5 border-t border-zinc-100">
                <h3 className="text-xs font-semibold text-zinc-700 mb-1.5">Código para embeber (Moodle / Canvas)</h3>
                <textarea readOnly value={chatbot.embed_code} rows={2}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  aria-label="Código iframe para Moodle"
                  className="w-full px-3 py-2 text-[11px] bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-zinc-600 cursor-text" />
              </div>
            )}
          </div>

          {/* Sección de documentos */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm flex flex-col">
            <h2 className="text-base font-bold text-zinc-950 mb-4 font-display">Documentos Académicos</h2>

            <div className="mb-4">
              <label className="block cursor-pointer" aria-label="Subir documento">
                <div className={`flex items-center justify-center w-full h-28 border-2 border-dashed rounded-xl transition-colors ${isUploading ? "border-brand-400 bg-brand-50" : "border-zinc-300 hover:border-zinc-500 bg-zinc-50/50 hover:bg-zinc-50"}`}>
                  <div className="text-center p-3">
                    {isUploading ? (
                      <Spinner size="sm" />
                    ) : (
                      <svg className="mx-auto h-6 w-6 text-zinc-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    )}
                    <p className="text-xs font-semibold text-zinc-700">{isUploading ? "Indexando documento..." : "Arrastra o selecciona un archivo"}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">PDF, DOCX, TXT, MD (máx 20 MB)</p>
                  </div>
                </div>
                <input type="file" accept=".md,.txt,.pdf,.docx" onChange={handleFileUpload} className="sr-only" disabled={isUploading} aria-label="Seleccionar archivo para subir" />
              </label>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-xs flex-1 flex flex-col items-center justify-center">
                <p className="font-semibold text-zinc-700 mb-0.5">Sin documentos indexados</p>
                <p>Sube apuntes o guías de estudio para alimentar el contexto del tutor</p>
              </div>
            ) : (
              <div className="space-y-2 flex-1 overflow-auto max-h-96">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-lg border border-zinc-200">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <svg className="w-4 h-4 text-zinc-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-900 truncate">{doc.filename}</p>
                        <p className="text-[10px] text-zinc-400">{doc.chunk_count} fragmentos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 text-[10px] rounded-md font-semibold border ${documentStatusColors[doc.status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200"}`}>
                        {documentStatusLabels[doc.status] ?? doc.status}
                      </span>
                      <button
                        onClick={() => setConfirm({ action: "deleteDoc", docId: doc.id })}
                        className="p-1 text-zinc-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        aria-label={`Eliminar documento ${doc.filename}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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

