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
    <nav className="bg-white/95 backdrop-blur-md border-b border-zinc-200/80 sticky top-0 z-40" aria-label="Navegación principal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-4">
            {backTo ? (
              <Link
                href={backTo}
                className="flex items-center gap-1.5 text-xs sm:text-sm text-zinc-600 hover:text-zinc-950 font-semibold transition-colors group px-2.5 py-1.5 rounded-lg hover:bg-zinc-100"
              >
                <span className="group-hover:-translate-x-0.5 transition-transform" aria-hidden="true">←</span> {backLabel}
              </Link>
            ) : (
              <Link href="/" className="flex items-center gap-2 group">
                <span className="text-xl font-bold text-zinc-950 font-display tracking-tight group-hover:text-brand-600 transition-colors">
                  EduRAG
                </span>
                {variant !== "public" && (
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                    {variant}
                  </span>
                )}
              </Link>
            )}
            {title && (
              <div className="flex items-center gap-2.5">
                <span className="h-4 w-px bg-zinc-200" aria-hidden="true" />
                <span className="text-xs sm:text-sm font-semibold text-zinc-800 truncate max-w-xs">{title}</span>
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 sm:gap-3">{actions}</div>}
        </div>
      </div>
    </nav>
  );
}