import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Términos y Condiciones de Uso",
  description: "Términos y Condiciones de Uso de la plataforma EduRAG. Reglas de uso, propiedad intelectual, descargos de responsabilidad de IA y modelo BYOK.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-100 selection:bg-zinc-800 selection:text-white">
      <Navbar variant="public" backTo="/" backLabel="Volver al inicio" title="Términos del Servicio" />

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 flex-1 space-y-10">
        {/* Header */}
        <div className="border-b border-zinc-800 pb-8 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" aria-hidden="true" />
            <span>Contrato de Uso del Servicio y Gobernanza Académica</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
            Términos y Condiciones de Uso de EduRAG
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Última actualización y fecha de vigencia: <strong>26 de septiembre de 2026</strong>
          </p>
        </div>

        {/* Introduction */}
        <section className="space-y-4 text-xs sm:text-sm text-zinc-300 leading-relaxed">
          <p>
            Bienvenido a <strong>EduRAG</strong>. Al acceder a nuestro sitio web, registrar una cuenta de estudiante o docente, crear tutores inteligentes, subir documentos curriculares o consultar chatbots en el marketplace o embebidos en plataformas LMS externas (Moodle, Canvas, Blackboard), usted acepta quedar vinculado de forma plena por estos <strong>Términos y Condiciones de Uso</strong> y por nuestra <Link href="/privacy" className="text-zinc-100 underline">Política de Privacidad</Link>. Si no está de acuerdo con estos términos, le solicitamos abstenerse de utilizar el servicio.
          </p>
        </section>

        {/* Section 1: Service Description & BYOK Model */}
        <section className="card-clean rounded-xl p-6 sm:p-7 border border-zinc-800/80 bg-zinc-900/30 space-y-3">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-zinc-300">1</span>
            Naturaleza del Servicio y Arquitectura BYOK ($0 Costo)
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
            <p>
              EduRAG es una plataforma SaaS educativa que facilita la creación y despliegue de asistentes pedagógicos inteligentes basados en documentos de clase mediante técnicas de RAG léxico optimizado.
            </p>
            <p>
              La plataforma opera bajo el modelo <strong>BYOK (Bring Your Own Key)</strong>: los docentes configuran su propia clave de API gratuita o prepagada de OpenRouter. EduRAG no cobra tarifas recurrentes de suscripción de software en su modalidad base y garantiza un costo operativo de $0/mes a nivel de infraestructura para las instituciones educativas que adoptan el modelo.
            </p>
          </div>
        </section>

        {/* Section 2: Pricing & Refunds */}
        <section className="card-clean rounded-xl p-6 sm:p-7 border border-zinc-800/80 bg-zinc-900/30 space-y-3">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-zinc-300">2</span>
            Precios, Pagos y Política de Reembolsos
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
            <p>
              <strong>2.1 Ausencia de Cobros Directos:</strong> EduRAG no realiza cargos automáticos a tarjetas de crédito ni procesa pagos directos de suscripción de los usuarios estándar.
            </p>
            <p>
              <strong>2.2 Facturación de Proveedores de IA (OpenRouter):</strong> El consumo de tokens de inferencia computacional corre por cuenta del docente a través de su cuenta personal en OpenRouter Inc. Cualquier costo derivado del uso de modelos premium o créditos consumidos en OpenRouter es facturado directamente por dicho proveedor externo bajo sus propios términos comerciales.
            </p>
            <p>
              <strong>2.3 Política de Reembolso:</strong> Al tratarse de un servicio de acceso gratuito por parte de EduRAG, no aplican cobros ni reembolsos monetarios directos. Las eventuales disputas por créditos en OpenRouter deben tramitarse ante el soporte oficial de OpenRouter.
            </p>
          </div>
        </section>

        {/* Section 3: AI Disclaimer */}
        <section className="card-clean rounded-xl p-6 sm:p-7 border border-zinc-800/80 bg-zinc-900/30 space-y-3">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-zinc-300">3</span>
            Descargo de Responsabilidad sobre Inteligencia Artificial (AI Disclaimer)
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
            <p className="p-3.5 bg-amber-950/30 border border-amber-500/30 rounded-lg text-amber-200 text-xs leading-relaxed">
              <strong>Aviso Pedagógico Fundamental:</strong> Las respuestas generadas por los tutores son producidas por modelos probabilísticos de lenguaje natural basados en los fragmentos de texto disponibles en el contexto. Dichas respuestas constituyen <strong>material de apoyo didáctico y formativo</strong> y no reemplazan el juicio crítico, las evaluaciones formales ni las directrices oficiales del docente titular o de la institución educativa.
            </p>
            <p>
              EduRAG implementa salvaguardas de trazabilidad estricta de fuentes documentales, pero no garantiza la ausencia total de imprecisiones técnicas inherentes a los modelos de lenguaje (alucinaciones). El estudiante tiene la responsabilidad de cotejar las citas con los documentos oficiales de la asignatura.
            </p>
          </div>
        </section>

        {/* Section 4: Intellectual Property */}
        <section className="card-clean rounded-xl p-6 sm:p-7 border border-zinc-800/80 bg-zinc-900/30 space-y-3">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-zinc-300">4</span>
            Propiedad Intelectual y Soberanía de Documentos
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
            <p>
              <strong>4.1 Titularidad del Docente:</strong> Los docentes y las instituciones educativas conservan el <strong>100% de los derechos de autor, propiedad intelectual y titularidad patrimonial</strong> sobre todos los archivos, apuntes, presentaciones, libros y sílabos que suban a la plataforma.
            </p>
            <p>
              <strong>4.2 Licencia Limitada de Operación:</strong> Al subir un documento, el docente otorga a EduRAG una licencia técnica no exclusiva, temporal y estrictamente limitada para segmentar, indexar y cargar fragmentos del documento en el contexto de inferencia del LLM con el único propósito de responder a las consultas del curso. EduRAG <strong>nunca venderá, comercializará ni transferirá</strong> sus documentos a terceros.
            </p>
          </div>
        </section>

        {/* Section 5: Acceptable Use Policy */}
        <section className="card-clean rounded-xl p-6 sm:p-7 border border-zinc-800/80 bg-zinc-900/30 space-y-3">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-zinc-300">5</span>
            Política de Uso Aceptable (AUP)
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
            <p>El usuario se compromete a no realizar las siguientes conductas prohibidas:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
              <li>Subir documentos que contengan secretos industriales, datos personales altamente sensibles (médicos, biométricos) o material protegido por derechos de autor sin la debida autorización académica.</li>
              <li>Intentar manipular al tutor mediante técnicas de inyección de prompts maliciosas (*jailbreaks* o instrucciones para eludir restricciones éticas).</li>
              <li>Efectuar ataques de denegación de servicio (DoS/DDoS), extracción automatizada no autorizada (*scraping* abusivo) o ingeniería inversa de las APIs de la plataforma.</li>
              <li>Utilizar el servicio para facilitar el fraude académico sistemático o la suplantación de identidad institucional.</li>
            </ul>
          </div>
        </section>

        {/* Section 6: Service Availability & Disclaimers */}
        <section className="card-clean rounded-xl p-6 sm:p-7 border border-zinc-800/80 bg-zinc-900/30 space-y-3">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-zinc-300">6</span>
            Disponibilidad del Servicio y Limitación de Responsabilidad
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
            <p>
              El servicio se entrega &ldquo;tal cual&rdquo; (&ldquo;as is&rdquo;) y &ldquo;según disponibilidad&rdquo;. Aunque mantenemos monitoreo proactivo para garantizar una alta disponibilidad, EduRAG no se hace responsable por interrupciones temporales ocasionadas por mantenimiento de proveedores en la nube (Vercel, Railway, Supabase, OpenRouter) o cortes de conectividad ajenos a nuestro control directo.
            </p>
          </div>
        </section>

        {/* Section 7: Account Suspension & Termination */}
        <section className="card-clean rounded-xl p-6 sm:p-7 border border-zinc-800/80 bg-zinc-900/30 space-y-3">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-zinc-300">7</span>
            Suspensión, Cancelación y Contacto
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
            <p>
              EduRAG se reserva el derecho de suspender de forma inmediata el acceso a cuentas que incurran en violaciones graves de la Política de Uso Aceptable. Cualquier usuario puede dar de baja su cuenta y solicitar el borrado íntegro de sus datos escribiendo a <code className="text-zinc-200">admin@edurag.com</code>.
            </p>
          </div>
        </section>

        {/* Footer Navigation */}
        <div className="pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <p>© 2026 EduRAG. Plataforma de Asistentes Pedagógicos con RAG.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-zinc-300 hover:text-white underline transition-colors">
              Política de Privacidad
            </Link>
            <Link href="/" className="text-zinc-300 hover:text-white underline transition-colors">
              Página Principal
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
