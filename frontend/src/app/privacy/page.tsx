import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Política de Privacidad y Tratamiento de Datos",
  description: "Política de Privacidad y Tratamiento de Datos Personales de EduRAG conforme a GDPR, Ley 1581 de 2012 y regulaciones internacionales de IA educativa.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-100 selection:bg-zinc-800 selection:text-white">
      <Navbar variant="public" backTo="/" backLabel="Volver al inicio" title="Privacidad & Datos" />

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 flex-1 space-y-10">
        {/* Header */}
        <div className="border-b border-zinc-800 pb-8 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            <span>Compromiso de Privacidad y Minimización de Datos</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
            Política de Privacidad y Tratamiento de Datos Personales
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Última actualización y entrada en vigencia: <strong>26 de septiembre de 2026</strong>
          </p>
        </div>

        {/* Introduction */}
        <section className="space-y-4 text-xs sm:text-sm text-zinc-300 leading-relaxed">
          <p>
            En <strong>EduRAG</strong> (en adelante, &ldquo;la Plataforma&rdquo; o &ldquo;nosotros&rdquo;), la privacidad, la soberanía de los datos pedagógicos y la seguridad de la información constituyen pilares fundamentales de nuestra arquitectura. Esta Política de Privacidad describe de manera transparente, clara y detallada cómo recolectamos, tratamos, almacenamos, protegemos y eliminamos los datos personales y contenidos curriculares proporcionados por docentes, estudiantes e instituciones académicas.
          </p>
          <p>
            Nuestras prácticas de tratamiento de datos se rigen estrictamente por el <strong>Reglamento General de Protección de Datos de la Unión Europea (GDPR / RGPD - Reglamento UE 2016/679)</strong>, la <strong>Ley Estatutaria 1581 de 2012 y Decreto 1377 de 2013 de la República de Colombia (Régimen General de Habeas Data)</strong>, la <strong>California Consumer Privacy Act (CCPA/CPRA)</strong> y las directrices de gobernanza algorítmica del <strong>Reglamento Europeo de Inteligencia Artificial (EU AI Act)</strong>.
          </p>
        </section>

        {/* Section 1: Data Controller */}
        <section className="card-clean rounded-xl p-6 sm:p-7 border border-zinc-800/80 bg-zinc-900/30 space-y-3">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-zinc-300">1</span>
            Responsable del Tratamiento de Datos
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
            <p>
              El responsable del tratamiento de las bases de datos de la plataforma EduRAG es el equipo directivo y tecnológico de EduRAG. Para cualquier consulta, petición de información o ejercicio de derechos de protección de datos, ponemos a su disposición nuestro canal oficial:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400">
              <li><strong>Canal de Privacidad y Oficial de Protección de Datos:</strong> <code className="text-zinc-200 font-mono">admin@edurag.com</code></li>
              <li><strong>Finalidad del canal:</strong> Atención de solicitudes de acceso, rectificación, supresión y consultas de privacidad en un plazo no superior a 10 días hábiles.</li>
            </ul>
          </div>
        </section>

        {/* Section 2: Principles of Data Minimization */}
        <section className="card-clean rounded-xl p-6 sm:p-7 border border-zinc-800/80 bg-zinc-900/30 space-y-3">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-zinc-300">2</span>
            Principio de Minimización de Datos (&ldquo;Solo Datos Necesarios&rdquo;)
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
            <p>
              Conforme al Artículo 5.1(c) del RGPD y el principio de necesidad de la Ley 1581, EduRAG recolecta <strong>exclusivamente la información técnica y académica imprescindible</strong> para prestar el servicio de tutoría inteligente asistida por RAG (Retrieval-Augmented Generation):
            </p>
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-zinc-950/60 rounded-lg border border-zinc-800/80 space-y-1.5">
                <h3 className="font-semibold text-zinc-100 text-xs uppercase tracking-wider">Estudiantes</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Solo se requiere <strong>correo electrónico</strong> y contraseña hasheada. No se solicitan teléfonos, números de identificación gubernamental ni datos financieros. La consulta de tutores en marketplace es anónima y libre de registro obligatorio.
                </p>
              </div>
              <div className="p-4 bg-zinc-950/60 rounded-lg border border-zinc-800/80 space-y-1.5">
                <h3 className="font-semibold text-zinc-100 text-xs uppercase tracking-wider">Docentes & Administradores</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Nombre, apellido, institución educativa, país y credenciales de acceso. Las claves de inferencia API de OpenRouter se almacenan bajo cifrado simétrico en reposo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Categories of Data Processed */}
        <section className="card-clean rounded-xl p-6 sm:p-7 border border-zinc-800/80 bg-zinc-900/30 space-y-3">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-zinc-300">3</span>
            Categorías de Información y Tratamiento Criptográfico
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed">
            <p>
              Tratamos cuatro tipos específicos de datos con salvaguardas técnicas diferenciales:
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-zinc-300">
              <li>
                <strong>Credenciales de Autenticación:</strong> Las contraseñas se almacenan procesadas mediante algoritmos de derivación de claves irreversibles (<code className="text-zinc-200">bcrypt</code> con factor de coste robusto). Las contraseñas nunca son accesibles en texto plano ni se devuelven en respuestas de la API.
              </li>
              <li>
                <strong>Bóveda de Claves de Inferencia (BYOK - OpenRouter):</strong> Las claves personales de OpenRouter proporcionadas por los docentes son cifradas en la capa de persistencia utilizando <strong>Fernet (cifrado simétrico AES-128 en modo CBC con autenticación HMAC-SHA256)</strong>. Solo se descifran en memoria volátil de corta duración al ejecutar una consulta de inferencia.
              </li>
              <li>
                <strong>Documentos Curriculares Subidos:</strong> Los archivos PDF, DOCX, TXT y Markdown subidos por docentes son procesados para segmentación léxica (bloques de 1500 caracteres con 200 caracteres de solapamiento) y almacenados en Supabase Storage con aislamiento estricto por <code className="text-zinc-200">chatbot_id</code> y <code className="text-zinc-200">owner_id</code>.
              </li>
              <li>
                <strong>Historial de Consultas Académicas:</strong> Las preguntas de los estudiantes y las respuestas generadas por los tutores se almacenan asociadas a la sesión para proveer memoria contextual durante la interacción y trazabilidad pedagógica de citas documentales.
              </li>
            </ol>
          </div>
        </section>

        {/* Section 4: Third-Party Service Providers */}
        <section className="card-clean rounded-xl p-6 sm:p-7 border border-zinc-800/80 bg-zinc-900/30 space-y-3">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-zinc-300">4</span>
            Encargados del Tratamiento y Transferencia Internacional
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
            <p>
              Para garantizar una disponibilidad del 99.9% y costo operativo cero, EduRAG se apoya en proveedores de infraestructura tecnológica de primer nivel que cumplen con estrictos estándares de seguridad (SOC 2 Tipo II, ISO 27001):
            </p>
            <div className="space-y-2.5 pt-2">
              <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80 text-xs">
                <strong className="text-zinc-100 block mb-0.5">Supabase Inc. (PostgreSQL & Storage en AWS us-east-1):</strong>
                <span className="text-zinc-400">Aloja las bases de datos relacionales, sesiones de usuarios y documentos indexados bajo políticas de seguridad en reposo y en tránsito.</span>
              </div>
              <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80 text-xs">
                <strong className="text-zinc-100 block mb-0.5">Railway Corp. (Alojamiento de API FastAPI):</strong>
                <span className="text-zinc-400">Ejecuta el backend de inferencia y la verificación JWT en servidores seguros de alta disponibilidad.</span>
              </div>
              <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80 text-xs">
                <strong className="text-zinc-100 block mb-0.5">Vercel Inc. (Alojamiento Frontend & Edge):</strong>
                <span className="text-zinc-400">Distribución de interfaz de usuario con cabeceras de seguridad CSP, HSTS y entrega optimizada.</span>
              </div>
              <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80 text-xs">
                <strong className="text-zinc-100 block mb-0.5">OpenRouter Inc. / Proveedores de Modelos de Lenguaje:</strong>
                <span className="text-zinc-400">Procesa los fragmentos de contexto documental y las preguntas para generar las respuestas pedagógicas. EduRAG aplica la política de <em>Zero Data Retention</em> ofrecida por los modelos abiertos en OpenRouter, garantizando que los textos no se utilizan para reentrenar modelos públicos de terceros.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Rights of Data Subjects */}
        <section className="card-clean rounded-xl p-6 sm:p-7 border border-zinc-800/80 bg-zinc-900/30 space-y-3">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-zinc-300">5</span>
            Derechos de los Titulares (ARCO & GDPR)
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
            <p>
              Usted tiene derecho a ejercer en cualquier momento los siguientes derechos respecto a sus datos personales:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-300">
              <li><strong>Acceso y Conocimiento:</strong> Solicitar copia íntegra de sus datos personales y registros de actividad.</li>
              <li><strong>Rectificación y Actualización:</strong> Corregir información inexacta o desactualizada desde el panel de configuración o mediante solicitud.</li>
              <li><strong>Supresión y Derecho al Olvido:</strong> Solicitar la eliminación total de su cuenta, documentos y registros conversacionales de los servidores.</li>
              <li><strong>Revocación del Consentimiento:</strong> Retirar en cualquier momento la autorización otorgada para el tratamiento de su información.</li>
              <li><strong>Portabilidad:</strong> Obtener sus documentos y datos en formatos estructurados y legibles por máquina (JSON, PDF).</li>
            </ul>
            <p className="pt-2 text-zinc-400">
              Para tramitar su solicitud, envíe un mensaje a <code className="text-zinc-200">admin@edurag.com</code> indicando su nombre, correo registrado y el derecho que desea ejercer.
            </p>
          </div>
        </section>

        {/* Section 6: Data Retention & Deletion */}
        <section className="card-clean rounded-xl p-6 sm:p-7 border border-zinc-800/80 bg-zinc-900/30 space-y-3">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-zinc-300">6</span>
            Retención de Datos y Eliminación en Cascada
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
            <p>
              Los datos se conservan únicamente mientras la cuenta de usuario permanezca activa. Cuando un docente o administrador elimina un chatbot o un documento desde su panel:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400">
              <li>Los metadatos del documento se eliminan de la tabla <code className="text-zinc-200">documents</code>.</li>
              <li>Todos los fragmentos de texto extraídos se purgan en cascada de la tabla <code className="text-zinc-200">document_contents</code>.</li>
              <li>Las sesiones y mensajes históricos asociados se eliminan de forma irreversible de las tablas <code className="text-zinc-200">conversations</code> y <code className="text-zinc-200">messages</code>.</li>
            </ul>
          </div>
        </section>

        {/* Footer Navigation */}
        <div className="pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <p>© 2026 EduRAG. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-zinc-300 hover:text-white underline transition-colors">
              Términos y Condiciones
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
