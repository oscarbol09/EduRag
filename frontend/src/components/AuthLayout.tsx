import Link from "next/link";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-dot-grid px-4 py-12 relative overflow-hidden">
      {/* Decorative gradient blur background blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-500/10 rounded-full blur-3xl -z-10" aria-hidden="true"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent-500/10 rounded-full blur-3xl -z-10" aria-hidden="true"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          {/* Link de Next.js para navegación client-side (IMP-05) */}
          <Link
            href="/"
            className="text-4xl font-extrabold bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-transparent hover:opacity-90 transition-opacity font-display"
          >
            EduRAG
          </Link>
          <h1 className="text-xl font-bold text-gray-900 mt-4 tracking-tight">{title}</h1>
          {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-8 glow-card">
          {children}
        </div>

        <p className="text-center mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600 font-semibold transition-colors group"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform" aria-hidden="true">←</span>
            Volver al inicio
          </Link>
        </p>

        {footer}
      </div>
    </div>
  );
}
