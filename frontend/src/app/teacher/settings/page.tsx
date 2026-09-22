"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { useRequireRole } from "@/hooks/useRequireRole";
import { api } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { Spinner } from "@/components/Spinner";
import type { User } from "@/lib/types";

const OPENROUTER_MODELS = [
  {
    id: "google/gemma-4-26b-a4b-it:free",
    label: "Google Gemma 4 26B Free",
    badge: "RECOMENDADO",
    description: "Modelo denso de Google DeepMind. Extraordinario razonamiento conceptual, latencia baja y precisión multilingüe.",
    contextWindow: "128k tokens",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    label: "NVIDIA Nemotron 3 Super Free",
    badge: "ALTA CAPACIDAD",
    description: "Modelo MoE de NVIDIA con hasta 1 millón de tokens de contexto, ideal para indexar cursos completos y tesis.",
    contextWindow: "1M tokens",
  },
  {
    id: "liquid/lfm-2.5-1.2b-instruct:free",
    label: "Liquid LFM 2.5 1.2B Free",
    badge: "ULTRA VELOZ",
    description: "Arquitectura híbrida de tiempo continuo. Respuestas instantáneas y máxima fluidez en interacciones socráticas.",
    contextWindow: "32k tokens",
  },
  {
    id: "baidu/cobuddy:free",
    label: "Baidu Qianfan CoBuddy Free",
    badge: "ANALÍTICO",
    description: "Optimizado para resolución de ejercicios cuantitativos y agentes de tutoría paso a paso.",
    contextWindow: "64k tokens",
  },
  {
    id: "openai/gpt-oss-120b:free",
    label: "OpenAI gpt-oss-120b Free",
    badge: "ESTRUCTURADO",
    description: "Modelo abierto de alta precisión lógica y generación estructurada de explicaciones académicas.",
    contextWindow: "128k tokens",
  },
  {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    label: "NVIDIA Nemotron 3 Nano Free",
    badge: "EFICIENTE",
    description: "Inferencia ultraligera para respuestas concisas y tutoría directa en dispositivos de bajo ancho de banda.",
    contextWindow: "32k tokens",
  },
];

function extractUserData(user: User | null) {
  if (!user) {
    return {
      firstName: "",
      lastName: "",
      institution: "",
      country: "",
      openrouterApiKey: "",
      openrouterModel: OPENROUTER_MODELS[0].id,
    };
  }
  let firstName = user.firstName || "";
  let lastName = user.lastName || "";
  let institution = user.institutionName || "";
  let openrouterApiKey = user.openrouterApiKey || "";
  let openrouterModel = user.openrouterModel || OPENROUTER_MODELS[0].id;

  if (!firstName && !lastName && !institution && user.institution && user.institution.includes(" | ")) {
    const parts = user.institution.split(" | ");
    const fullName = parts[0] || "";
    institution = parts[1] || "";
    openrouterApiKey = parts[2] || "";
    openrouterModel = parts[3] || OPENROUTER_MODELS[0].id;

    const nameParts = fullName.trim().split(" ");
    firstName = nameParts[0] || "";
    lastName = nameParts.slice(1).join(" ") || "";
  }

  return {
    firstName,
    lastName,
    institution,
    country: user.country || "",
    openrouterApiKey,
    openrouterModel: openrouterModel || OPENROUTER_MODELS[0].id,
  };
}

