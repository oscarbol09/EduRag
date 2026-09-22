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
  const [activeTab, setActiveTab] = useState<"whatsapp" | "email">("whatsapp");
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);

  useEffect(() => {
    let ignore = false;
    const chatMatch = pathname ? pathname.match(/\/chat\/([a-zA-Z0-9-]+)/) : null;
    if (chatMatch?.[1]) {
      api.chatbots.get(chatMatch[1])
        .then((cb) => {
          if (!ignore) setChatbot(cb);
        })
        .catch(() => {
          if (!ignore) setChatbot(null);
        });
    } else {
      setChatbot(null);
    }
    return () => {
      ignore = true;
    };
  }, [pathname]);

  const ADMIN_EMAIL = "admin@edurag.com";
  const ADMIN_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "";

  const isGuest = !auth.user;
  const isStudent = auth.user?.role === "student";
  const isTeacher = auth.user?.role === "teacher";
  const isAdmin = auth.user?.role === "admin";

  if (isAdmin && pathname?.startsWith("/admin")) return null;

  let recipientTitle = "Mesa de Ayuda";
  let recipientContactEmail = ADMIN_EMAIL;
  const whatsappNumber = ADMIN_WHATSAPP;
  let defaultPrefilledText = "Hola, me gustaría obtener más información sobre la plataforma EduRAG.";

  if (isGuest) {
    recipientTitle = "Mesa de Ayuda";
    if (pathname?.includes("/login") || pathname?.includes("/register")) {
      defaultPrefilledText = "Hola, soy docente y me gustaría solicitar una cuenta institucional.";
    }
  } else if (isTeacher) {
    recipientTitle = "Soporte Técnico Docente";
    defaultPrefilledText = `Hola, soy el docente ${auth.user?.email ?? ""} y solicito asistencia técnica.`;
  } else if (isStudent) {
    if (chatbot) {
      recipientTitle = `Consulta Docente (${chatbot.name})`;
      recipientContactEmail = ADMIN_EMAIL;
      defaultPrefilledText = `Hola, tengo una consulta sobre el tutor "${chatbot.name}" de ${chatbot.subject_area}.`;
    } else {
      recipientTitle = "Mesa de Ayuda Estudiantil";
      defaultPrefilledText = "Hola, soy estudiante de la plataforma y requiero soporte.";
    }
  }

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

  return (
    <div className="fixed bottom-6 right-6 z-40 font-sans">
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Cerrar canal de ayuda" : "Abrir canal de ayuda y soporte"}
        aria-expanded={isOpen}
        className="btn-press flex items-center justify-center w-11 h-11 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 shadow-lg border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-600 transition-all"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Support Card */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Canal de contacto y soporte"
          className="absolute bottom-14 right-0 w-80 sm:w-84 rounded-2xl shadow-2xl border border-zinc-800 bg-zinc-950 overflow-hidden animate-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="p-4 bg-zinc-900/50 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-zinc-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
                {recipientTitle}
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Canal directo de asistencia técnica y pedagógica
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-zinc-800 text-xs font-medium bg-zinc-950" role="tablist" aria-label="Opciones de contacto">
            {(["whatsapp", "email"] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-center transition-all border-b-2 ${
                  activeTab === tab
                    ? "border-zinc-200 text-zinc-100 bg-zinc-900/40"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tab === "whatsapp" ? "WhatsApp" : "Correo"}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-4" role="tabpanel">
            {activeTab === "whatsapp" && (
              <div className="space-y-3 text-center">
                <p className="text-xs text-zinc-400">Respuesta rápida por canal de WhatsApp.</p>
                <div className="bg-zinc-900 p-3 rounded-lg text-xs text-zinc-300 text-left border border-zinc-800">
                  <span className="font-medium text-zinc-400 block mb-0.5 text-[11px]">Mensaje inicial:</span>
                  &ldquo;{defaultPrefilledText}&rdquo;
                </div>
                {!ADMIN_WHATSAPP ? (
                  <p className="text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg p-2.5">
                    WhatsApp no configurado. Por favor utiliza el canal de Correo.
                  </p>
                ) : (
                  <a
                    href={getWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-press inline-flex items-center justify-center gap-2 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg shadow-sm transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.739-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.636-1.026-5.112-2.893-6.98S14.64 1.252 12.008 1.252c-5.442 0-9.866 4.42-9.87 9.864 0 1.902.504 3.753 1.464 5.362l-.961 3.509 3.593-.943zm11.23-5.466c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    </svg>
                    Contactar por WhatsApp
                  </a>
                )}
              </div>
            )}

            {activeTab === "email" && (
              <div className="space-y-3 text-center">
                <p className="text-xs text-zinc-400">Envía tu consulta técnica o pedagógica.</p>
                <div className="bg-zinc-900 p-2.5 rounded-lg text-xs text-zinc-300 border border-zinc-800 font-mono">
                  {recipientContactEmail}
                </div>
                <a
                  href={getEmailLink()}
                  className="btn-press inline-flex items-center justify-center gap-2 w-full py-2 bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-xs rounded-lg shadow-sm transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Redactar Correo
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
