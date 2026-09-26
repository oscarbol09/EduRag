export function FeatureMatrix() {
  const features = [
    {
      title: "Arquitectura RAG Léxica de Costo $0",
      description: "Eliminamos ChromaDB y bases vectoriales pesadas que provocan fallos por timeout en contenedores. El texto se almacena en PostgreSQL y se inyecta por ranking de overlap de términos clave en memoria ultrarrápida.",
      badge: "Zero ChromaDB Overhead",
      icon: (
        <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      title: "Bóveda de Credenciales BYOK con Cifrado Fernet",
      description: "Cada docente utiliza su propia API Key gratuita de OpenRouter para modelos de última generación (Gemma 2 27B, Nemotron 70B). Las claves se cifran simétricamente con Fernet AES-128 en el backend.",
      badge: "Cifrado Simétrico AES-128",
      icon: (
        <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
    {
      title: "Embebible en Aulas Virtuales LMS vía Iframe",
      description: "Generación automática de códigos de inserción Iframe con políticas de seguridad CSP y frame-ancestors configuradas para integración transparente en Moodle, Canvas LMS, Blackboard y Microsoft Teams.",
      badge: "Moodle & Canvas Ready",
      icon: (
        <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
    },
    {
      title: "Aislamiento Estricto de Datos Multi-Tenant",
      description: "Toda consulta a la base de datos y a los archivos está rigurosamente acotada por `owner_id` y `chatbot_id`. Las conversaciones de estudiantes y documentos de docentes permanecen estrictamente confidenciales.",
      badge: "Row Level Security (RLS)",
      icon: (
        <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      title: "Streaming Token a Token de Baja Latencia",
      description: "Implementación Server-Sent Events (SSE) en FastAPI que transmite las palabras en tiempo real directamente al navegador, manteniendo viva la conexión en redes académicas con proxies restrictivos.",
      badge: "SSE text/event-stream",
      icon: (
        <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      title: "Extracción Multi-Formato Robusta",
      description: "Procesamiento nativo para archivos PDF (PyMuPDF), documentos de Word (python-docx con soporte de tablas), Markdown y texto plano, con validación de magic bytes para evitar spoofing.",
      badge: "PDF · DOCX · MD · TXT",
      icon: (
        <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-500/30">
          Ingeniería de la Plataforma
        </span>
        <h2 className="text-2xl sm:text-4xl font-bold text-zinc-100 tracking-tight">
          Construido con Estándares de Producción y Rigor Académico
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Diseñado para funcionar sin interrupciones, con costos $0/mes y privacidad total para docentes y alumnos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feat, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-7 space-y-4 hover:border-zinc-700 transition-colors shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-850 border border-zinc-800 flex items-center justify-center">
                {feat.icon}
              </div>
              <h3 className="text-base font-bold text-zinc-100 tracking-tight">
                {feat.title}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                {feat.description}
              </p>
            </div>

            <div className="pt-3 border-t border-zinc-800/80">
              <span className="text-[11px] font-mono font-medium text-indigo-300">
                {feat.badge}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
