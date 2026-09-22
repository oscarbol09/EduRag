import Link from "next/link";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-12 relative overflow-hidden font-sans">
      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 group text-xl font-bold text-zinc-100 tracking-tight hover:text-white transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-100 group-hover:border-zinc-700 transition-colors">
              E
            </div>
            EduRAG
          </Link>
          <h1 className="text-xl font-bold text-zinc-100 mt-4 tracking-tight">{title}</h1>
          {subtitle && <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">{subtitle}</p>}
        </div>

        <div className="rounded-2xl p-6 sm:p-8 border border-zinc-800 bg-zinc-900/40 shadow-xl">
          {children}
        </div>

        <p className="text-center mt-6">
          <Link
            href="/"
            className="btn-press inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 font-medium transition-colors"
          >
            <span aria-hidden="true">←</span>
            Volver al portal principal
          </Link>
        </p>

        {footer}
      </div>
    </div>
  );
}
