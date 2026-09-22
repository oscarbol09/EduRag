import Link from "next/link";
import { StatsSection } from "./_components/StatsSection";
import { ProductPreview } from "./_components/ProductPreview";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-sm text-zinc-100 group-hover:border-zinc-700 transition-colors">
              E
            </div>
            <span className="text-base font-bold text-zinc-100 tracking-tight">
              EduRAG
            </span>
          </Link>
          
          <nav className="flex items-center gap-3 text-xs sm:text-sm font-medium">
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
              className="btn-press px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              Comenzar gratis
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-28 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            <span>RAG Educativo para Educación Superior y Secundaria</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-zinc-100 leading-[1.1]">
            Asistentes pedagógicos basados en tus documentos de clase
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            EduRAG permite a docentes desplegar tutores inteligentes a partir de apuntes, guías y sílabos en PDF, Word o Markdown. Con trazabilidad estricta de fuentes, costo $0/mes e integración en Moodle y Canvas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/register"
              className="btn-press w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-zinc-900 bg-zinc-100 hover:bg-white rounded-xl shadow-sm transition-colors"
            >
              Comenzar como estudiante
            </Link>
            <Link
              href="/marketplace"
              className="btn-press w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors"
            >
              Explorar tutores públicos
            </Link>
          </div>
        </div>
      </section>

      {/* Product Preview Section */}
      <section className="pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <ProductPreview />
      </section>

      {/* Telemetry / Stats */}
      <StatsSection />

      {/* Features Grid */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">
            Diseñado para rigor académico y simplicidad institucional
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Arquitectura ligera y eficiente sin bases de datos vectoriales costosas. EduRAG opera con ranking léxico contextual directo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Feature 1 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-850 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-100 tracking-tight">
              Indexación Curricular Directa
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Sube tus documentos en PDF, DOCX, TXT o Markdown. Los contenidos se segmentan en bloques semánticos y se inyectan en el contexto según la relevancia de la pregunta.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-850 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-100 tracking-tight">
              Calibración Pedagógica Flexible
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Define el nivel educativo (Secundaria o Universidad), el tono y el nivel de restricción para responder con método socrático o deducciones técnicas formales.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-850 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-100 tracking-tight">
              Embebible en Aulas Virtuales
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Genera un código iframe listo para incrustar en Moodle, Canvas o Blackboard con un solo clic, sin configuraciones complejas de servidores.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-850 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-100 tracking-tight">
              Bóveda BYOK con Cifrado Fernet
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Cada docente utiliza su clave gratuita de OpenRouter (modelos como Gemma 26B o Nemotron). Las claves se almacenan cifradas con AES-128 en el backend.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-12 px-4 sm:px-6 lg:px-8 mt-auto bg-zinc-950">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-zinc-400">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-200">
              E
            </div>
            <div>
              <span className="font-semibold text-zinc-200">EduRAG</span>
              <p className="text-zinc-500 text-[11px] mt-0.5">Plataforma de Asistentes Pedagógicos con RAG para Educación.</p>
            </div>
          </div>

          <nav className="flex items-center gap-6 text-zinc-400" aria-label="Navegación inferior">
            <Link href="/login" className="hover:text-zinc-200 transition-colors">Acceso Docentes</Link>
            <Link href="/marketplace" className="hover:text-zinc-200 transition-colors">Marketplace</Link>
            <Link href="/admin" className="hover:text-zinc-200 transition-colors">Administración</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
