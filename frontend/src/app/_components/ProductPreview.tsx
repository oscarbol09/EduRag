"use client";

import { useState } from "react";

interface SubjectDemo {
  id: string;
  name: string;
  category: string;
  level: string;
  question: string;
  responseTitle: string;
  responseSteps: string[];
  formula?: string;
  sourceDoc: string;
  citationPage: string;
}

const DEMOS: SubjectDemo[] = [
  {
    id: "calculus",
    name: "Cálculo Diferencial",
    category: "Ciencias Exactas",
    level: "Universidad",
    question: "¿Cómo se deduce y aplica la regla de la cadena para funciones compuestas?",
    responseTitle: "Deducción Didáctica — Regla de la Cadena",
    responseSteps: [
      "Para una función compuesta y = f(g(x)), definimos la variable intermedia u = g(x).",
      "Al calcular la derivada como tasa de cambio compuesta respecto a x obtenemos el producto de derivadas:",
    ],
    formula: "\\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx} = f'(g(x)) \\cdot g'(x)",
    sourceDoc: "Silabo_Calculo_Diferencial_2026.pdf",
    citationPage: "Capítulo 4, pág. 42",
  },
  {
    id: "physics",
    name: "Física Ondulatoria",
    category: "Ingeniería",
    level: "Universidad",
    question: "¿Por qué la aceleración en un oscilador armónico simple es directamente opuesta al desplazamiento?",
    responseTitle: "Fundamento Teórico — Movimiento Armónico",
    responseSteps: [
      "Por la Ley de Hooke, la fuerza elástica restauradora es F = -k·x.",
      "Combinando con la 2da Ley de Newton (F = m·a), despejamos la aceleración instantánea:",
    ],
    formula: "a(t) = -\\frac{k}{m} x(t) = -\\omega^2 x(t)",
    sourceDoc: "Guia_Laboratorio_Oscilaciones.docx",
    citationPage: "Módulo 2, Sección 2.1",
  },
  {
    id: "algorithms",
    name: "Estructuras de Datos",
    category: "Informática",
    level: "Universidad",
    question: "¿Cuál es la diferencia de complejidad temporal entre MergeSort y QuickSort en el peor caso?",
    responseTitle: "Análisis de Complejidad Asintótica",
    responseSteps: [
      "MergeSort divide siempre el arreglo en mitades iguales y combina en O(n), asegurando O(n log n) en el peor caso.",
      "QuickSort con particiones degeneradas (pivote desbalanceado) puede alcanzar O(n²), aunque en promedio ofrece O(n log n).",
    ],
    formula: "T_{merge}(n) = 2T(n/2) + O(n) \\implies O(n \\log n)",
    sourceDoc: "Apuntes_Algoritmos_Avanzados.md",
    citationPage: "Capítulo 3, pág. 18",
  },
  {
    id: "biology",
    name: "Biología Celular",
    category: "Ciencias de la Salud",
    level: "Secundaria & Pregrado",
    question: "¿Cuál es el rol de la ATP sintasa en la membrana mitocondrial interna?",
    responseTitle: "Mecanismo Quimiosmótico de Mitchell",
    responseSteps: [
      "El gradiente electroquímico de protones acumulados en el espacio intermembranal genera una fuerza protón-motriz.",
      "La ATP sintasa utiliza el flujo de retorno de H⁺ hacia la matriz para fosforilar ADP en ATP.",
    ],
    formula: "ADP + P_i + H^+_{inter} \\xrightarrow{\\text{ATP sintasa}} ATP + H_2O + H^+_{matriz}",
    sourceDoc: "Bioquimica_Celular_Guia_Oficial.pdf",
    citationPage: "Capítulo 7, pág. 89",
  },
];

