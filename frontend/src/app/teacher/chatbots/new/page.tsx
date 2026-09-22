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
    <div className="min-h-screen bg-[#07080c] flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar
        variant="teacher"
        backTo="/teacher"
        backLabel="Volver al panel"
        title="Crear Nuevo Tutor"
      />

      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 relative z-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-[11px] font-mono uppercase tracking-wider mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 led-pulse" aria-hidden="true" />
            Configuración de Directivas
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
            Nuevo Tutor Pedagógico
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Define la identidad, el rigor conceptual y las políticas de interacción de tu asistente educativo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel specular-highlight rounded-2xl p-6 sm:p-8 space-y-6 border border-white/10 shadow-2xl">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                Nombre del tutor *
                <HelpTooltip text="Nombre descriptivo con el que tus estudiantes identificarán a este tutor. Ej: Tutor de Matemáticas 101." />
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none text-xs sm:text-sm text-white placeholder-slate-500 transition-all font-sans"
                placeholder="Ej: Tutor de Cálculo Diferencial"
                required
              />
            </div>

            <div>
              <label htmlFor="subject_area" className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                Área temática o materia *
                <HelpTooltip text="Materia o disciplina académica principal. Ej: Cálculo Diferencial, Química Orgánica." />
              </label>
              <input
                id="subject_area"
                name="subject_area"
                type="text"
                value={formData.subject_area}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none text-xs sm:text-sm text-white placeholder-slate-500 transition-all font-sans"
                placeholder="Ej: Matemáticas Universitarias"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                Nivel educativo
                <HelpTooltip text="Secundaria prioriza analogías didácticas; Universidad profundiza en rigor conceptual y demostraciones." />
              </label>
              <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Nivel educativo">
                {([
                  { value: "secondary", label: "Secundaria", desc: "Didáctica y lenguaje claro" },
                  { value: "university", label: "Universidad", desc: "Rigor conceptual y formal" },
                ] as const).map((opt) => {
                  const selected = formData.education_level === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setFormData((prev) => ({ ...prev, education_level: opt.value }))}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 btn-press ${
                        selected
                          ? "border-indigo-500/80 bg-indigo-950/60 text-white shadow-lg shadow-indigo-950/40"
                          : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <h4 className="font-bold text-xs font-display flex items-center justify-between">
                        {opt.label}
                        {selected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 led-pulse" />}
                      </h4>
                      <p className={`text-[10px] leading-tight ${selected ? "text-indigo-200" : "text-slate-500"}`}>
                        {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                Tono pedagógico
                <HelpTooltip text="Define la actitud del asistente hacia los estudiantes durante las explicaciones." />
              </label>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tono pedagógico">
                {([
                  { value: "friendly", label: "Amigable", desc: "Empático" },
                  { value: "formal", label: "Formal", desc: "Respetuoso" },
                  { value: "technical", label: "Técnico", desc: "Preciso" },
                ] as const).map((t) => {
                  const selected = formData.tone === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setFormData((prev) => ({ ...prev, tone: t.value }))}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 btn-press ${
                        selected
                          ? "border-indigo-500/80 bg-indigo-950/60 text-white shadow-lg shadow-indigo-950/40"
                          : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <h4 className="font-bold text-xs font-display">{t.label}</h4>
                      <p className={`text-[10px] mt-1 ${selected ? "text-indigo-200" : "text-slate-500"}`}>{t.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                Nivel de restricción
                <HelpTooltip text="'Estricto' responderá SOLO con el contenido subido. 'Guiado' complementa con explicaciones. 'Abierto' expande temas." />
              </label>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Nivel de restricción">
                {([
                  { value: "strict", label: "Estricto", desc: "Solo contexto" },
                  { value: "guided", label: "Guiado", desc: "Complementa" },
                  { value: "open", label: "Abierto", desc: "Expansivo" },
                ] as const).map((r) => {
                  const selected = formData.restriction_level === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setFormData((prev) => ({ ...prev, restriction_level: r.value }))}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 btn-press ${
                        selected
                          ? "border-indigo-500/80 bg-indigo-950/60 text-white shadow-lg shadow-indigo-950/40"
                          : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <h4 className="font-bold text-xs font-display">{r.label}</h4>
                      <p className={`text-[10px] mt-1 ${selected ? "text-indigo-200" : "text-slate-500"}`}>{r.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                Motor LLM
                <HelpTooltip text="Inferencia unificada vía OpenRouter. Soporta hasta 1M tokens de context window." />
              </label>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Motor LLM">
                <button
                  type="button"
                  role="radio"
                  aria-checked={formData.llm_provider === "openrouter"}
                  onClick={() => setFormData((prev) => ({ ...prev, llm_provider: "openrouter" }))}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 btn-press ${
                    formData.llm_provider === "openrouter"
                      ? "border-cyan-500/80 bg-cyan-950/60 text-white shadow-lg shadow-cyan-950/40"
                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <h4 className="font-bold text-xs font-display flex items-center justify-between">
                    OpenRouter
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 led-pulse" />
                  </h4>
                  <p className={`text-[10px] mt-1 ${formData.llm_provider === "openrouter" ? "text-cyan-200" : "text-slate-500"}`}>~1M tokens · BYOK</p>
                </button>
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Próximamente disponible"
                  className="p-2.5 rounded-xl border text-left flex flex-col opacity-35 cursor-not-allowed border-white/10 bg-white/[0.02]"
                >
                  <h4 className="font-bold text-xs text-slate-400 font-display">Claude Native</h4>
                  <p className="text-[10px] text-slate-600 mt-1">Próximamente</p>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label htmlFor="welcome_message" className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                Mensaje de bienvenida (opcional)
                <HelpTooltip text="Primer mensaje que verá el estudiante al iniciar la conversación." />
              </label>
              <textarea
                id="welcome_message"
                name="welcome_message"
                value={formData.welcome_message || ""}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none text-xs sm:text-sm text-white placeholder-slate-500 transition-all font-sans resize-none"
                placeholder="Ej: ¡Hola! Soy el asistente de Cálculo Diferencial. ¿Qué teorema o problema te gustaría resolver hoy?"
              />
            </div>

            <div>
              <label htmlFor="system_prompt_override" className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                Instrucciones pedagógicas personalizadas (opcional)
                <HelpTooltip text="Directivas adicionales que el modelo seguirá obligatoriamente en cada respuesta." />
              </label>
              <textarea
                id="system_prompt_override"
                name="system_prompt_override"
                value={formData.system_prompt_override || ""}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none text-xs sm:text-sm text-white placeholder-slate-500 transition-all font-sans resize-none"
                placeholder="Ej: Aplica el método socrático formulando repreguntas reflexivas. No proporciones el resultado numérico directamente."
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-press px-5 py-2.5 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-xl font-semibold text-xs transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-press flex-1 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl font-semibold text-xs shadow-lg shadow-indigo-950/50 border border-indigo-400/30 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creando tutor pedagógico...
                </>
              ) : (
                "Crear Asistente Pedagógico"
              )}
            </button>
          </div>
        </form>
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
