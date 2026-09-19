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
    label: "Google Gemma 4 26B Free (Recomendado)",
    description: "Modelo denso de Google DeepMind. Excelente razonamiento, velocidad de respuesta y tareas multilingües.",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    label: "NVIDIA Nemotron 3 Super Free (Alta Capacidad)",
    description: "Modelo MoE de NVIDIA con 1 millón de tokens de contexto, ideal para procesar grandes volúmenes de documentos.",
  },
  {
    id: "liquid/lfm-2.5-1.2b-instruct:free",
    label: "Liquid LFM 2.5 1.2B Free (Ultra Veloz)",
    description: "Modelo ultra veloz y preciso para tareas de respuesta a preguntas rápidas y chat fluido.",
  },
  {
    id: "baidu/cobuddy:free",
    label: "Baidu Qianfan CoBuddy Free",
    description: "Modelo optimizado por Baidu para tareas analíticas y agentes inteligentes interactivos.",
  },
  {
    id: "openai/gpt-oss-120b:free",
    label: "OpenAI gpt-oss-120b Free",
    description: "Modelo MoE libre y optimizado compatible con flujos de razonamiento y respuestas lógicas estructuradas.",
  },
  {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    label: "NVIDIA Nemotron 3 Nano Free",
    description: "Modelo ultra optimizado y ligero de NVIDIA, ideal para respuestas rápidas y concisas.",
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
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
      setMessage("Configuración guardada exitosamente");

      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Error al guardar perfil");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTestUser = user.email.endsWith("@edurag.com");
  const selectedModelInfo = OPENROUTER_MODELS.find((m) => m.id === formData.openrouterModel);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-brand-600 selection:text-white">
      <Navbar
        variant="teacher"
        backTo="/teacher"
        backLabel="Volver al panel"
        title="Configuración de Perfil"
        actions={
          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="px-3 py-1.5 text-zinc-500 hover:text-red-700 hover:bg-red-50 rounded-lg font-semibold text-xs transition-colors"
          >
            Cerrar sesión
          </button>
        }
      />

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 font-display tracking-tight">Configuración del Docente</h1>
          <p className="text-zinc-500 text-xs sm:text-sm mt-1">
            Gestiona tus datos personales y tu motor de inferencia OpenRouter (BYOK)
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Columna Izquierda: Información de la Cuenta */}
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm space-y-4">
              <h2 className="font-bold text-xs uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                <svg className="w-4 h-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Cuenta
              </h2>
              <div className="space-y-3 text-xs text-zinc-600">
                <div>
                  <span className="text-[11px] text-zinc-400 block">Correo de Acceso</span>
                  <strong className="text-zinc-900 font-medium">{user.email}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400 block">Rol en el Sistema</span>
                  <strong className="text-zinc-900 font-medium">Docente Autorizado</strong>
                </div>
                <div className="pt-2 border-t border-zinc-100">
                  <span className="text-[11px] text-zinc-400 block">Autenticación</span>
                  <strong className="text-zinc-900 capitalize font-medium">{user.auth_method.replace("_", " ")}</strong>
                </div>
              </div>
            </div>

            {/* Aviso de API Key */}
            <div
              className={`rounded-xl border p-5 shadow-sm text-xs leading-relaxed ${
                isTestUser ? "bg-indigo-50/50 border-indigo-100 text-indigo-900" : "bg-amber-50/60 border-amber-200 text-amber-900"
              }`}
            >
              <h3 className="font-bold mb-1.5 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isTestUser ? "Modo Demostración" : "API Key Requerida"}
              </h3>
              <p className="text-[11px] opacity-90">
                {isTestUser ? (
                  "Cuenta de demostración institucional. Puedes usar la clave del sistema o conectar tu propia key para pruebas."
                ) : (
                  "Para garantizar el costo $0/mes, cada docente provee su propia API Key de OpenRouter (modelos gratuitos)."
                )}
              </p>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold underline underline-offset-2 hover:opacity-80"
              >
                Obtén tu API Key gratis en OpenRouter ↗
              </a>
            </div>

            {/* Info del modelo seleccionado */}
            {selectedModelInfo && (
              <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-500 mb-1">
                  Modelo Seleccionado
                </h3>
                <p className="text-xs font-semibold text-brand-700">{selectedModelInfo.label}</p>
                <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{selectedModelInfo.description}</p>
              </div>
            )}
          </div>

          {/* Columna Derecha: Formulario */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-5">
              <h2 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-3">
                Datos del Docente
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-xs font-semibold text-zinc-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-zinc-900 text-xs sm:text-sm transition-all"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-xs font-semibold text-zinc-700 mb-1">
                    Apellido *
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-zinc-900 text-xs sm:text-sm transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="institution" className="block text-xs font-semibold text-zinc-700 mb-1">
                    Institución *
                  </label>
                  <input
                    id="institution"
                    name="institution"
                    type="text"
                    value={formData.institution}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-zinc-900 text-xs sm:text-sm transition-all"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="country" className="block text-xs font-semibold text-zinc-700 mb-1">
                    País
                  </label>
                  <input
                    id="country"
                    name="country"
                    type="text"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-zinc-900 text-xs sm:text-sm transition-all"
                    placeholder="Ej: Colombia"
                  />
                </div>
              </div>

              {/* Sección OpenRouter */}
              <h2 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-3 pt-2">
                Configuración de OpenRouter (BYOK)
              </h2>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="openrouterApiKey" className="block text-xs font-semibold text-zinc-700">
                      API Key de OpenRouter
                    </label>
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-brand-600 hover:underline font-medium"
                    >
                      Obtener gratis ↗
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      id="openrouterApiKey"
                      name="openrouterApiKey"
                      type={showApiKey ? "text" : "password"}
                      value={formData.openrouterApiKey}
                      onChange={handleChange}
                      className="w-full pl-3.5 pr-20 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-zinc-900 font-mono text-xs transition-all"
                      placeholder="sk-or-v1-..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800"
                    >
                      {showApiKey ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Cifrada con Fernet (AES-128-CBC) en el servidor. Nunca se expone en texto plano.
                  </p>
                </div>

                <div>
                  <label htmlFor="openrouterModel" className="block text-xs font-semibold text-zinc-700 mb-1">
                    Modelo de Inferencia Activo
                  </label>
                  <select
                    id="openrouterModel"
                    name="openrouterModel"
                    value={formData.openrouterModel}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-zinc-900 text-xs sm:text-sm transition-all bg-white"
                  >
                    {OPENROUTER_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {message && (
                <div
                  className={`text-xs p-3 rounded-lg border ${
                    isError
                      ? "text-red-700 bg-red-50 border-red-200"
                      : "text-emerald-700 bg-emerald-50 border-emerald-200"
                  } animate-in fade-in duration-150`}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold text-xs sm:text-sm btn-press shadow-sm disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? "Guardando..." : "Guardar Configuración"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

