"use client";

import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "¿Cómo integro el tutor en Moodle o Canvas LMS?",
    answer: "Una vez creado y publicado el chatbot, en la sección 'Incrustar' del panel docente obtendrás un código HTML <iframe> de 1 sola línea. En Moodle o Canvas, añade un recurso 'Página' o 'Etiqueta', pega el código en el editor HTML y el tutor se desplegará instantáneamente dentro del curso con soporte de pantalla completa.",
  },
  {
    question: "¿Por qué el costo operativo es $0/mes permanente?",
    answer: "EduRAG utiliza el Free Tier de Supabase (PostgreSQL 15), Vercel para el frontend y Railway para la API de FastAPI. Al eliminar bases de datos vectoriales costosas y utilizar APIs gratuitas de OpenRouter (modelos abiertos como Gemma 2 27B o Nemotron 70B con el sistema BYOK), no hay costes fijos ni límites por alumno.",
  },
  {
    question: "¿Qué formatos de archivo puedo subir para entrenar el tutor?",
    answer: "Puedes subir archivos en formato PDF digital (.pdf), documentos de Microsoft Word (.docx con soporte completo de tablas), archivos Markdown (.md) y texto plano (.txt). El sistema valida las firmas binarias (magic bytes) para máxima seguridad y extrae el contenido automáticamente.",
  },
  {
    question: "¿Mis documentos se utilizan para re-entrenar modelos públicos de IA?",
    answer: "No. Los documentos se almacenan de forma privada en tu base de datos de Supabase protegida por políticas RLS y únicamente se inyectan en la ventana de contexto de la inferencia solicitada por tus alumnos. Nunca se comparten con terceros ni se usan para entrenamiento público.",
  },
  {
    question: "¿Qué sucede si un estudiante pregunta algo que no está en los documentos?",
    answer: "Si configuras el nivel de restricción en 'Socrático Estricto', el tutor responderá con amabilidad indicando que dicho tema no está contemplado en el programa del curso y orientará al estudiante hacia los temas disponibles, evitando alucinaciones o respuestas inventadas.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-500/30">
          Preguntas Frecuentes
        </span>
        <h2 className="text-2xl sm:text-4xl font-bold text-zinc-100 tracking-tight">
          Respuestas Claras para Docentes e Instituciones
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Todo lo que necesitas saber sobre privacidad, compatibilidad curricular y costos.
        </p>
      </div>

      <div className="space-y-4">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden transition-colors"
            >
              <button
                onClick={() => toggle(idx)}
                aria-expanded={isOpen}
                className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 font-semibold text-zinc-100 text-sm sm:text-base hover:text-white transition-colors"
              >
                <span>{faq.question}</span>
                <span className="text-zinc-400 text-lg transition-transform duration-200 shrink-0">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/60 pt-4">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
