export function ComparisonSection() {
  const criteria = [
    {
      feature: "Fuente de Verdad & Contenido",
      generic: "Internet público general. Propenso a alucinaciones y datos no vistos en clase.",
      edurag: "Estrictamente restringido a los PDFs, guías y sílabos subidos por el docente.",
    },
    {
      feature: "Trazabilidad Académica",
      generic: "Sin referencias de página o capítulo comprobables.",
      edurag: "Citas exactas con nombre de archivo, número de fragmento y módulo curricular.",
    },
    {
      feature: "Costo Operativo Mensual",
      generic: "$20/mes por licencia institucional de usuario.",
      edurag: "$0/mes permanente. Arquitectura RAG léxica + APIs gratuitas OpenRouter (BYOK).",
    },
    {
      feature: "Integración con Aulas Virtuales",
      generic: "Requiere abrir pestañas externas o logins de terceros dispersos.",
      edurag: "Incrustación nativa vía iframe en Moodle, Canvas, Blackboard y Teams con 1 clic.",
    },
    {
      feature: "Privacidad y Aislamiento de Datos",
      generic: "Datos frecuentemente compartidos para re-entrenamiento de modelos.",
      edurag: "Aislamiento multi-tenant estricto. Cifrado Fernet AES-128 para credenciales.",
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-500/30">
          Diferenciación Didáctica
        </span>
        <h2 className="text-2xl sm:text-4xl font-bold text-zinc-100 tracking-tight">
          ¿Por qué un Tutor Curricular en vez de un Chatbot Genérico?
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Diseñado específicamente para alinearse con los objetivos de aprendizaje de tu cátedra, sin desvíos ni respuestas inventadas.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80">
                <th className="p-4 sm:p-5 font-semibold text-zinc-400 w-1/4">Criterio</th>
                <th className="p-4 sm:p-5 font-semibold text-zinc-400 w-3/8">Chatbots Genéricos</th>
                <th className="p-4 sm:p-5 font-bold text-indigo-300 bg-indigo-950/30 w-3/8 border-l border-indigo-500/20">
                  EduRAG (Tutor Curricular)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {criteria.map((row, idx) => (
                <tr key={idx} className="hover:bg-zinc-850/30 transition-colors">
                  <td className="p-4 sm:p-5 font-medium text-zinc-200">{row.feature}</td>
                  <td className="p-4 sm:p-5 text-zinc-400 leading-relaxed">{row.generic}</td>
                  <td className="p-4 sm:p-5 text-zinc-200 font-medium leading-relaxed bg-indigo-950/20 border-l border-indigo-500/20">
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 mr-2">✓</span>
                    {row.edurag}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
