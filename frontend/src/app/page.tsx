"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PlatformStats {
  totalChatbots: number;
  totalTeachers: number;
  totalMessages: number;
}

export default function HomePage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/platform/stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setStats(data); })
      .catch(() => null);
  }, []);
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      {/* Hero oscuro premium con dot-grid */}
      <section className="bg-slate-900 bg-dot-grid text-white py-24 px-4 relative overflow-hidden flex flex-col items-center justify-center min-h-[85vh]">
        {/* Glowing background blobs */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-500/20 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDuration: "8s" }}></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent-500/20 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDuration: "12s" }}></div>

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          {/* Badge de estado activo */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 backdrop-blur border border-slate-700/60 text-xs font-semibold text-accent-500 select-none shadow-inner">
            <span className="w-2 h-2 rounded-full bg-accent-500 animate-ping"></span>
            <span className="w-2 h-2 rounded-full bg-accent-500 absolute"></span>
            Plataforma EduRAG Activa
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] font-display">
            Enseña de forma inteligente.<br />
            <span className="bg-gradient-to-r from-brand-500 via-indigo-400 to-accent-500 bg-clip-text text-transparent">
              Explica de forma directa.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-sans">
            EduRAG es la plataforma SaaS educativa multi-tenant que te permite crear chatbots especializados a partir de tus propios documentos de clase. Respuestas confiables 24/7 con trazabilidad de fuentes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/25 hover:shadow-brand-500/45 duration-200"
            >
              Comenzar Gratis →
            </Link>
            <Link
              href="/marketplace"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 transition-all duration-200"
            >
              Explorar Marketplace
            </Link>
          </div>
        </div>
      </section>

      {/* Sección de estadísticas — datos reales con fallback si el endpoint no responde */}
      <section className="bg-white border-y border-gray-100 py-12 px-4 shadow-sm relative z-20">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatItem value={stats ? `${stats.totalChatbots}+` : "—"} label="Chatbots Creados" />
          <StatItem value={stats ? `${stats.totalTeachers}+` : "—"} label="Docentes Activos" />
          <StatItem value={stats ? `${stats.totalMessages.toLocaleString()}+` : "—"} label="Mensajes Educativos" />
          <StatItem value="99.9%" label="Uptime en la Nube" />
        </div>
      </section>

      {/* Sección "Cómo Funciona" en 3 Pasos */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight font-display">
              ¿Cómo funciona EduRAG?
            </h2>
            <p className="text-gray-500 text-base font-sans">
              Configura tu primer asistente inteligente en tres sencillos pasos sin tocar una sola línea de código.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <StepCard
              step="1"
              title="Sube tus Documentos"
              description="Sube apuntes de clase, guías, silabus o lecturas académicas en texto plano (.txt, .md). La plataforma los indexa de forma aislada y ultra segura."
              icon={
                <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />

            {/* Step 2 */}
            <StepCard
              step="2"
              title="Personaliza tu Tutor"
              description="Define el nivel académico (Secundaria o Universidad), el tono del chatbot (Amigable, Formal o Técnico) y las restricciones de respuesta para el aprendizaje."
              icon={
                <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              }
            />

            {/* Step 3 */}
            <StepCard
              step="3"
              title="Comparte y Enseña"
              description="Publica tu chatbot con un solo clic. Genera enlaces directos para tus estudiantes o copia el código iframe para embeberlo directo en Moodle u otros LMS."
              icon={
                <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742l4.684-2.342m0 0l-4.684-2.342m4.684 2.342l4.684 2.342m0 0l-4.684 2.342m0-4.684h-4.684m0 0v4.684" />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* Footer elegante */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4 border-t border-slate-800 text-sm mt-auto relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white font-display bg-gradient-to-r from-brand-500 to-accent-500 bg-clip-text text-transparent">
              EduRAG
            </span>
            <span className="text-slate-600">|</span>
            <p>© 2026 EduRAG Platform. Todos los derechos reservados.</p>
          </div>
          <div className="flex items-center gap-6 font-semibold">
            <Link href="/login" className="hover:text-white transition-colors">Docentes</Link>
            <Link href="/marketplace" className="hover:text-white transition-colors">Marketplace</Link>
            <Link href="/admin" className="hover:text-white transition-colors">Administradores</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center space-y-1">
      <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-transparent font-display">
        {value}
      </div>
      <div className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
  icon,
}: {
  step: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm relative glow-card flex flex-col h-full">
      <div className="absolute top-[-18px] left-[32px] w-[36px] h-[36px] bg-brand-600 text-white rounded-full flex items-center justify-center font-bold text-sm select-none shadow">
        {step}
      </div>
      <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-5 mt-2">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed flex-1 font-sans">{description}</p>
    </div>
  );
}
