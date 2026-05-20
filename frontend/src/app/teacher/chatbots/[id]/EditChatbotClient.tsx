"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Chatbot, Document, CreateChatbotData } from "@/lib/types";

export default function EditChatbotClient() {
  const params = useParams();
  const router = useRouter();
  const chatbotId = params.id as string;

  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const [formData, setFormData] = useState<CreateChatbotData>({
    name: "",
    subject_area: "",
    education_level: "secondary",
    tone: "friendly",
    restriction_level: "guided",
    llm_provider: "gemini",
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
    } catch (error) {
      console.error("Error loading chatbot:", error);
    } finally {
      setIsLoading(false);
    }
  }, [chatbotId]);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await api.documents.list(chatbotId);
      setDocuments(docs);
    } catch (error) {
      console.error("Error loading documents:", error);
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
      const updated = await api.chatbots.update(chatbotId, formData as Partial<Chatbot>);
      setChatbot(updated);
      alert("Chatbot actualizado correctamente");
    } catch (error) {
      alert("Error al actualizar el chatbot");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await api.documents.upload(chatbotId, file);
      await loadDocuments();
    } catch (error) {
      alert("Error al subir el documento");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("¿Eliminar este documento?")) return;
    try {
      await api.documents.delete(documentId, chatbotId);
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    } catch (error) {
      alert("Error al eliminar el documento");
    }
  };

  const handlePublish = async () => {
    if (!confirm("¿Publicar este chatbot? Será visible en el marketplace")) return;
    setIsPublishing(true);
    try {
      const updated = await api.chatbots.publish(chatbotId);
      setChatbot(updated);
    } catch (error) {
      alert("Error al publicar");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!confirm("¿Despublicar este chatbot?")) return;
    setIsPublishing(true);
    try {
      const updated = await api.chatbots.update(chatbotId, { is_published: false } as Partial<Chatbot>);
      setChatbot(updated);
    } catch (error) {
      alert("Error al despublicar");
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Chatbot no encontrado</h2>
          <Link href="/teacher" className="text-blue-600 hover:underline mt-2 block">Volver al panel</Link>
        </div>
      </div>
    );
  }

  const documentStatusLabels: Record<string, string> = {
    queued: "En cola",
    processing: "Procesando",
    indexed: "Indexado",
    error: "Error",
  };

  const documentStatusColors: Record<string, string> = {
    queued: "bg-yellow-100 text-yellow-700",
    processing: "bg-blue-100 text-blue-700",
    indexed: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <Link href="/teacher" className="text-gray-600 hover:text-gray-900">← Volver</Link>
              <span className="text-xl font-semibold">Editar: {chatbot.name}</span>
              <span className={`px-2 py-1 text-xs rounded ${chatbot.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {chatbot.is_published ? "Publicado" : "Borrador"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/chat/${chatbot.id}`} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">Probar</Link>
              {chatbot.is_published ? (
                <button onClick={handleUnpublish} disabled={isPublishing} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">
                  {isPublishing ? "..." : "Despublicar"}
                </button>
              ) : (
                <button onClick={handlePublish} disabled={isPublishing} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {isPublishing ? "..." : "Publicar"}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Configuración</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input id="name" name="name" type="text" value={formData.name} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label htmlFor="subject_area" className="block text-sm font-medium text-gray-700 mb-1">Área temática *</label>
                <input id="subject_area" name="subject_area" type="text" value={formData.subject_area} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="education_level" className="block text-sm font-medium text-gray-700 mb-1">Nivel</label>
                  <select id="education_level" name="education_level" value={formData.education_level} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="secondary">Secundaria</option>
                    <option value="university">Universidad</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-1">Tono</label>
                  <select id="tone" name="tone" value={formData.tone} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="formal">Formal</option>
                    <option value="friendly">Amigable</option>
                    <option value="technical">Técnico</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="restriction_level" className="block text-sm font-medium text-gray-700 mb-1">Restricción</label>
                  <select id="restriction_level" name="restriction_level" value={formData.restriction_level} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="strict">Estricto</option>
                    <option value="guided">Guiado</option>
                    <option value="open">Abierto</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="llm_provider" className="block text-sm font-medium text-gray-700 mb-1">LLM</label>
                  <select id="llm_provider" name="llm_provider" value={formData.llm_provider} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="gemini">Gemini</option>
                    <option value="claude">Claude</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="welcome_message" className="block text-sm font-medium text-gray-700 mb-1">Mensaje de bienvenida</label>
                <textarea id="welcome_message" name="welcome_message" value={formData.welcome_message || ""} onChange={handleChange}
                  rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label htmlFor="system_prompt_override" className="block text-sm font-medium text-gray-700 mb-1">Instrucciones personalizadas</label>
                <textarea id="system_prompt_override" name="system_prompt_override" value={formData.system_prompt_override || ""} onChange={handleChange}
                  rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar cambios</button>
            </form>
            {chatbot.embed_code && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Código de Embed</h3>
                <textarea readOnly value={chatbot.embed_code} rows={2}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg font-mono" />
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Documentos</h2>
            <div className="mb-6">
              <label className="block">
                <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 cursor-pointer transition-colors">
                  <div className="text-center">
                    {isUploading ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    ) : (
                      <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    )}
                    <p className="text-sm text-gray-500">{isUploading ? "Subiendo..." : "Arrastra o haz clic para subir documentos"}</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, DOCX, MD, TXT (máx 20MB)</p>
                  </div>
                </div>
                <input type="file" accept=".pdf,.docx,.md,.txt" onChange={handleFileUpload} className="hidden" disabled={isUploading} />
              </label>
            </div>
            {documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No hay documentos subidos</p>
                <p className="text-sm">Sube documentos PDF o DOCX para entrenar tu chatbot</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.filename}</p>
                        <p className="text-xs text-gray-500">{doc.chunk_count} chunks</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded ${documentStatusColors[doc.status] || "bg-gray-100"}`}>
                        {documentStatusLabels[doc.status] || doc.status}
                      </span>
                      <button onClick={() => handleDeleteDocument(doc.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Eliminar documento">
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
    </div>
  );
}
