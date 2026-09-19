"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { HelpTooltip } from "@/components/HelpTooltip";
import { ToastContainer, useToast } from "@/components/Toast";
import type { CreateChatbotData } from "@/lib/types";

export default function NewChatbotPage() {
  const [formData, setFormData] = useState<CreateChatbotData>({
    name: "",
    subject_area: "",
    education_level: "secondary",
    tone: "friendly",
    restriction_level: "guided",
    llm_provider: "openrouter",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toasts, toast, removeToast } = useToast();

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
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo crear el chatbot. Inténtalo de nuevo."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-brand-600 selection:text-white">
      <Navbar
        variant="teacher"
        backTo="/teacher"
        backLabel="Volver al panel"
        title="Crear Nuevo Chatbot"
      />

      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-zinc-950 font-display tracking-tight">Nuevo Tutor Pedagógico</h1>
          <p className="text-zinc-500 text-xs sm:text-sm mt-1">Configura las directivas de comportamiento y el nivel de rigor didáctico</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-zinc-200 p-6 sm:p-8 space-y-6 shadow-sm">
          <div>
            <label htmlFor="name" className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center">
              Nombre del chatbot *
              <HelpTooltip text="Nombre descriptivo con el que tus estudiantes identificarán a este tutor. Ej: Tutor de Matemáticas 101." />
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-xs sm:text-sm text-zinc-900 transition-all"
              placeholder="Ej: Tutor de Cálculo I"
              required
            />
          </div>

          <div>
            <label htmlFor="subject_area" className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center">
              Área temática o materia *
              <HelpTooltip text="Materia o disciplina académica principal. Ej: Cálculo Diferencial, Química Orgánica." />
            </label>
            <input
              id="subject_area"
              name="subject_area"
              type="text"
              value={formData.subject_area}
              onChange={handleChange}
              className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-xs sm:text-sm text-zinc-900 transition-all"
              placeholder="Ej: Matemáticas Universitarias"
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-2 flex items-center">
                Nivel educativo
                <HelpTooltip text="Secundaria prioriza analogías didácticas; Universidad profundiza en rigor conceptual y demostraciones." />
              </label>
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Nivel educativo">
                {([
                  { value: "secondary", label: "Secundaria", desc: "Didáctica y lenguaje claro" },
                  { value: "university", label: "Universidad", desc: "Rigor conceptual y técnico" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={formData.education_level === opt.value}
                    onClick={() => setFormData((prev) => ({ ...prev, education_level: opt.value }))}
                    className={`p-3 rounded-lg border text-left transition-all flex flex-col gap-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1 ${
                      formData.education_level === opt.value
                        ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <h4 className="font-bold text-xs leading-none">{opt.label}</h4>
                    <p className={`text-[10px] mt-0.5 leading-tight ${formData.education_level === opt.value ? "text-zinc-300" : "text-zinc-400"}`}>
                      {opt.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-2 flex items-center">
                Tono pedagógico
                <HelpTooltip text="Define la actitud del asistente hacia los estudiantes durante las explicaciones." />
              </label>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tono pedagógico">
                {([
                  { value: "friendly", label: "Amigable", desc: "Empático" },
                  { value: "formal", label: "Formal", desc: "Respetuoso" },
                  { value: "technical", label: "Técnico", desc: "Preciso" },
                ] as const).map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={formData.tone === t.value}
                    onClick={() => setFormData((prev) => ({ ...prev, tone: t.value }))}
                    className={`p-2.5 rounded-lg border text-left transition-all flex flex-col cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1 ${
                      formData.tone === t.value
                        ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <h4 className="font-bold text-xs leading-none">{t.label}</h4>
                    <p className={`text-[10px] mt-1 ${formData.tone === t.value ? "text-zinc-300" : "text-zinc-400"}`}>{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-2 flex items-center">
                Nivel de restricción
                <HelpTooltip text="'Estricto' responderá SOLO con el contenido subido. 'Guiado' complementa con explicaciones. 'Abierto' expande temas." />
              </label>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Nivel de restricción">
                {([
                  { value: "strict", label: "Estricto", desc: "Solo contexto" },
                  { value: "guided", label: "Guiado", desc: "Complementa" },
                  { value: "open", label: "Abierto", desc: "Expansivo" },
                ] as const).map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    role="radio"
                    aria-checked={formData.restriction_level === r.value}
                    onClick={() => setFormData((prev) => ({ ...prev, restriction_level: r.value }))}
                    className={`p-2.5 rounded-lg border text-left transition-all flex flex-col cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1 ${
                      formData.restriction_level === r.value
                        ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <h4 className="font-bold text-xs leading-none">{r.label}</h4>
                    <p className={`text-[10px] mt-1 ${formData.restriction_level === r.value ? "text-zinc-300" : "text-zinc-400"}`}>{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-2 flex items-center">
                Motor LLM
                <HelpTooltip text="Inferencia unificada vía OpenRouter. Soporta hasta 1M tokens de context window." />
              </label>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Motor LLM">
                <button
                  type="button"
                  role="radio"
                  aria-checked={formData.llm_provider === "openrouter"}
                  onClick={() => setFormData((prev) => ({ ...prev, llm_provider: "openrouter" }))}
                  className={`p-2.5 rounded-lg border text-left transition-all flex flex-col cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1 ${
                    formData.llm_provider === "openrouter"
                      ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <h4 className="font-bold text-xs leading-none">OpenRouter</h4>
                  <p className={`text-[10px] mt-1 ${formData.llm_provider === "openrouter" ? "text-zinc-300" : "text-zinc-400"}`}>~1M tokens · Free</p>
                </button>
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Próximamente disponible"
                  className="p-2.5 rounded-lg border text-left flex flex-col opacity-40 cursor-not-allowed border-zinc-200 bg-zinc-50"
                >
                  <h4 className="font-bold text-xs text-zinc-400 leading-none">Claude</h4>
                  <p className="text-[10px] text-zinc-400 mt-1">Próximamente</p>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="welcome_message" className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center">
              Mensaje de bienvenida (opcional)
              <HelpTooltip text="Primer mensaje que verá el estudiante al iniciar la conversación." />
            </label>
            <textarea
              id="welcome_message"
              name="welcome_message"
              value={formData.welcome_message || ""}
              onChange={handleChange}
              rows={2}
              className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-xs sm:text-sm text-zinc-900 transition-all resize-none"
              placeholder="Ej: ¡Hola! Soy el asistente de Cálculo. ¿Qué concepto o ejercicio te gustaría revisar?"
            />
          </div>

          <div>
            <label htmlFor="system_prompt_override" className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center">
              Instrucciones pedagógicas personalizadas (opcional)
              <HelpTooltip text="Directivas adicionales que el modelo seguirá obligatoriamente en cada respuesta." />
            </label>
            <textarea
              id="system_prompt_override"
              name="system_prompt_override"
              value={formData.system_prompt_override || ""}
              onChange={handleChange}
              rows={3}
              className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-xs sm:text-sm text-zinc-900 transition-all resize-none"
              placeholder="Ej: Emplea preguntas socráticas. No proporciones el resultado final inmediatamente; guía al estudiante paso a paso."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-lg font-semibold text-xs transition-colors btn-press"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold text-xs shadow-sm btn-press transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Creando tutor..." : "Crear Chatbot"}
            </button>
          </div>
        </form>
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

