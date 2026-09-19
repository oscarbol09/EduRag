import Link from "next/link";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 relative overflow-hidden font-sans">
      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="text-3xl font-extrabold text-zinc-950 font-display tracking-tight hover:text-brand-600 transition-colors"
          >
            EduRAG
          </Link>
          <h1 className="text-lg font-bold text-zinc-900 mt-3 tracking-tight">{title}</h1>
          {subtitle && <p className="text-zinc-500 text-xs mt-1">{subtitle}</p>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-zinc-200/80 p-8">
          {children}
        </div>

        <p className="text-center mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 font-semibold transition-colors group"
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