export function ProductPreview() {
  const [activeTab, setActiveTab] = useState<"chat" | "ingestion" | "calibration">("chat");
  const [activeDemoId, setActiveDemoId] = useState(DEMOS[0].id);
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  // Calibration state for demo tab
  const [tone, setTone] = useState<"formal" | "friendly" | "technical">("friendly");
  const [restriction, setRestriction] = useState<"strict" | "guided" | "open">("guided");
  const [audience, setAudience] = useState<"secondary" | "university">("university");

  const currentDemo = DEMOS.find((d) => d.id === activeDemoId) || DEMOS[0];

  const embedCodeSnippet = `<iframe\n  src="https://edu-rag-red.vercel.app/chat/bot-ejemplo-calculo"\n  width="100%"\n  height="600"\n  frameborder="0"\n  allow="clipboard-write"\n></iframe>`;

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCodeSnippet);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-2xl overflow-hidden backdrop-blur-sm">
      {/* Studio Top Navigation Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-4 sm:px-6 py-3.5 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <div className="w-3 h-3 rounded-full bg-red-500/80 border border-red-400/40" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-400/40" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-400/40" />
          </div>
          <span className="text-xs font-semibold text-zinc-300 tracking-tight">
            Studio Interactivo EduRAG
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 text-[11px] font-medium text-zinc-400">
            v2.0 • Muestra en Vivo
          </span>
        </div>

        {/* Studio Mode Tabs */}
        <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800 text-xs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "chat"}
            onClick={() => setActiveTab("chat")}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === "chat"
                ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            1. Tutor en Acción (Citas)
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "ingestion"}
            onClick={() => setActiveTab("ingestion")}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === "ingestion"
                ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            2. Ingestión Curricular
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "calibration"}
            onClick={() => setActiveTab("calibration")}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === "calibration"
                ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            3. Calibrador Didáctico
          </button>
        </div>
      </div>

      {/* Tab 1: Live Chat with Real Citations & LMS Embed Modal */}
      {activeTab === "chat" && (
        <div className="p-4 sm:p-8 space-y-6">
          {/* Subject Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
            <div>
              <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Selecciona una materia:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {DEMOS.map((demo) => (
                  <button
                    key={demo.id}
                    onClick={() => setActiveDemoId(demo.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeDemoId === demo.id
                        ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                        : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800"
                    }`}
                  >
                    {demo.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEmbedCode(!showEmbedCode)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                {showEmbedCode ? "Ocultar Embed LMS" : "Ver Código Embed Moodle/Canvas"}
              </button>
            </div>
          </div>

          {/* Embed Code Drawer */}
          {showEmbedCode && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">
                  Código de incrustación Iframe (Compatible con Moodle, Canvas, Blackboard, Teams):
                </span>
                <button
                  onClick={handleCopyEmbed}
                  className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
                >
                  {copiedEmbed ? "¡Copiado al portapapeles!" : "Copiar código"}
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-zinc-900 text-zinc-300 font-mono text-xs overflow-x-auto border border-zinc-800/80">
                {embedCodeSnippet}
              </pre>
            </div>
          )}

          {/* Chat Interface Preview */}
          <div className="space-y-4 max-w-4xl mx-auto">
            {/* Header info */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300">
                  {currentDemo.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-200 text-sm">{currentDemo.name}</h3>
                  <p className="text-zinc-400 text-xs">
                    {currentDemo.category} · {currentDemo.level} · Trazabilidad basada en documentos de clase
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Tutor Activo ($0/mes)
              </span>
            </div>

            {/* Student Query Bubble */}
            <div className="flex items-start gap-3 max-w-2xl ml-auto justify-end">
              <div className="bg-zinc-800 text-zinc-100 rounded-2xl rounded-tr-none px-4 py-3 text-xs sm:text-sm border border-zinc-700 shadow-md">
                <p className="font-medium leading-relaxed">{currentDemo.question}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 shrink-0">
                Est
              </div>
            </div>

            {/* Tutor Response Bubble */}
            <div className="flex items-start gap-3 max-w-3xl mr-auto">
              <div className="w-8 h-8 rounded-full bg-indigo-900 border border-indigo-600 flex items-center justify-center text-xs font-bold text-indigo-100 shrink-0 shadow-sm">
                IA
              </div>
              <div className="bg-zinc-950 rounded-2xl rounded-tl-none p-5 text-xs sm:text-sm border border-zinc-800 text-zinc-200 space-y-3.5 shadow-lg">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                  <h4 className="font-bold text-zinc-100 text-sm">{currentDemo.responseTitle}</h4>
                  <span className="text-[11px] text-zinc-500 font-mono">Inferencia: 0.28s</span>
                </div>

                {currentDemo.responseSteps.map((step, idx) => (
                  <p key={idx} className="text-zinc-300 leading-relaxed">
                    {step}
                  </p>
                ))}

                {currentDemo.formula && (
                  <div className="bg-zinc-900/90 rounded-xl p-3.5 border border-zinc-800 text-center font-mono text-xs sm:text-sm text-indigo-200 shadow-inner">
                    {currentDemo.formula}
                  </div>
                )}

                {/* Source Verification Chip */}
                <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Fuente Verificada:</span>
                    <strong className="text-zinc-100 font-medium">{currentDemo.sourceDoc}</strong>
                    <span className="text-zinc-500 text-[11px]">({currentDemo.citationPage})</span>
                  </div>
                  <span className="text-zinc-500 text-[11px]">Cero Alucinaciones Fuera de Programa</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Document Ingestion Pipeline */}
      {activeTab === "ingestion" && (
        <div className="p-4 sm:p-8 space-y-6">
          <div className="max-w-3xl mx-auto text-center space-y-2">
            <h3 className="text-lg font-bold text-zinc-100">Pipeline de Ingestión Léxica sin ChromaDB</h3>
            <p className="text-xs sm:text-sm text-zinc-400">
              Sube tus documentos académicos. EduRAG valida magic bytes, extrae el texto, calcula hashes SHA-256 anti-duplicados y construye fragmentos léxicos directos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-500/30 text-[10px] font-mono">PDF</span>
                <span className="text-emerald-400 text-xs font-semibold">100% Indexado</span>
              </div>
              <h4 className="font-semibold text-zinc-200 text-xs truncate">Silabo_Calculo_Diferencial.pdf</h4>
              <p className="text-[11px] text-zinc-400">Extraído con PyMuPDF. 18 fragmentos procesados.</p>
              <div className="text-[10px] font-mono text-zinc-500 pt-2 border-t border-zinc-900 truncate">
                SHA-256: 8f4a1c9e...b2d8
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-500/30 text-[10px] font-mono">DOCX</span>
                <span className="text-emerald-400 text-xs font-semibold">100% Indexado</span>
              </div>
              <h4 className="font-semibold text-zinc-200 text-xs truncate">Guia_Laboratorio_Fisica.docx</h4>
              <p className="text-[11px] text-zinc-400">Extraído con python-docx. Tablas y texto estructurados.</p>
              <div className="text-[10px] font-mono text-zinc-500 pt-2 border-t border-zinc-900 truncate">
                SHA-256: 3c7e09f1...54a9
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/30 text-[10px] font-mono">MD</span>
                <span className="text-emerald-400 text-xs font-semibold">100% Indexado</span>
              </div>
              <h4 className="font-semibold text-zinc-200 text-xs truncate">Apuntes_Estructuras_Datos.md</h4>
              <p className="text-[11px] text-zinc-400">Texto nativo UTF-8 con bloques de código y fórmulas.</p>
              <div className="text-[10px] font-mono text-zinc-500 pt-2 border-t border-zinc-900 truncate">
                SHA-256: a1e88d02...37f1
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-zinc-200">Presupuesto de Ventana de Contexto:</h4>
              <p className="text-[11px] text-zinc-400">Ranking léxico adaptativo con presupuesto de hasta 60.000 caracteres por inferencia.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Overhead de Memoria: 0 MB
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Pedagogical Calibration Controls */}
      {activeTab === "calibration" && (
        <div className="p-4 sm:p-8 space-y-6">
          <div className="max-w-3xl mx-auto text-center space-y-2">
            <h3 className="text-lg font-bold text-zinc-100">Calibración Pedagógica en Tiempo Real</h3>
            <p className="text-xs sm:text-sm text-zinc-400">
              Personaliza cómo responde el tutor sin escribir complejas instrucciones de sistema. EduRAG ensambla el prompt socrático automáticamente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Tone Selector */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-3">
              <label className="block text-xs font-semibold text-zinc-200">Tono Didáctico</label>
              <div className="space-y-2">
                {[
                  { key: "friendly", label: "Amigable y Motivador", desc: "Empático y alentador" },
                  { key: "formal", label: "Académico Formal", desc: "Rigor universitario estructurado" },
                  { key: "technical", label: "Técnico Especializado", desc: "Preciso y formal" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setTone(item.key as any)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                      tone === item.key
                        ? "bg-indigo-950/50 border-indigo-500/50 text-indigo-200"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="font-medium">{item.label}</div>
                    <div className="text-[10px] text-zinc-500">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Restriction Level */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-3">
              <label className="block text-xs font-semibold text-zinc-200">Rigor de Restricción</label>
              <div className="space-y-2">
                {[
                  { key: "strict", label: "Socrático Estricto", desc: "Solo responde con el contexto provisto" },
                  { key: "guided", label: "Guiado con Ejemplos", desc: "Usa contexto y complementa didáctica" },
                  { key: "open", label: "Ampliación Libre", desc: "Expande con analogías externas" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setRestriction(item.key as any)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                      restriction === item.key
                        ? "bg-indigo-950/50 border-indigo-500/50 text-indigo-200"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="font-medium">{item.label}</div>
                    <div className="text-[10px] text-zinc-500">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Audience */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-3">
              <label className="block text-xs font-semibold text-zinc-200">Nivel del Estudiante</label>
              <div className="space-y-2">
                {[
                  { key: "university", label: "Educación Superior", desc: "Pregrado, Posgrado, Técnico" },
                  { key: "secondary", label: "Educación Secundaria", desc: "Bachillerato y ciclo medio" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setAudience(item.key as any)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                      audience === item.key
                        ? "bg-indigo-950/50 border-indigo-500/50 text-indigo-200"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="font-medium">{item.label}</div>
                    <div className="text-[10px] text-zinc-500">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generated System Instruction Preview */}
          <div className="max-w-4xl mx-auto p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
            <span className="text-[11px] font-semibold text-zinc-400">System Prompt Generado en Tiempo Real:</span>
            <p className="text-xs text-zinc-300 font-mono leading-relaxed bg-zinc-900/60 p-3 rounded-lg border border-zinc-850">
              {tone === "formal" && "Adopta un tono formal, estructurado y de alto rigor académico. "}
              {tone === "friendly" && "Adopta un tono amigable, empático, cercano y motivador. "}
              {tone === "technical" && "Adopta un tono técnico, preciso y centrado en la exactitud conceptual. "}
              {restriction === "strict" && "Cíñete ESTRICTAMENTE al contexto curricular provisto. Cita fuentes explícitamente. "}
              {restriction === "guided" && "Usa el contexto provisto como base principal, complementando con analogías didácticas. "}
              {restriction === "open" && "Usa el contexto como punto de partida y enriquece la explicación con ejemplos libres. "}
              Fomenta el autoaprendizaje activo y cita siempre el nombre de los documentos fuente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
