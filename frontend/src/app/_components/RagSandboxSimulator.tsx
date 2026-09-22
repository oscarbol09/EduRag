"use client";

import React, { useState } from "react";

const SAMPLE_DOCS = [
  {
    id: "calculus",
    title: "Cálculo I — Regla de la Cadena & Optimización.pdf",
    tag: "MATEMÁTICAS // UNIV-01",
    sampleQuery: "¿Cómo se deduce la regla de la cadena para funciones compuestas?",
    chunks: [
      "[CHUNK 01] Teorema 4.2: Si g es diferenciable en x y f es diferenciable en g(x), entonces la función compuesta F = f ∘ g es diferenciable en x y F'(x) = f'(g(x)) · g'(x).",
      "[CHUNK 02] Interpretación geométrica: El cambio infinitesimal dy/dx se obtiene como producto de las tasas de variación intermedias (dy/du) · (du/dx).",
    ],
    socraticResponse:
      "Para deducir la regla de la cadena, examinemos primero cómo varía la función interna \\( u = g(x) \\) ante un incremento \\( \\Delta x \\). ¿Qué ocurre con el cociente \\( \\frac{\\Delta y}{\\Delta x} \\) si multiplicamos y dividimos por \\( \\Delta u \\)? \n\n$$\\frac{dy}{dx} = \\lim_{\\Delta x \\to 0} \\frac{\\Delta y}{\\Delta u} \\cdot \\frac{\\Delta u}{\\Delta x}$$",
    directResponse:
      "La regla de la cadena establece que la derivada de una función compuesta \\( F(x) = f(g(x)) \\) es el producto de la derivada exterior evaluada en la función interior por la derivada de la función interior: \n\n$$F'(x) = f'(g(x)) \\cdot g'(x)$$\n\n*Fuente: Teorema 4.2 del sílabo del curso.*",
  },
  {
    id: "physics",
    title: "Física II — Oscilador Armónico Simple & Resonancia.docx",
    tag: "FÍSICA // LAB-03",
    sampleQuery: "¿Cuál es la condición para que ocurra resonancia en un oscilador forzado?",
    chunks: [
      "[CHUNK 01] Guía 3: Para un oscilador amortiguado sometido a una fuerza impulsora periódica F(t) = F_0 cos(ωt), la amplitud de respuesta depende de la frecuencia impulsora ω.",
      "[CHUNK 02] Condición de resonancia: La amplitud máxima ocurre cuando la frecuencia impulsora coincide exactamente con la frecuencia natural del sistema: ω = ω_0.",
    ],
    socraticResponse:
      "Observa la ecuación de amplitud del oscilador forzado. ¿Qué término en el denominador \\( \\sqrt{(\\omega_0^2 - \\omega^2)^2 + (\\gamma \\omega)^2} \\) se anula cuando variamos la frecuencia exterior \\( \\omega \\) hacia \\( \\omega_0 \\)?",
    directResponse:
      "La resonancia ocurre cuando la frecuencia angular de la fuerza externa \\( \\omega \\) iguala la frecuencia angular natural del oscilador \\( \\omega_0 \\), maximizando la transferencia de energía al sistema y provocando un pico en la amplitud de oscilación.\n\n$$\\omega = \\omega_0 = \\sqrt{\\frac{k}{m}}$$",
  },
];

export function RagSandboxSimulator() {
  const [selectedDocId, setSelectedDocId] = useState<string>("calculus");
  const [mode, setMode] = useState<"socratic" | "direct">("socratic");
  const [isSimulating, setIsSimulating] = useState(false);

  const currentDoc = SAMPLE_DOCS.find((d) => d.id === selectedDocId) || SAMPLE_DOCS[0];

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
    }, 450);
  };

  return (
    <div className="bento-card p-6 sm:p-8 border border-white/15 bg-gradient-to-b from-[#0d0f17]/90 to-[#07080c]/90">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 led-pulse" aria-hidden="true" />
            <h3 className="font-display font-bold text-white text-base tracking-tight">
              Simulador Interactivo de RAG Pedagógico
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Comprueba cómo el motor extrae chunks léxicos y calibra la respuesta en tiempo real
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#07080c] border border-white/10 self-start sm:self-auto font-mono text-xs">
          <button
            type="button"
            onClick={() => setMode("socratic")}
            className={`px-3 py-1 rounded-md transition-all btn-press ${
              mode === "socratic"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-900/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Método Socrático
          </button>
          <button
            type="button"
            onClick={() => setMode("direct")}
            className={`px-3 py-1 rounded-md transition-all btn-press ${
              mode === "direct"
                ? "bg-cyan-600 text-white shadow-sm shadow-cyan-900/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Respuesta Directa
          </button>
        </div>
      </div>

      {/* Main Sandbox Grid */}
      <div className="grid lg:grid-cols-12 gap-6 pt-6">
        {/* Left Column: Document Selection & Chunks */}
        <div className="lg:col-span-5 space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-indigo-300 mb-2">
              1. Documento Curricular Activo
            </label>
            <div className="space-y-2">
              {SAMPLE_DOCS.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    setSelectedDocId(doc.id);
                    handleRunSimulation();
                  }}
                  className={`btn-press w-full text-left p-3 rounded-xl border transition-all ${
                    selectedDocId === doc.id
                      ? "bg-white/[0.06] border-indigo-400/50 shadow-md shadow-indigo-950/30"
                      : "bg-[#07080c]/60 border-white/[0.06] hover:border-white/15 text-slate-400"
                  }`}
                >
                  <span className="text-[10px] font-mono text-cyan-400 block mb-0.5">{doc.tag}</span>
                  <p className="text-xs font-semibold text-slate-200 truncate">{doc.title}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2">
              2. Fragmentos Extraídos (Overlap 200c)
            </label>
            <div className="space-y-2 font-mono text-[11px] text-slate-300">
              {currentDoc.chunks.map((chunk, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-[#07080c]/80 border border-white/10 leading-relaxed">
                  <span className="text-amber-400 font-semibold block mb-0.5">CHUNK 0{idx + 1} // OVERLAP RANK #1</span>
                  {chunk}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Simulated Question & Synthesized Output */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-xl bg-[#07080c] border border-white/10 p-5">
          <div className="space-y-4">
            {/* Question */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/10">
              <div className="w-7 h-7 rounded-lg bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 flex items-center justify-center text-xs font-bold font-mono shrink-0">
                Q
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Consulta del Estudiante</span>
                <p className="text-xs font-medium text-slate-100 mt-0.5">{currentDoc.sampleQuery}</p>
              </div>
            </div>

            {/* Answer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 led-pulse" />
                  Respuesta Sintetizada ({mode === "socratic" ? "Guía Socrática" : "Directa"})
                </span>
                <span className="text-[10px] font-mono text-slate-500">LATENCY ~350ms</span>
              </div>

              {isSimulating ? (
                <div className="p-6 text-center text-slate-400 text-xs font-mono animate-pulse">
                  Generando respuesta mediante chunking contextual...
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#121522]/80 to-[#0d0f17]/90 border border-white/10 text-xs text-slate-200 leading-relaxed space-y-3 font-sans">
                  <p className="whitespace-pre-line">{mode === "socratic" ? currentDoc.socraticResponse : currentDoc.directResponse}</p>
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="text-indigo-300">CITA // {currentDoc.title}</span>
                    <span className="text-emerald-400">0% ALUCINACIÓN</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>MODO INFERENCIA: OPENROUTER FREE</span>
            <span className="text-cyan-400">VENTANA: 60,000 CHARS MAX</span>
          </div>
        </div>
      </div>
    </div>
  );
}
