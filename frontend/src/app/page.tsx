import Link from "next/link";
import { StatsSection } from "./_components/StatsSection";
import { ProductPreview } from "./_components/ProductPreview";
import { HowItWorks } from "./_components/HowItWorks";
import { ComparisonSection } from "./_components/ComparisonSection";
import { FeatureMatrix } from "./_components/FeatureMatrix";
import { FaqSection } from "./_components/FaqSection";

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "EduRAG",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
    "description": "Plataforma SaaS educativa para crear tutores pedagógicos con RAG y trazabilidad estricta de fuentes a partir de documentos de clase.",
    "publisher": {
      "@type": "Organization",
      "name": "EduRAG",
      "url": "https://edu-rag-red.vercel.app",
    },
  };

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col font-sans selection:bg-indigo-900 selection:text-white relative overflow-hidden">
      {/* Schema.org Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Architectural Background Grid & Ambient Lighting */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#27272a15_1px,transparent_1px),linear-gradient(to_bottom,#27272a15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" 
        aria-hidden="true" 
      />
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none" 
        aria-hidden="true" 
      />

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/85 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-500/30 flex items-center justify-center font-bold text-sm text-indigo-300 group-hover:border-indigo-400 transition-colors shadow-sm">
              E
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-zinc-100 tracking-tight leading-none">
                EduRAG
              </span>
              <span className="text-[10px] text-zinc-400 font-mono mt-0.5">
                RAG Pedagógico
              </span>
            </div>
          </Link>
          
          <nav className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm font-medium">
            <Link
              href="/marketplace"
              className="text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              Marketplace
            </Link>
            <Link
              href="/login"
              className="text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors border border-indigo-500/40 active:scale-95"
            >
              Comenzar gratis
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-12 lg:pt-24 lg:pb-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center z-10">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Institutional Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-700/80 text-xs text-zinc-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
            <span className="font-medium text-zinc-200">EduRAG 2.0</span>
            <span className="text-zinc-500">|</span>
            <span>Tutoría Inteligente con Trazabilidad Curricular</span>
          </div>

          {/* Punchy Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-100 leading-[1.12]">
            Asistentes Pedagógicos Calibrados con tus{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-indigo-100 to-zinc-200">
              Documentos de Clase
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Convierte sílabos, guías de laboratorio y lecturas en PDFs o Word en tutores socráticos interactivos. Con citas exactas de fuente, costo operativo $0/mes e integración en Moodle y Canvas vía Iframe.
          </p>

          {/* Dual Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/register"
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 rounded-lg shadow-lg shadow-indigo-950/50 transition-colors active:scale-98 flex items-center justify-center gap-2"
            >
              <span>Crear mi primer tutor</span>
              <span className="text-indigo-200 font-mono text-xs">→</span>
            </Link>
            <Link
              href="/marketplace"
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 rounded-lg transition-colors active:scale-98"
            >
              Explorar tutores públicos
            </Link>
          </div>

          {/* Quick Trust Highlights */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-400 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">✓</span> $0/mes permanente (Free Tier)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">✓</span> Compatible con Moodle & Canvas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">✓</span> Cifrado Fernet BYOK
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">✓</span> Cero alucinaciones externas
            </span>
          </div>
        </div>
      </section>

      {/* Interactive Studio Preview Section */}
      <section className="pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full z-10">
        <ProductPreview />
      </section>

      {/* Real-time Telemetry / Stats */}
      <div className="z-10 relative">
        <StatsSection />
      </div>

      {/* 4-Step Pipeline Workflow */}
      <div className="z-10 relative">
        <HowItWorks />
      </div>

      {/* Comparison: Generic Chatbots vs EduRAG */}
      <div className="z-10 relative">
        <ComparisonSection />
      </div>

      {/* Technical Architecture & Feature Matrix */}
      <div className="z-10 relative">
        <FeatureMatrix />
      </div>

      {/* FAQ Accordion */}
      <div className="z-10 relative">
        <FaqSection />
      </div>

      {/* Bottom Conversion CTA Card */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full z-10">
        <div className="relative rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/40 via-zinc-900/60 to-zinc-950 p-8 sm:p-12 text-center space-y-6 shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-100 tracking-tight">
              Potencia tu Cátedra con Asistentes Basados en tu Contenido
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              Únete a docentes universitarios y de secundaria que ya despliegan tutores inteligentes con costo $0/mes y total rigor curricular.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 relative z-10">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-950/60 transition-colors border border-indigo-400/30"
            >
              Comenzar gratis como estudiante o docente
            </Link>
            <Link
              href="/marketplace"
              className="w-full sm:w-auto px-6 py-3.5 text-sm font-semibold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg transition-colors"
            >
              Ver tutores en el marketplace
            </Link>
          </div>
        </div>
      </section>

      {/* High-Craft Footer */}
      <footer className="border-t border-zinc-800/80 py-12 px-4 sm:px-6 lg:px-8 mt-auto bg-zinc-950/90 z-10 relative">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-xs text-zinc-400">
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-300">
              E
            </div>
            <div>
              <span className="font-bold text-zinc-200 text-sm">EduRAG</span>
              <p className="text-zinc-500 text-[11px] mt-0.5">
                Plataforma SaaS de Asistentes Pedagógicos con RAG para Educación Superior y Secundaria.
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-zinc-400" aria-label="Navegación inferior">
            <Link href="/marketplace" className="hover:text-zinc-200 transition-colors">Marketplace</Link>
            <Link href="/privacy" className="hover:text-zinc-200 transition-colors">Política de Privacidad</Link>
            <Link href="/terms" className="hover:text-zinc-200 transition-colors">Términos y Condiciones</Link>
            <Link href="/login" className="hover:text-zinc-200 transition-colors">Acceso Docentes</Link>
          </nav>

          <div className="text-zinc-500 text-[11px] text-center md:text-right">
            © {new Date().getFullYear()} EduRAG. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </main>
  );
}
