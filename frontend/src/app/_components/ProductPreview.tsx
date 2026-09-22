"use client";

import { useState } from "react";

interface SubjectDemo {
  id: string;
  name: string;
  level: string;
  question: string;
  responseTitle: string;
  responseSteps: string[];
  formula?: string;
  sourceDoc: string;
}

const DEMOS: SubjectDemo[] = [
  {
    id: "calculus",
    name: "Tutor de Cálculo I",
    level: "Universidad",
    question: "¿Cómo se deduce y aplica la regla de la cadena para funciones compuestas?",
    responseTitle: "Guía Didáctica — Regla de la Cadena",
    responseSteps: [
      "Para una función compuesta y = f(g(x)), definimos la variable intermedia u = g(x).",
      "Al evaluar la tasa de cambio instantáneo mediante el límite de incrementos:",
    ],
    formula: "\\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx} = f'(g(x)) \\cdot g'(x)",
    sourceDoc: "Guia_Derivadas_Capitulo4.pdf (Fragmento #3)",
  },
  {
    id: "physics",
    name: "Tutor de Física Clásica",
    level: "Secundaria & Universidad",
    question: "¿Por qué la aceleración en un oscilador armónico simple es proporcional a la posición?",
    responseTitle: "Explicación Conceptual — Movimiento Armónico",
    responseSteps: [
      "Por la Ley de Hooke, la fuerza restauradora es F = -k·x.",
      "Aplicando la Segunda Ley de Newton (F = m·a), despejamos la aceleración:",
    ],
    formula: "a(t) = -\\frac{k}{m} x(t) = -\\omega^2 x(t)",
    sourceDoc: "Laboratorio_Oscilaciones_2026.docx (Fragmento #1)",
  },
  {
    id: "programming",
    name: "Tutor de Algoritmos",
    level: "Universidad",
    question: "¿Cuál es la diferencia de complejidad temporal entre MergeSort y QuickSort en el peor caso?",
    responseTitle: "Análisis Asintótico",
    responseSteps: [
      "MergeSort siempre divide el arreglo en mitades iguales y combina en O(n), garantizando O(n log n) en todos los casos.",
      "QuickSort con pivote desbalanceado puede degenerar a O(n²), aunque en el caso promedio alcanza O(n log n).",
    ],
    formula: "T_{merge}(n) = 2T(n/2) + O(n) \\implies O(n \\log n)",
    sourceDoc: "Estructuras_Datos_Tema2.md (Fragmento #5)",
  },
];

export function ProductPreview() {
  const [activeSubject, setActiveSubject] = useState(DEMOS[0].id);
  const current = DEMOS.find((d) => d.id === activeSubject) || DEMOS[0];

  return (
    <div className="w-full max-w-5xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-2xl overflow-hidden">
      {/* Header bar with subject tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 bg-zinc-950/70 px-4 py-3 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-zinc-700" />
          <div className="w-3 h-3 rounded-full bg-zinc-700" />
          <div className="w-3 h-3 rounded-full bg-zinc-700" />
          <span className="text-xs text-zinc-400 font-medium ml-2">Vista previa interactiva del tutor</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0" role="tablist">
          {DEMOS.map((demo) => (
            <button
              key={demo.id}
              role="tab"
              aria-selected={activeSubject === demo.id}
              onClick={() => setActiveSubject(demo.id)}
              className={`btn-press px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeSubject === demo.id
                  ? "bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              {demo.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Preview Body */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* Tutor info bar */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/60 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-200 text-xs">
              AI
            </div>
            <div>
              <p className="font-semibold text-zinc-200">{current.name}</p>
              <p className="text-zinc-400 text-[11px]">{current.level} · Respuestas basadas en apuntes de clase</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Activo
          </span>
        </div>

        {/* Message: Student */}
        <div className="flex items-start gap-3 max-w-2xl ml-auto justify-end">
          <div className="bg-zinc-800 text-zinc-100 rounded-2xl rounded-tr-sm px-4 py-3 text-xs sm:text-sm border border-zinc-700 shadow-sm">
            <p className="font-medium">{current.question}</p>
          </div>
          <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-medium text-zinc-300 flex-shrink-0">
            Est
          </div>
        </div>

        {/* Message: Tutor Response */}
        <div className="flex items-start gap-3 max-w-2xl mr-auto">
          <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-200 flex-shrink-0">
            AI
          </div>
          <div className="bg-zinc-950/80 rounded-2xl rounded-tl-sm p-4 sm:p-5 text-xs sm:text-sm border border-zinc-800 text-zinc-200 space-y-3 shadow-sm">
            <h4 className="font-semibold text-zinc-100 text-sm">{current.responseTitle}</h4>
            
            {current.responseSteps.map((step, idx) => (
              <p key={idx} className="text-zinc-300 leading-relaxed">
                {step}
              </p>
            ))}

            {current.formula && (
              <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 text-center font-mono text-xs sm:text-sm text-zinc-200">
                {current.formula}
              </div>
            )}

            {/* Source Citation Badge */}
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="inline-flex items-center gap-1.5 text-zinc-400">
                <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Fuente verificada: <strong className="text-zinc-300 font-medium">{current.sourceDoc}</strong>
              </span>
              <span className="text-zinc-500 text-[10px]">0.3s latencia</span>
            </div>
          </div>
        </div>

        {/* Mock prompt input bar */}
        <div className="pt-2">
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-500">
            <span className="flex-1 truncate">Escribe una pregunta sobre el material del curso...</span>
            <button
              type="button"
              className="px-3 py-1 bg-zinc-100 text-zinc-900 rounded-lg text-xs font-medium hover:bg-white transition-colors"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
