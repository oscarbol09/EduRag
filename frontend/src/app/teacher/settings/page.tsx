"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/context";
import { api } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { Spinner } from "@/components/Spinner";

export default function TeacherSettingsPage() {
  const { auth, logout } = useApp();
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    institution: "",
    country: "",
    geminiApiKey: "",
    claudeApiKey: "",
  });
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!auth.isLoading) {
      if (!auth.token) {
        router.push("/login");
      } else if (auth.user) {
        if (auth.user.role !== "teacher") {
          if (auth.user.role === "admin") {
            router.push("/admin");
          } else {
            router.push("/marketplace");
          }
        } else {
          // Parsear los datos del usuario actual
          let firstName = "";
          let lastName = "";
          let institution = auth.user.institution || "";
          let geminiApiKey = "";
          let claudeApiKey = "";

          if (institution.includes(" | ")) {
            const parts = institution.split(" | ");
            const fullName = parts[0] || "";
            institution = parts[1] || "";
            geminiApiKey = parts[2] || "";
            claudeApiKey = parts[3] || "";

            const nameParts = fullName.trim().split(" ");
            firstName = nameParts[0] || "";
            lastName = nameParts.slice(1).join(" ") || "";
          }

          setFormData({
            firstName,
            lastName,
            institution,
            country: auth.user.country || "",
            geminiApiKey,
            claudeApiKey,
          });
        }
      }
    }
  }, [auth.user, auth.token, auth.isLoading]);

  if (auth.isLoading || (auth.token && !auth.user) || !auth.user || auth.user.role !== "teacher") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setIsError(false);

    try {
      await api.auth.updateProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        institution: formData.institution.trim(),
        country: formData.country.trim() || undefined,
        geminiApiKey: formData.geminiApiKey.trim() || undefined,
        claudeApiKey: formData.claudeApiKey.trim() || undefined,
      });
      setMessage("Configuración guardada exitosamente");
      // Forzar la recarga de los datos de usuario en el contexto
      const user = await api.auth.me();
      auth.user = user; // Sincronización rápida
      
      // Auto-ocultar mensaje después de 3 segundos
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Error al guardar perfil");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTestUser = auth.user.email.endsWith("@edurag.com");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        actions={
          <>
            <Link href="/teacher" className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">
              ← Volver al Panel
            </Link>
            <button
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
            >
              Cerrar sesión
            </button>
          </>
        }
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Configuración de Perfil</h1>
          <p className="text-gray-600 mt-1">Gestiona tus datos personales y tus credenciales de modelos de lenguaje (API Keys)</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Columna Izquierda: Información de la Cuenta y Fallback */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>🛡️</span> Cuenta
              </h2>
              <div className="space-y-3 text-sm text-gray-600">
                <div>
                  <span className="text-xs text-gray-400 block">Correo de Acceso</span>
                  <strong className="text-gray-900">{auth.user.email}</strong>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Rol en el Sistema</span>
                  <strong className="text-gray-900">Docente Autorizado</strong>
                </div>
                <div className="pt-2 border-t border-gray-50">
                  <span className="text-xs text-gray-400 block">Autenticación</span>
                  <strong className="text-gray-950 capitalize">{auth.user.auth_method.replace("_", " ")}</strong>
                </div>
              </div>
            </div>

            {/* Aviso de API Keys */}
            <div className={`rounded-2xl border p-6 shadow-sm ${isTestUser ? "bg-blue-50/50 border-blue-100" : "bg-amber-50/50 border-amber-100"}`}>
              <h3 className={`font-semibold mb-2 flex items-center gap-2 ${isTestUser ? "text-blue-900" : "text-amber-900"}`}>
                {isTestUser ? (
                  <>
                    <span>ℹ️</span> Modo Demostración
                  </>
                ) : (
                  <>
                    <span>⚠️</span> API Key Requerida
                  </>
                )}
              </h3>
              <p className={`text-xs leading-relaxed ${isTestUser ? "text-blue-700" : "text-amber-700"}`}>
                {isTestUser ? (
                  "Estás usando una cuenta de testeo interna (@edurag.com). Tus chatbots pueden operar con la API Key del sistema por defecto. Aun así, puedes configurar tu propia API Key si deseas hacer pruebas de consumo aisladas."
                ) : (
                  "Para garantizar la viabilidad y operatividad de la plataforma, cada docente debe proveer su propia API Key de Gemini. Si no configuras tu clave, tus chatbots no podrán procesar mensajes de estudiantes."
                )}
              </p>
            </div>
          </div>

          {/* Columna Derecha: Formulario de Perfil y API Keys */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                <span>👤</span> Datos del Docente
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-800 transition-all text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Apellido *
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-800 transition-all text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="institution" className="block text-sm font-medium text-gray-700 mb-1">
                    Institución *
                  </label>
                  <input
                    id="institution"
                    name="institution"
                    type="text"
                    value={formData.institution}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-800 transition-all text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                    País
                  </label>
                  <input
                    id="country"
                    name="country"
                    type="text"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-800 transition-all text-sm"
                    placeholder="Ej: Colombia"
                  />
                </div>
              </div>

              {/* API Keys */}
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3 pt-4 flex items-center gap-2">
                <span>🔑</span> Llaves de Modelos (BYOK)
              </h2>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="geminiApiKey" className="block text-sm font-medium text-gray-700">
                      Google Gemini API Key (Recomendado)
                    </label>
                    <a
                      href="https://aistudio.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                    >
                      Obtén tu API Key gratis en AI Studio ↗
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      id="geminiApiKey"
                      name="geminiApiKey"
                      type={showGeminiKey ? "text" : "password"}
                      value={formData.geminiApiKey}
                      onChange={handleChange}
                      className="w-full pl-4 pr-12 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-800 font-mono text-sm transition-all"
                      placeholder="AIzaSy..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showGeminiKey ? (
                        <span className="text-xs font-semibold select-none">Ocultar</span>
                      ) : (
                        <span className="text-xs font-semibold select-none">Mostrar</span>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="claudeApiKey" className="block text-sm font-medium text-gray-700">
                      Anthropic Claude API Key (Opcional)
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      id="claudeApiKey"
                      name="claudeApiKey"
                      type={showClaudeKey ? "text" : "password"}
                      value={formData.claudeApiKey}
                      onChange={handleChange}
                      className="w-full pl-4 pr-12 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-800 font-mono text-sm transition-all"
                      placeholder="sk-ant-..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowClaudeKey(!showClaudeKey)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showClaudeKey ? (
                        <span className="text-xs font-semibold select-none">Ocultar</span>
                      ) : (
                        <span className="text-xs font-semibold select-none">Mostrar</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {message && (
                <div
                  className={`text-sm p-3.5 rounded-xl border ${
                    isError
                      ? "text-red-700 bg-red-50 border-red-100"
                      : "text-green-700 bg-green-50 border-green-100"
                  } animate-in fade-in duration-200`}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow disabled:opacity-50 font-semibold transition-all hover:shadow-lg text-sm"
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
