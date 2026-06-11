"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/context";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import type { Chatbot } from "@/lib/types";

export function SupportWidget() {
  const { auth } = useApp();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"whatsapp" | "email" | "message">("whatsapp");
  const [messageText, setMessageText] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);

  useEffect(() => {
    if (!pathname) { setChatbot(null); return; }
    const chatMatch = pathname.match(/\/chat\/([a-zA-Z0-9-]+)/);
    if (chatMatch?.[1]) {
      api.chatbots.get(chatMatch[1])
        .then((cb) => setChatbot(cb))
        .catch(() => setChatbot(null));
    } else {
      setChatbot(null);
    }
  }, [pathname]);

  const ADMIN_EMAIL = "admin@edurag.com";
  // El número de WhatsApp se configura como variable de entorno (IMP-03)
  const ADMIN_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "";

  const isGuest = !auth.user;
  const isStudent = auth.user?.role === "student";
  const isTeacher = auth.user?.role === "teacher";
  const isAdmin = auth.user?.role === "admin";

  if (isAdmin && pathname?.startsWith("/admin")) return null;

  let recipientTitle = "Administrador";
  let recipientContactEmail = ADMIN_EMAIL;
  let whatsappNumber = ADMIN_WHATSAPP;
  let defaultPrefilledText = "Hola, me gustaría obtener más información sobre la plataforma EduRAG.";

  if (isGuest) {
    recipientTitle = "Administración (Soporte / Solicitud)";
    if (pathname?.includes("/login") || pathname?.includes("/register")) {
      defaultPrefilledText = "Hola, soy un docente y me gustaría solicitar una cuenta de acceso.";
    }
  } else if (isTeacher) {
    recipientTitle = "Soporte Administrador";
    defaultPrefilledText = `Hola, soy el docente ${auth.user?.email ?? ""} y necesito asistencia.`;
  } else if (isStudent) {
    if (chatbot) {
      recipientTitle = `Docente (Chatbot: ${chatbot.name})`;
      recipientContactEmail = ADMIN_EMAIL;
      defaultPrefilledText = `Hola, tengo una duda sobre las respuestas del chatbot "${chatbot.name}" de ${chatbot.subject_area}.`;
    } else {
      recipientTitle = "Soporte Estudiante";
      defaultPrefilledText = "Hola, soy un estudiante y necesito ayuda técnica.";
    }
  }

  const handleSendInternalMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setIsSubmitting(true);
    setSubmitStatus("idle");
    try {
      // TODO: conectar a /support/message cuando el endpoint esté disponible (IMP-04)
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSubmitStatus("success");
      setMessageText("");
      setTimeout(() => setSubmitStatus("idle"), 3000);
    } catch {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWhatsAppLink = () => {
    if (!whatsappNumber) return "#";
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(defaultPrefilledText)}`;
  };

  const getEmailLink = () => {
    const safePathname = pathname ?? "";
    const currentHref = typeof window !== "undefined" ? window.location.href : "";
    const subject = encodeURIComponent(`Soporte EduRAG — consulta desde ${safePathname}`);
    const body = encodeURIComponent(`${defaultPrefilledText}\n\nPágina: ${currentHref}`);
    return `mailto:${recipientContactEmail}?subject=${subject}&body=${body}`;
  };

  // Clases de pestañas activas/inactivas usando tokens brand (MEN-06)
  const tabActive = "border-brand-500 text-brand-600";
  const tabInactive = "border-transparent text-gray-500 hover:text-gray-700";

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Botón Flotante — usa tokens brand (MEN-06) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Cerrar ayuda" : "Abrir canal de ayuda y contacto"}
        aria-expanded={isOpen}
        className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-brand-600 to-accent-600 text-white shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 relative"
      >
        <span className="absolute -top-1 -right-1 flex h-3 w-3" aria-hidden="true">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-500"></span>
        </span>
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Tarjeta de Soporte */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Canal de contacto y soporte"
          className="absolute bottom-16 right-0 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        >
          {/* Header — usa tokens brand (MEN-06) */}
          <div className="p-4 bg-gradient-to-r from-brand-600 to-accent-600 text-white">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <span aria-hidden="true">💬</span> Canal de Contacto
            </h3>
            <p className="text-xs text-white/80 mt-1">
              Conéctate con el {recipientTitle}
            </p>
          </div>

          {/* Selector de Pestañas */}
          <div className="flex border-b border-gray-100 text-sm" role="tablist" aria-label="Opciones de contacto">
            {(["whatsapp", "email", "message"] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors ${activeTab === tab ? tabActive : tabInactive}`}
              >
                {tab === "whatsapp" ? "WhatsApp" : tab === "email" ? "Email" : "Mensaje"}
              </button>
            ))}
          </div>

          {/* Contenido */}
          <div className="p-4" role="tabpanel">
            {activeTab === "whatsapp" && (
              <div className="space-y-4 text-center py-2">
                <p className="text-sm text-gray-600">¿Prefieres una respuesta rápida? Escríbenos por WhatsApp.</p>
                <div className="bg-gray-50 p-3 rounded-xl text-xs text-gray-500 italic text-left border border-gray-100">
                  <strong>Mensaje sugerido:</strong> "{defaultPrefilledText}"
                </div>
                {!ADMIN_WHATSAPP ? (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl p-2">
                    Canal de WhatsApp no configurado. Usa Email o Mensaje Directo.
                  </p>
                ) : (
                  <a
                    href={getWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl shadow-md transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.739-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.636-1.026-5.112-2.893-6.98S14.64 1.252 12.008 1.252c-5.442 0-9.866 4.42-9.87 9.864 0 1.902.504 3.753 1.464 5.362l-.961 3.509 3.593-.943zm11.23-5.466c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    </svg>
                    Chatear por WhatsApp
                  </a>
                )}
              </div>
            )}

            {activeTab === "email" && (
              <div className="space-y-4 text-center py-2">
                <p className="text-sm text-gray-600">Envía un correo detallado. Te respondemos en máximo 24 horas.</p>
                <div className="bg-gray-50 p-2.5 rounded-xl text-xs font-mono text-gray-600 border border-gray-100">
                  {recipientContactEmail}
                </div>
                <a
                  href={getEmailLink()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl shadow-md transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Redactar Correo
                </a>
              </div>
            )}

            {activeTab === "message" && (
              <form onSubmit={handleSendInternalMessage} className="space-y-3">
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl p-2">
                  ⚠️ Envío directo disponible próximamente. Usa WhatsApp o Email por ahora.
                </p>
                {isGuest && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Tu Nombre"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      aria-label="Tu nombre"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                      required
                    />
                    <input
                      type="email"
                      placeholder="Tu Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-label="Tu correo electrónico"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                )}
                <textarea
                  placeholder="Escribe tu mensaje aquí..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={4}
                  aria-label="Mensaje de soporte"
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none"
                  required
                />
                {submitStatus === "success" && (
                  <div role="status" className="text-xs p-2 text-green-700 bg-green-50 border border-green-200 rounded-xl">
                    ✓ Mensaje enviado. ¡Gracias!
                  </div>
                )}
                {submitStatus === "error" && (
                  <div role="alert" className="text-xs p-2 text-red-700 bg-red-50 border border-red-200 rounded-xl">
                    No se pudo enviar. Inténtalo de nuevo.
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || !messageText.trim()}
                  className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl text-xs disabled:opacity-50 transition-colors shadow"
                >
                  {isSubmitting ? "Enviando..." : "Enviar Mensaje"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
