"use client";

import Link from "next/link";

interface NavbarProps {
  variant?: "public" | "teacher" | "admin";
  backTo?: string;
  backLabel?: string;
  title?: string;
  actions?: React.ReactNode;
}

export function Navbar({ variant = "public", backTo, backLabel = "Volver", title, actions }: NavbarProps) {
  return (
    <nav className="glass-panel specular-highlight sticky top-0 z-40 border-b border-white/[0.08]" aria-label="Navegación principal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-4">
            {backTo ? (
              <Link
                href={backTo}
                className="btn-press flex items-center gap-2 text-xs sm:text-sm text-slate-300 hover:text-white font-medium px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.07] transition-all group"
              >
                <span className="group-hover:-translate-x-0.5 transition-transform text-indigo-400" aria-hidden="true">←</span>
                <span>{backLabel}</span>
              </Link>
            ) : (
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyber-cyan-500 p-px shadow-sm flex items-center justify-center">
                  <div className="w-full h-full bg-[#07080c] rounded-[7px] flex items-center justify-center">
                    <span className="font-display font-bold text-sm bg-gradient-to-r from-indigo-400 to-cyber-cyan-400 bg-clip-text text-transparent">E</span>
                  </div>
                </div>
                <span className="text-lg font-bold text-white font-display tracking-tight group-hover:text-indigo-300 transition-colors">
                  EduRAG
                </span>
                {variant !== "public" && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 led-pulse" aria-hidden="true" />
                    {variant}
                  </span>
                )}
              </Link>
            )}
            {title && (
              <div className="flex items-center gap-2.5">
                <span className="h-4 w-px bg-white/10" aria-hidden="true" />
                <span className="text-xs sm:text-sm font-medium text-slate-200 truncate max-w-xs">{title}</span>
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 sm:gap-3">{actions}</div>}
        </div>
      </div>
    </nav>
  );
}