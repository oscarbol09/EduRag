// Server Component — sin "use client" para preservar SSG y SEO (CRIT-01 resuelto)
import Link from "next/link";
import { StatsSection } from "./_components/StatsSection";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-brand-600 selection:text-white">
      {/* Navigation Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-zinc-200/80 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl font-bold text-zinc-950 font-display tracking-tight">
              EduRAG
            </span>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
              SaaS Educativo
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link
              href="/marketplace"
              className="text-zinc-600 hover:text-zinc-900 transition-colors px-3 py-1.5"
            >
              Marketplace
            </Link>
            <Link
              href="/login"
              className="text-zinc-600 hover:text-zinc-900 transition-colors px-3 py-1.5"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold btn-press shadow-sm"
            >
              Comenzar gratis
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white border-b border-zinc-200/80 py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col items-center justify-center">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          {/* Badge institucional */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-medium text-zinc-700 select-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
            Aislamiento multi-tenant · 0% alucinaciones fuera de temario
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-950 leading-[1.12] font-display">
            Asistentes pedagógicos basados en tus documentos de clase
          </h1>

          <p className="text-base sm:text-lg text-zinc-600 max-w-2xl mx-auto leading-relaxed">
            EduRAG permite a los docentes crear chatbots especializados a partir de sus apuntes, guías y sílabos en PDF, Word o Markdown. Respuestas guiadas para estudiantes con trazabilidad de fuentes y embebible en Moodle.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm btn-press transition-colors"
            >
              Crear cuenta de estudiante
            </Link>
            <Link
              href="/marketplace"
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-zinc-700 hover:text-zinc-950 bg-white hover:bg-zinc-50 rounded-lg border border-zinc-300 shadow-sm btn-press transition-colors"
            >
              Explorar tutores públicos
            </Link>
          </div>
        </div>
      </section>

      {/* Estadísticas de Plataforma */}
      <StatsSection />

      {/* Sección "Cómo Funciona" en 3 Pasos */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight font-display">
              Arquitectura pedagógica en 3 pasos
            </h2>
            <p className="text-zinc-600 text-sm">
              Implementa un tutor inteligente para tu curso en minutos sin requerir infraestructura técnica.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <StepCard
              step="1"
              title="Indexación de Documentos"
              description="Sube apuntes, guías de laboratorio o lecturas en PDF, DOCX, TXT o MD. El contenido se almacena de forma segura con estricto aislamiento por docente."
              icon={
                <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <StepCard
              step="2"
              title="Calibración Didáctica"
              description="Define el nivel académico (Secundaria o Universidad), el tono de respuesta y las restricciones pedagógicas: método socrático o respuestas directas."
              icon={
                <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              }
            />
            <StepCard
              step="3"
              title="Distribución e Integración"
              description="Publica en el marketplace educativo o copia el snippet iframe seguro para incrustar el tutor directamente en cursos de Moodle o Canvas."
              icon={
                <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200/80 py-10 px-4 text-xs text-zinc-500 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-900 font-display text-sm">
              EduRAG
            </span>
            <span className="text-zinc-300">|</span>
            <p>© 2026 EduRAG Platform. Diseñado para educación superior y secundaria.</p>
          </div>
          <nav className="flex items-center gap-6 font-medium" aria-label="Navegación inferior">
            <Link href="/login" className="hover:text-zinc-900 transition-colors">Acceso Docentes</Link>
            <Link href="/marketplace" className="hover:text-zinc-900 transition-colors">Marketplace</Link>
            <Link href="/admin" className="hover:text-zinc-900 transition-colors">Administración</Link>
          </nav>
        </div>
      </footer>
    </main>
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
    <div className="bg-white rounded-xl border border-zinc-200 p-6 craft-card flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-xs font-bold text-zinc-400 font-mono tracking-wider" aria-label={`Paso ${step}`}>
          0{step}
        </span>
      </div>
      <h3 className="text-base font-bold text-zinc-900 mb-2">{title}</h3>
      <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed flex-1">{description}</p>
    </div>
  );
}

