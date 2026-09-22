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
    description: "Modelo de Google DeepMind. Razonamiento conceptual sólido, baja latencia y alta fidelidad en español.",
    contextWindow: "128k tokens",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    label: "NVIDIA Nemotron 3 Super Free",
    badge: "ALTA CAPACIDAD",
    description: "Modelo MoE de NVIDIA con ventana amplia de contexto, ideal para procesar libros y cursos extensos.",
    contextWindow: "1M tokens",
  },
  {
    id: "liquid/lfm-2.5-1.2b-instruct:free",
    label: "Liquid LFM 2.5 1.2B Free",
    badge: "RÁPIDO",
    description: "Arquitectura híbrida de tiempo continuo con respuestas ágiles para interacciones conversacionales continuas.",
    contextWindow: "32k tokens",
  },
  {
    id: "baidu/cobuddy:free",
    label: "Baidu Qianfan CoBuddy Free",
    badge: "ANALÍTICO",
    description: "Diseñado para resolución de problemas paso a paso y formulación de explicaciones guiadas.",
    contextWindow: "64k tokens",
  },
  {
    id: "openai/gpt-oss-120b:free",
    label: "OpenAI gpt-oss-120b Free",
    badge: "ESTRUCTURADO",
    description: "Modelo abierto de alta precisión lógica y respuestas didácticas estructuradas.",
    contextWindow: "128k tokens",
  },
  {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    label: "NVIDIA Nemotron 3 Nano Free",
    badge: "LIGERO",
    description: "Inferencia ágil para respuestas directas y bajo consumo de ancho de banda.",
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
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
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
      setMessage("Configuración guardada y cifrada correctamente.");

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
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-100">
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
            className="btn-press px-3 py-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg font-medium text-xs transition-colors"
          >
            Cerrar sesión
          </button>
        }
      />

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">
            Configuración del Docente
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Administra tus datos institucionales y calibra tu motor de inferencia con arquitectura BYOK ($0 costo operativo).
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Columna Izquierda: Información de la Cuenta & Seguridad (1 col) */}
          <div className="md:col-span-1 space-y-4">
            <div className="card-clean rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-5 space-y-4">
              <h2 className="font-semibold text-xs uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Cuenta Docente
              </h2>
              <div className="space-y-3 text-xs text-zinc-300">
                <div>
                  <span className="text-[10px] uppercase text-zinc-500 block mb-0.5">Correo Institucional</span>
                  <strong className="text-zinc-100 font-mono">{user.email}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-zinc-500 block mb-0.5">Rol del Sistema</span>
                  <strong className="text-zinc-100">Docente Titular</strong>
                </div>
                <div className="pt-2 border-t border-zinc-800/60">
                  <span className="text-[10px] uppercase text-zinc-500 block mb-0.5">Método de Firma</span>
                  <strong className="text-zinc-100 capitalize text-[11px]">{user.auth_method.replace("_", " ")}</strong>
                </div>
              </div>
            </div>

            {/* Tarjeta BYOK / Info Fernet */}
            <div className="card-clean rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-5 text-xs leading-relaxed">
              <h3 className="font-semibold text-zinc-200 mb-1.5 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-zinc-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                {isTestUser ? "Modo Demostración Activo" : "Arquitectura BYOK $0/mes"}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {isTestUser
                  ? "Cuenta de demostración institucional con cuota del sistema. Puedes vincular tu propia API key para pruebas extendidas."
                  : "Tu clave de API se cifra con Fernet (AES-128-CBC) en el backend y solo se descifra en memoria durante la inferencia."}
              </p>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white underline underline-offset-2 transition-colors"
              >
                Generar API Key gratis en OpenRouter ↗
              </a>
            </div>
          </div>

          {/* Columna Derecha: Formulario de Perfil & Modelos (2 cols) */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="card-clean rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100 border-b border-zinc-800/80 pb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Datos Institucionales
                </h2>
                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label htmlFor="firstName" className="block text-xs font-medium text-zinc-300 mb-1">
                      Nombre *
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none text-zinc-100 text-xs sm:text-sm font-sans transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-xs font-medium text-zinc-300 mb-1">
                      Apellido *
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none text-zinc-100 text-xs sm:text-sm font-sans transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label htmlFor="institution" className="block text-xs font-medium text-zinc-300 mb-1">
                      Institución Educativa *
                    </label>
                    <input
                      id="institution"
                      name="institution"
                      type="text"
                      value={formData.institution}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none text-zinc-100 text-xs sm:text-sm font-sans transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="country" className="block text-xs font-medium text-zinc-300 mb-1">
                      País
                    </label>
                    <input
                      id="country"
                      name="country"
                      type="text"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none text-zinc-100 text-xs sm:text-sm font-sans transition-colors"
                      placeholder="Ej: Colombia"
                    />
                  </div>
                </div>
              </div>

              {/* Sección OpenRouter BYOK */}
              <div>
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Clave OpenRouter (BYOK)
                  </h2>
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Obtener clave gratis ↗
                  </a>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="openrouterApiKey" className="block text-xs font-medium text-zinc-300 mb-1.5">
                      API Key Personal
                    </label>
                    <div className="relative">
                      <input
                        id="openrouterApiKey"
                        name="openrouterApiKey"
                        type={showApiKey ? "text" : "password"}
                        value={formData.openrouterApiKey}
                        onChange={handleChange}
                        className="w-full pl-3.5 pr-20 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 outline-none text-zinc-100 font-mono text-xs transition-colors"
                        placeholder="sk-or-v1-..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="btn-press absolute right-2.5 top-2.5 text-xs text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded bg-zinc-800 transition-colors"
                      >
                        {showApiKey ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Cifrado Fernet (AES-128). Nunca viaja en texto plano.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-2">
                      Selecciona tu Modelo de Inferencia Activo
                    </label>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {OPENROUTER_MODELS.map((model) => {
                        const isSelected = formData.openrouterModel === model.id;
                        return (
                          <div
                            key={model.id}
                            onClick={() => setFormData((prev) => ({ ...prev, openrouterModel: model.id }))}
                            className={`p-3.5 rounded-xl border transition-colors cursor-pointer select-none flex flex-col justify-between btn-press ${
                              isSelected
                                ? "border-zinc-600 bg-zinc-800/80 shadow-sm"
                                : "border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-zinc-700"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1.5">
                                <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${
                                  isSelected
                                    ? "bg-zinc-700 text-zinc-200 border-zinc-600"
                                    : "bg-zinc-950 text-zinc-400 border-zinc-800"
                                }`}>
                                  {model.badge}
                                </span>
                                <span className="text-[10px] text-zinc-500 font-mono">{model.contextWindow}</span>
                              </div>
                              <h4 className="font-medium text-xs text-zinc-100">{model.label}</h4>
                              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{model.description}</p>
                            </div>
                            {isSelected && (
                              <div className="mt-2 pt-2 border-t border-zinc-700/60 flex items-center gap-1.5 text-[10px] text-zinc-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
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
                  className={`text-xs p-3.5 rounded-lg border ${
                    isError
                      ? "text-rose-300 bg-rose-950/40 border-rose-500/40"
                      : "text-emerald-300 bg-emerald-950/40 border-emerald-500/40"
                  }`}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-press w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg font-medium text-xs sm:text-sm transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
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
