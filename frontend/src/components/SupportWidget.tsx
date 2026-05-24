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

  // Intentar cargar datos del chatbot si el estudiante está en la pantalla de chat
  useEffect(() => {
    const chatMatch = pathname.match(/\/chat\/([a-zA-Z0-9-]+)/);
    if (chatMatch && chatMatch[1]) {
      api.chatbots.get(chatMatch[1])
        .then((cb) => setChatbot(cb))
        .catch((err) => console.error("Error loading chatbot details in SupportWidget:", err));
    } else {
      setChatbot(null);
    }
  }, [pathname]);

  // Valores de contacto por defecto (Configurables)
  const ADMIN_EMAIL = "admin@edurag.com";
  const ADMIN_WHATSAPP = "573000000000"; // Cambiar al número real del administrador

  // Determinar rol y a quién va dirigido el mensaje
  const isGuest = !auth.user;
  const isStudent = auth.user?.role === "student";
  const isTeacher = auth.user?.role === "teacher";
  const isAdmin = auth.user?.role === "admin";

  // No mostrar soporte al mismo administrador en su propio panel
  if (isAdmin && pathname.startsWith("/admin")) {
    return null;
  }

  // Configurar textos dinámicos según el contexto
  let recipientTitle = "Administrador";
  let recipientContactEmail = ADMIN_EMAIL;
  let whatsappNumber = ADMIN_WHATSAPP;
  let defaultPrefilledText = "Hola, me gustaría obtener más información sobre la plataforma EduRAG.";

  if (isGuest) {
    recipientTitle = "Administración (Soporte / Solicitud)";
    if (pathname.includes("/login") || pathname.includes("/register")) {
      defaultPrefilledText = "Hola, soy un docente y me gustaría ponerme en contacto con el administrador para solicitar una cuenta de acceso.";
    }
  } else if (isTeacher) {
    recipientTitle = "Soporte Administrador";
    defaultPrefilledText = `Hola, soy el docente ${auth.user?.email || ""} y necesito asistencia con la plataforma EduRAG.`;
  } else if (isStudent) {
    if (chatbot) {
      recipientTitle = `Docente (Chatbot: ${chatbot.name})`;
      // Intentar fallback si no tenemos email de docente, pero podemos escribir al admin para que lo rutee
      recipientContactEmail = ADMIN_EMAIL; 
      defaultPrefilledText = `Hola, soy un estudiante y tengo una duda sobre las respuestas del chatbot "${chatbot.name}" de la materia ${chatbot.subject_area}.`;
    } else {
      recipientTitle = "Soporte Estudiante / Admin";
      defaultPrefilledText = "Hola, soy un estudiante y necesito ayuda técnica con la plataforma.";
    }
  }

  const handleSendInternalMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      // Simular el envío de un mensaje interno (en producción se puede conectar a un endpoint de la API)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Mensaje de soporte enviado:", {
        from_name: name || auth.user?.email || "Anónimo",
        from_email: email || auth.user?.email || "guest@edurag.com",
        to: recipientContactEmail,
        message: messageText,
        context: pathname
      });
      setSubmitStatus("success");
      setMessageText("");
      setTimeout(() => setSubmitStatus("idle"), 3000);
    } catch (error) {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWhatsAppLink = () => {
    const text = encodeURIComponent(defaultPrefilledText);
    return `https://wa.me/${whatsappNumber}?text=${text}`;
  };

  const getEmailLink = () => {
    const subject = encodeURIComponent(`Soporte EduRAG - Consulta desde ${pathname}`);
    const body = encodeURIComponent(`${defaultPrefilledText}\n\nEnviado desde la página: ${window.location.href}`);
    return `mailto:${recipientContactEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Botón Flotante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 focus:outline-none group relative"
        title="Canal de Ayuda y Contacto"
      >
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Tarjeta de Soporte */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transition-all duration-300 animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <span>💬</span> Canal de Contacto
            </h3>
            <p className="text-xs text-blue-100 mt-1">
              Conéctate con el {recipientTitle}
            </p>
          </div>

          {/* Selector de Pestañas */}
          <div className="flex border-b border-gray-100 text-sm">
            <button
              onClick={() => setActiveTab("whatsapp")}
              className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors ${activeTab === "whatsapp" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              WhatsApp
            </button>
            <button
              onClick={() => setActiveTab("email")}
              className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors ${activeTab === "email" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              Email
            </button>
            <button
              onClick={() => setActiveTab("message")}
              className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors ${activeTab === "message" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              Mensaje Directo
            </button>
          </div>

          {/* Contenido de Pestañas */}
          <div className="p-4">
            {activeTab === "whatsapp" && (
              <div className="space-y-4 text-center py-2">
                <p className="text-sm text-gray-600">
                  ¿Prefieres una respuesta rápida? Escríbenos directamente por WhatsApp.
                </p>
                <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-500 italic text-left border border-gray-100">
                  <strong>Mensaje sugerido:</strong> "{defaultPrefilledText}"
                </div>
                <a
                  href={getWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-md transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.739-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.636-1.026-5.112-2.893-6.98S14.64 1.252 12.008 1.252c-5.442 0-9.866 4.42-9.87 9.864 0 1.902.504 3.753 1.464 5.362l-.961 3.509 3.593-.943zm11.23-5.466c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  </svg>
                  Chatear por WhatsApp
                </a>
              </div>
            )}

            {activeTab === "email" && (
              <div className="space-y-4 text-center py-2">
                <p className="text-sm text-gray-600">
                  Envía un correo electrónico detallado. Te responderemos en un plazo máximo de 24 horas.
                </p>
                <div className="bg-gray-50 p-2.5 rounded-lg text-xs font-mono text-gray-600 border border-gray-100">
                  {recipientContactEmail}
                </div>
                <a
                  href={getEmailLink()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Redactar Correo
                </a>
              </div>
            )}

            {activeTab === "message" && (
              <form onSubmit={handleSendInternalMessage} className="space-y-3">
                {isGuest && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="text"
                        placeholder="Tu Nombre"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        placeholder="Tu Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        required
                      />
                    </div>
                  </div>
                )}
                
                <div>
                  <textarea
                    placeholder="Escribe tu mensaje o consulta detallada aquí..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    rows={4}
                    className="w-full p-3 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                    required
                  ></textarea>
                </div>

                {submitStatus === "success" && (
                  <div className="text-xs p-2 text-green-700 bg-green-50 border border-green-200 rounded-lg">
                    ✓ Mensaje enviado con éxito. ¡Gracias!
                  </div>
                )}

                {submitStatus === "error" && (
                  <div className="text-xs p-2 text-red-700 bg-red-50 border border-red-200 rounded-lg">
                    ✗ Ocurrió un error. Inténtalo de nuevo.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !messageText.trim()}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-xs disabled:opacity-50 transition-colors shadow"
                >
                  {isSubmitting ? "Enviando..." : "Enviar Mensaje Directo"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
