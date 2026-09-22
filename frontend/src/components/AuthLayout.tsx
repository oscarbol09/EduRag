import Link from "next/link";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07080c] px-4 py-12 relative overflow-hidden font-sans">
      {/* Background blueprint grid and light accents */}
      <div className="absolute inset-0 blueprint-grid opacity-60 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 group text-2xl font-bold text-white font-display tracking-tight hover:text-indigo-300 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyber-cyan-500 p-px shadow-lg shadow-indigo-500/25 flex items-center justify-center">
              <div className="w-full h-full bg-[#07080c] rounded-[11px] flex items-center justify-center">
                <span className="font-display font-bold text-lg bg-gradient-to-r from-indigo-400 to-cyber-cyan-400 bg-clip-text text-transparent">E</span>
              </div>
            </div>
            EduRAG
          </Link>
          <h1 className="text-xl font-bold text-white mt-4 tracking-tight font-display">{title}</h1>
          {subtitle && <p className="text-slate-400 text-xs mt-1 leading-relaxed">{subtitle}</p>}
        </div>

        <div className="glass-panel specular-highlight rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl">
          {children}
        </div>

        <p className="text-center mt-6">
          <Link
            href="/"
            className="btn-press inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white font-medium transition-colors group px-3 py-1.5 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/[0.04]"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform text-indigo-400" aria-hidden="true">←</span>
            Volver al portal principal
          </Link>
        </p>

        {footer}
      </div>
    </div>
  );
}
