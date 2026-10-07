export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Carga Curricular Directa",
      description: "Sube guías de estudio, sílabos o apuntes de cátedra en PDF, Word (.docx), Markdown o TXT. El sistema valida la integridad de los archivos y extrae el texto limpio.",
      badge: "Soporte Multi-Formato",
      tag: "PyMuPDF & python-docx",
    },
    {
      number: "02",
      title: "Segmentación & Hash Anti-Duplicados",
      description: "El contenido se divide en bloques semánticos de 1.500 caracteres con overlap contextual. Se calcula un hash SHA-256 para evitar cargas duplicadas y proteger la base de datos.",
      badge: "Chunking Léxico 1.5k",
      tag: "SHA-256 Hash",
    },
    {
      number: "03",
      title: "Calibración Pedagógica Socrática",
      description: "Configura el nivel educativo, el tono didáctico y el nivel de restricción. El tutor responderá guiando al estudiante paso a paso sin darle respuestas vacías.",
      badge: "Método Socrático",
      tag: "BYOK OpenRouter",
    },
    {
      number: "04",
      title: "Despliegue e Integración LMS",
      description: "Copia el código iframe generado e incrusta el asistente directamente en tu aula virtual de Moodle, Canvas o Blackboard, o publícalo en el marketplace abierto.",
      badge: "Incrustación en 1 Clic",
      tag: "Moodle & Canvas LMS",
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-500/30">
          Flujo de Trabajo
        </span>
        <h2 className="text-2xl sm:text-4xl font-bold text-zinc-100 tracking-tight">
          De tus documentos a un tutor en el aula en 4 pasos
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Sin configuraciones complejas de servidores ni bases de datos vectoriales pesadas. Diseñado para la agilidad docente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="relative rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between space-y-4 hover:border-zinc-700 transition-colors shadow-sm"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-extrabold text-indigo-400/80 font-mono">
                  {step.number}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  {step.tag}
                </span>
              </div>
              <h3 className="text-base font-bold text-zinc-100 tracking-tight">
                {step.title}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {step.description}
              </p>
            </div>

            <div className="pt-3 border-t border-zinc-800/80">
              <span className="text-[11px] font-medium text-indigo-300">
                ✓ {step.badge}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