export default function TeacherSettingsPage() {
  const { auth, logout, updateUser } = useApp();
  const router = useRouter();
  const { isAuthorized, isChecking } = useRequireRole("teacher");
  const [formData, setFormData] = useState(() => extractUserData(auth.user));
  const [loadedUserId, setLoadedUserId] = useState<string | null>(() => auth.user?.id ?? null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  if (auth.user && auth.user.id !== loadedUserId) {
    setLoadedUserId(auth.user.id);
    setFormData(extractUserData(auth.user));
  }

  if (isChecking || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07080c]">
        <Spinner />
      </div>
    );
  }

  const user = auth.user!;
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setIsError(false);

    try {
      const updatedUser = await api.auth.updateProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        institution: formData.institution.trim(),
        country: formData.country.trim() || undefined,
        openrouterApiKey: formData.openrouterApiKey.trim() || undefined,
        openrouterModel: formData.openrouterModel || undefined,
      });

      updateUser(updatedUser);
      setMessage("Configuración guardada y cifrada correctamente en el servidor.");

      setTimeout(() => setMessage(""), 4000);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Error al guardar perfil");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTestUser = user.email.endsWith("@edurag.com");

  return (
    <div className="min-h-screen bg-[#07080c] flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar
        variant="teacher"
        backTo="/teacher"
        backLabel="Volver al panel"
        title="Configuración & Inferencia BYOK"
        actions={
          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="btn-press px-3 py-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl font-semibold text-xs transition-all"
          >
            Cerrar sesión
          </button>
        }
      />

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 relative z-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-[11px] font-mono uppercase tracking-wider mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 led-pulse" aria-hidden="true" />
            Bóveda de Credenciales & Modelos
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
            Configuración del Docente
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Administra tus datos institucionales y calibra tu motor de inferencia LLM con arquitectura BYOK ($0 costo operativo).
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Columna Izquierda: Información de la Cuenta & Seguridad (1 col) */}
          <div className="md:col-span-1 space-y-4">
            <div className="glass-panel specular-highlight rounded-2xl border border-white/10 p-5 shadow-2xl space-y-4">
              <h2 className="font-bold text-xs uppercase tracking-wider font-mono text-indigo-300 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Cuenta Docente
              </h2>
              <div className="space-y-3 text-xs text-slate-300">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">Correo Institucional</span>
                  <strong className="text-white font-mono">{user.email}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">Rol del Sistema</span>
                  <strong className="text-white">Docente Titular</strong>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">Método de Firma</span>
                  <strong className="text-white capitalize font-mono text-[11px]">{user.auth_method.replace("_", " ")}</strong>
                </div>
              </div>
            </div>

            {/* Tarjeta BYOK / Info Fernet */}
            <div className="glass-panel rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-5 shadow-2xl text-xs leading-relaxed">
              <h3 className="font-bold text-cyan-300 mb-1.5 flex items-center gap-1.5 font-display">
                <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                {isTestUser ? "Modo Demostración Activo" : "Arquitectura BYOK $0/mes"}
              </h3>
              <p className="text-[11px] text-slate-300">
                {isTestUser
                  ? "Cuenta de demostración institucional con cuota del sistema. Puedes vincular tu propia API key para pruebas extendidas."
                  : "Tu clave de API se cifra con Fernet (AES-128-CBC) en el backend y solo se descifra en memoria durante la inferencia."}
              </p>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
              >
                Generar API Key gratis en OpenRouter ↗
              </a>
            </div>
          </div>

          {/* Columna Derecha: Formulario de Perfil & Modelos (2 cols) */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="glass-panel specular-highlight rounded-2xl border border-white/10 p-6 sm:p-8 shadow-2xl space-y-6">
              <div>
                <h2 className="text-sm font-bold text-white font-display border-b border-white/10 pb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Datos Institucionales
                </h2>
                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label htmlFor="firstName" className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                      Nombre *
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none text-white text-xs sm:text-sm font-sans transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                      Apellido *
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none text-white text-xs sm:text-sm font-sans transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label htmlFor="institution" className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                      Institución Educativa *
                    </label>
                    <input
                      id="institution"
                      name="institution"
                      type="text"
                      value={formData.institution}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none text-white text-xs sm:text-sm font-sans transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="country" className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                      País
                    </label>
                    <input
                      id="country"
                      name="country"
                      type="text"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none text-white text-xs sm:text-sm font-sans transition-all"
                      placeholder="Ej: Colombia"
                    />
                  </div>
                </div>
              </div>

              {/* Sección OpenRouter BYOK */}
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h2 className="text-sm font-bold text-white font-display flex items-center gap-2">
                    <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Bóveda de Clave OpenRouter (BYOK)
                  </h2>
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Obtener clave gratis ↗
                  </a>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="openrouterApiKey" className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                      API Key Personal
                    </label>
                    <div className="relative">
                      <input
                        id="openrouterApiKey"
                        name="openrouterApiKey"
                        type={showApiKey ? "text" : "password"}
                        value={formData.openrouterApiKey}
                        onChange={handleChange}
                        className="w-full pl-3.5 pr-20 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none text-white font-mono text-xs transition-all"
                        placeholder="sk-or-v1-..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="btn-press absolute right-2.5 top-2.5 text-xs font-mono text-slate-400 hover:text-white px-2 py-0.5 rounded-md bg-white/[0.05]"
                      >
                        {showApiKey ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>
                    <p className="text-[10px] font-mono text-slate-400 mt-1.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Cifrado asimétrico simétrico Fernet (AES-128). Nunca viaja en texto plano.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2">
                      Selecciona tu Modelo de Inferencia Activo
                    </label>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {OPENROUTER_MODELS.map((model) => {
                        const isSelected = formData.openrouterModel === model.id;
                        return (
                          <div
                            key={model.id}
                            onClick={() => setFormData((prev) => ({ ...prev, openrouterModel: model.id }))}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between btn-press ${
                              isSelected
                                ? "border-cyan-500/80 bg-cyan-950/40 shadow-lg shadow-cyan-950/40"
                                : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1.5">
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                                  isSelected
                                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                                    : "bg-white/[0.04] text-slate-400 border-white/10"
                                }`}>
                                  {model.badge}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">{model.contextWindow}</span>
                              </div>
                              <h4 className="font-bold text-xs text-white font-display">{model.label}</h4>
                              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{model.description}</p>
                            </div>
                            {isSelected && (
                              <div className="mt-2 pt-2 border-t border-cyan-500/20 flex items-center gap-1.5 text-[10px] font-mono text-cyan-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 led-pulse" />
                                Modelo Activo para tus Chatbots
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {message && (
                <div
                  className={`text-xs p-3.5 rounded-xl border ${
                    isError
                      ? "text-rose-300 bg-rose-950/50 border-rose-500/40"
                      : "text-emerald-300 bg-emerald-950/50 border-emerald-500/40"
                  } animate-in fade-in duration-200 font-mono`}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-press w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-950/50 border border-indigo-400/30 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Guardando credenciales...
                  </>
                ) : (
                  "Guardar y Actualizar Motor de Inferencia"
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
