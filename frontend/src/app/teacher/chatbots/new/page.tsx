"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import type { Chatbot, CreateChatbotData } from "@/lib/types";

export default function NewChatbotPage() {
  const [formData, setFormData] = useState<CreateChatbotData>({
    name: "",
    subject_area: "",
    education_level: "secondary",
    tone: "friendly",
    restriction_level: "guided",
    llm_provider: "gemini",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const chatbot = await api.chatbots.create(formData);
      router.push(`/teacher/chatbots/${chatbot.id}`);
    } catch (error) {
      console.error("Error creating chatbot:", error);
      alert("Error al crear el chatbot");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      <Navbar
        variant="teacher"
        backTo="/teacher"
        backLabel="Volver al panel"
        title="Nuevo Chatbot"
      />

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { HelpTooltip } from "@/components/HelpTooltip";
import type { Chatbot, CreateChatbotData } from "@/lib/types";

export default function NewChatbotPage() {
  const [formData, setFormData] = useState<CreateChatbotData>({
    name: "",
    subject_area: "",
    education_level: "secondary",
    tone: "friendly",
    restriction_level: "guided",
    llm_provider: "gemini",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const chatbot = await api.chatbots.create(formData);
      router.push(`/teacher/chatbots/${chatbot.id}`);
    } catch (error) {
      console.error("Error creating chatbot:", error);
      alert("Error al crear el chatbot");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      <Navbar
        variant="teacher"
        backTo="/teacher"
        backLabel="Volver al panel"
        title="Nuevo Chatbot"
      />

      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-8 space-y-6 shadow-sm">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center">
              Nombre del chatbot *
              <HelpTooltip text="Nombre descriptivo con el que tus estudiantes identificarán a este tutor. Ej: Tutor de Matemáticas 101." />
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
              placeholder="Ej: Tutor de Matemáticas"
              required
            />
          </div>

          <div>
            <label htmlFor="subject_area" className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center">
              Área temática *
              <HelpTooltip text="Tema principal del conocimiento. Ej: Álgebra Lineal, Geografía, etc." />
            </label>
            <input
              id="subject_area"
              name="subject_area"
              type="text"
              value={formData.subject_area}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
              placeholder="Ej: Cálculo Diferencial"
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                Nivel educativo
                <HelpTooltip text="Elige el nivel de complejidad didáctica del tutor. 'Secundaria' usará analogías sencillas y lenguaje claro. 'Universidad' abordará tecnicismos y rigor académico." />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, education_level: "secondary" }))}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                    formData.education_level === "secondary"
                      ? "border-brand-600 bg-brand-50/40 shadow-sm"
                      : "border-gray-200 hover:bg-gray-50/50"
                  }`}
                >
                  <span className="text-xl">🏫</span>
                  <div>
                    <h4 className="font-bold text-xs text-gray-900 leading-none">Secundaria</h4>
                    <p className="text-[10px] text-gray-400 mt-1">didáctica y motivadora</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, education_level: "university" }))}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                    formData.education_level === "university"
                      ? "border-brand-600 bg-brand-50/40 shadow-sm"
                      : "border-gray-200 hover:bg-gray-50/50"
                  }`}
                >
                  <span className="text-xl">🎓</span>
                  <div>
                    <h4 className="font-bold text-xs text-gray-900 leading-none">Universidad</h4>
                    <p className="text-[10px] text-gray-400 mt-1">rigor conceptual y académico</p>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                Tono de comunicación
                <HelpTooltip text="El tono influye en la empatía y relación del tutor con el estudiante. 'Amigable' es motivador; 'Formal' es respetuoso; 'Técnico' es preciso y directo." />
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { value: "friendly", label: "Amigable", desc: "Empático", emoji: "😊" },
                  { value: "formal", label: "Formal", desc: "Respetuoso", emoji: "👔" },
                  { value: "technical", label: "Técnico", desc: "Preciso", emoji: "🔬" }
                ].map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tone: t.value as any }))}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                      formData.tone === t.value
                        ? "border-brand-600 bg-brand-50/40 shadow-sm"
                        : "border-gray-200 hover:bg-gray-50/50"
                    }`}
                  >
                    <span className="text-lg">{t.emoji}</span>
                    <div>
                      <h4 className="font-bold text-xs text-gray-900 leading-none">{t.label}</h4>
                      <p className="text-[9px] text-gray-400 mt-0.5">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                Nivel de restricción
                <HelpTooltip text="'Estricto' responderá SOLO con tus documentos (0 alucinaciones). 'Guiado' usará tus documentos e introducirá explicaciones didácticas. 'Abierto' responderá de manera libre combinando tus documentos con conocimiento global." />
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { value: "strict", label: "Estricto", desc: "Solo contexto", emoji: "🔒" },
                  { value: "guided", label: "Guiado", desc: "Complementa", emoji: "🧭" },
                  { value: "open", label: "Abierto", desc: "Expansivo", emoji: "🌐" }
                ].map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, restriction_level: r.value as any }))}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                      formData.restriction_level === r.value
                        ? "border-brand-600 bg-brand-50/40 shadow-sm"
                        : "border-gray-200 hover:bg-gray-50/50"
                    }`}
                  >
                    <span className="text-lg">{r.emoji}</span>
                    <div>
                      <h4 className="font-bold text-xs text-gray-900 leading-none">{r.label}</h4>
                      <p className="text-[9px] text-gray-400 mt-0.5">{r.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                Proveedor LLM
                <HelpTooltip text="Motor de inteligencia artificial activo. Gemini 2.0 Flash es el motor predeterminado y gratuito del RAG. Claude es una opción para el futuro." />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, llm_provider: "gemini" }))}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                    formData.llm_provider === "gemini"
                      ? "border-brand-600 bg-brand-50/40 shadow-sm"
                      : "border-gray-200 hover:bg-gray-50/50"
                  }`}
                >
                  <span className="text-xl">✨</span>
                  <div>
                    <h4 className="font-bold text-xs text-gray-900 leading-none">Gemini (RAG)</h4>
                    <p className="text-[10px] text-gray-400 mt-1">1M tokens · Gratuito</p>
                  </div>
                </button>
                <button
                  type="button"
                  disabled
                  className="p-4 rounded-xl border text-left flex flex-col gap-1.5 opacity-50 cursor-not-allowed border-gray-100 bg-gray-50/20"
                >
                  <span className="text-xl">🔒</span>
                  <div>
                    <h4 className="font-bold text-xs text-gray-400 leading-none">Claude</h4>
                    <p className="text-[10px] text-gray-400 mt-1">Próximamente</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="welcome_message" className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center">
              Mensaje de bienvenida (opcional)
              <HelpTooltip text="Mensaje que enviará el tutor al abrirse la conversación por primera vez." />
            </label>
            <textarea
              id="welcome_message"
              name="welcome_message"
              value={formData.welcome_message || ""}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
              placeholder="Ej: ¡Hola! Soy tu tutor virtual para la clase de Cálculo. ¿En qué duda puedo ayudarte hoy?"
            />
          </div>

          <div>
            <label htmlFor="system_prompt_override" className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center">
              Instrucciones personalizadas (opcional)
              <HelpTooltip text="Instrucciones directas de comportamiento pedagógico que el bot debe seguir obligatoriamente." />
            </label>
            <textarea
              id="system_prompt_override"
              name="system_prompt_override"
              value={formData.system_prompt_override || ""}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
              placeholder="Ej: Fomenta el método socrático. Nunca les des las respuestas de forma directa; en su lugar, guíalos paso a paso haciéndoles preguntas analíticas."
            />
          </div>

          <div className="flex gap-4 pt-6 border-t border-gray-100 mt-8">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold text-sm shadow-sm transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-2.5 bg-brand-600 text-white hover:bg-brand-700 rounded-xl font-bold text-sm shadow transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Creando..." : "Crear Chatbot"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
