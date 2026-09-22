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

  let recipientTitle = "Administrador";
  let recipientContactEmail = ADMIN_EMAIL;
  const whatsappNumber = ADMIN_WHATSAPP;
  let defaultPrefilledText = "Hola, me gustaría obtener más información sobre la plataforma EduRAG.";

  if (isGuest) {
    recipientTitle = "Mesa de Ayuda Institucional";
    if (pathname?.includes("/login") || pathname?.includes("/register")) {
      defaultPrefilledText = "Hola, soy docente y me gustaría solicitar una cuenta institucional.";
    }
  } else if (isTeacher) {
    recipientTitle = "Soporte Técnico Docente";
    defaultPrefilledText = `Hola, soy el docente ${auth.user?.email ?? ""} y solicito asistencia técnica.`;
  } else if (isStudent) {
    if (chatbot) {
      recipientTitle = `Tutoría Docente (${chatbot.name})`;
      recipientContactEmail = ADMIN_EMAIL;
      defaultPrefilledText = `Hola, tengo una consulta académica sobre el asistente "${chatbot.name}" de ${chatbot.subject_area}.`;
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
        className="btn-press flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/25 border border-indigo-400/40 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[#07080c]"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Support Card */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Canal de contacto y soporte"
          className="glass-panel specular-highlight absolute bottom-16 right-0 w-80 sm:w-88 rounded-2xl shadow-2xl border border-white/15 overflow-hidden animate-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-b from-indigo-950/80 to-transparent border-b border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-2 font-display">
                <span className="w-2 h-2 rounded-full bg-emerald-400 led-pulse" aria-hidden="true" />
                Canal de Asistencia
              </h3>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                Soporte
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {recipientTitle}
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-white/10 text-xs font-medium bg-[#07080c]/60" role="tablist" aria-label="Opciones de contacto">
            {(["whatsapp", "email"] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-center transition-all border-b-2 font-mono ${
                  activeTab === tab
                    ? "border-indigo-400 text-white bg-white/[0.04]"
                    : "border-transparent text-slate-400 hover:text-slate-200"
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
                <p className="text-xs text-slate-300">Respuesta ágil por canal institucional de WhatsApp.</p>
                <div className="bg-[#07080c]/80 p-3 rounded-lg text-xs text-slate-300 text-left border border-white/10 font-mono">
                  <span className="font-semibold text-indigo-300 block mb-1 font-sans text-[11px] uppercase tracking-wider">Mensaje sugerido:</span>
                  &ldquo;{defaultPrefilledText}&rdquo;
                </div>
                {!ADMIN_WHATSAPP ? (
                  <p className="text-xs text-amber-300 bg-amber-950/60 border border-amber-500/40 rounded-lg p-2.5">
                    WhatsApp no configurado. Por favor utiliza el canal de Email.
                  </p>
                ) : (
                  <a
                    href={getWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-press inline-flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-lg shadow-emerald-950/50 border border-emerald-400/30 transition-all"
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
                <p className="text-xs text-slate-300">Envía tu consulta técnica con respuesta garantizada en 24h.</p>
                <div className="bg-[#07080c]/80 p-2.5 rounded-lg text-xs font-mono text-indigo-300 border border-white/10">
                  {recipientContactEmail}
                </div>
                <a
                  href={getEmailLink()}
                  className="btn-press inline-flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg shadow-lg shadow-indigo-950/50 border border-indigo-400/30 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Redactar Correo Institucional
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
