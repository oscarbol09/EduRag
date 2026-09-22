import Link from "next/link";
import { StatsSection } from "./_components/StatsSection";
import { RagSandboxSimulator } from "./_components/RagSandboxSimulator";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#07080c] flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <header className="glass-panel specular-highlight border-b border-white/[0.08] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 p-px shadow-sm flex items-center justify-center">
              <div className="w-full h-full bg-[#07080c] rounded-[7px] flex items-center justify-center">
                <span className="font-display font-bold text-sm bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">E</span>
              </div>
            </div>
            <span className="text-xl font-bold text-white font-display tracking-tight group-hover:text-indigo-300 transition-colors">
              EduRAG
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 hidden sm:inline-block">
              SaaS Educativo
            </span>
          </Link>
          
          <nav className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm font-medium">
            <Link
              href="/marketplace"
              className="text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.04]"
            >
              Marketplace
            </Link>
            <Link
              href="/login"
              className="text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.04]"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="btn-press px-3.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-900/40 border border-indigo-400/30 transition-all"
            >
              Comenzar gratis
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 px-4 sm:px-6 lg:px-8 overflow-hidden flex flex-col items-center justify-center text-center">
        {/* Ambient Lights & Grid */}
        <div className="absolute inset-0 blueprint-grid opacity-40 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/70 border border-indigo-500/30 text-xs font-mono text-indigo-300 select-none shadow-inner backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 led-pulse" aria-hidden="true" />
            <span>AISLAMIENTO MULTI-TENANT</span>
            <span className="text-white/20">|</span>
            <span className="text-cyan-300">0% ALUCINACIÓN</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] font-display">
            Asistentes pedagógicos basados en tus documentos de clase
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            EduRAG permite a docentes de secundaria y universidad desplegar tutores inteligentes a partir de apuntes, guías y sílabos en PDF, Word o Markdown. Trazabilidad rigurosa de fuentes, costo operativo $0/mes y embebible en Moodle o Canvas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <Link
              href="/register"
              className="btn-press w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 rounded-xl shadow-xl shadow-indigo-900/40 border border-indigo-400/30 transition-all"
            >
              Crear cuenta de estudiante
            </Link>
            <Link
              href="/marketplace"
              className="btn-press w-full sm:w-auto px-6 py-3 text-sm font-semibold text-slate-200 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-xl border border-white/15 backdrop-blur-md transition-all"
            >
              Explorar tutores públicos →
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive RAG Sandbox Simulator Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full relative z-20">
        <RagSandboxSimulator />
      </section>

      {/* Real-time Telemetry Section */}
      <StatsSection />

      {/* Cyber-Academic Bento Grid Features */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
            ARQUITECTURA DE SOFTWARE
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
            Diseñado para rigor académico y costo operativo $0/mes
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Elimina dependencias pesadas de bases de datos vectoriales. EduRAG opera mediante chunking léxico eficiente y rankings de solapamiento directo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Bento Tile 1: Lexical Chunking (Span 2) */}
          <div className="md:col-span-2 bento-card p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-indigo-400 px-2.5 py-1 rounded-md bg-indigo-950/80 border border-indigo-500/30">
                  CORE // RAG LÉXICO
                </span>
                <span className="text-xs font-mono text-slate-500">60,000 CHARS BUDGET</span>
              </div>
              <h3 className="text-xl font-bold text-white font-display">
                Chunking Dinámico de 1500 Caracteres + 200c de Solapamiento
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                Los documentos se segmentan en bloques semánticos con preservación de contexto en los límites. El motor clasifica los fragmentos por solapamiento léxico directo e inyecta únicamente el material pertinente en la ventana de contexto.
              </p>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-[#07080c]/80 border border-white/10 font-mono text-xs text-slate-300 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-white/10 pb-1.5">
                <span>PIPELINE DE EXTRACCIÓN</span>
                <span className="text-emerald-400">HERMÉTICO MULTI-TENANT</span>
              </div>
              <p className="text-indigo-300 text-[11px]">
                PDF / DOCX / MD ➔ TextExtractor ➔ LexicalRanker ➔ OpenRouter Engine
              </p>
            </div>
          </div>

          {/* Bento Tile 2: Pedagogical Rigor */}
          <div className="bento-card p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-[11px] font-mono text-amber-400 px-2.5 py-1 rounded-md bg-amber-950/80 border border-amber-500/30 inline-block">
                PEDAGOGÍA // DIDÁCTICA
              </span>
              <h3 className="text-lg font-bold text-white font-display">
                Calibración de Rigor y Método Socrático
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Configura el nivel educativo (Secundaria / Universidad), el tono y las restricciones: responde guiando paso a paso o entregando deducciones formales sin saltarse etapas conceptuales.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 text-[11px] font-mono text-amber-400">
              MODOS: ESTRICTO · GUIADO · ABIERTO
            </div>
          </div>

          {/* Bento Tile 3: LMS Iframe Hub */}
          <div className="bento-card p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-[11px] font-mono text-cyan-400 px-2.5 py-1 rounded-md bg-cyan-950/80 border border-cyan-500/30 inline-block">
                INTEGRACIÓN // LMS
              </span>
              <h3 className="text-lg font-bold text-white font-display">
                Embebible en Moodle, Canvas & Blackboard
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Genera con un solo clic el snippet iframe con encabezado <code className="text-cyan-300 font-mono text-[10px]">frame-ancestors *</code> autorizado para integrarse de inmediato en las aulas virtuales institucionales.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 text-[11px] font-mono text-slate-400">
              SNIPPET: IFRAME 100% RESPONSIVO
            </div>
          </div>

          {/* Bento Tile 4: BYOK Security Vault (Span 2) */}
          <div className="md:col-span-2 bento-card p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-emerald-400 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-500/30">
                  SEGURIDAD // CRIPTOGRAFÍA
                </span>
                <span className="text-xs font-mono text-emerald-400">FERNET AES-128-CBC</span>
              </div>
              <h3 className="text-xl font-bold text-white font-display">
                Bóveda de Credenciales BYOK con Cifrado Simétrico
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                Cada docente aporta su propia API Key gratuita de OpenRouter. Las claves son cifradas simétricamente en el servidor y nunca se almacenan ni transmiten en texto plano, manteniendo la privacidad de la cuenta y el costo cero para la plataforma.
              </p>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-[#07080c]/80 border border-white/10 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>MODELOS SOPORTADOS: GEMMA 26B · NEMOTRON · GPT-OSS</span>
              <span className="text-cyan-400">BYOK ZERO-STORE</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass-panel border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center font-display font-bold text-xs text-white">
              E
            </div>
            <div>
              <span className="font-bold text-white font-display text-sm">EduRAG</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Plataforma SaaS de RAG Pedagógico para Educación Superior y Secundaria.</p>
            </div>
          </div>

          <nav className="flex items-center gap-6 font-medium text-slate-300" aria-label="Navegación inferior">
            <Link href="/login" className="hover:text-white transition-colors">Acceso Docentes</Link>
            <Link href="/marketplace" className="hover:text-white transition-colors">Marketplace</Link>
            <Link href="/admin" className="hover:text-white transition-colors">Administración</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
