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
    <nav className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80" aria-label="Navegación principal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-4">
            {backTo ? (
              <Link
                href={backTo}
                className="btn-press flex items-center gap-2 text-xs sm:text-sm text-zinc-400 hover:text-zinc-100 font-medium px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800/50 transition-all group"
              >
                <span className="group-hover:-translate-x-0.5 transition-transform text-zinc-400" aria-hidden="true">←</span>
                <span>{backLabel}</span>
              </Link>
            ) : (
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-sm text-zinc-100 group-hover:border-zinc-700 transition-colors">
                  E
                </div>
                <span className="text-base font-bold text-zinc-100 tracking-tight">
                  EduRAG
                </span>
                {variant !== "public" && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800 capitalize">
                    {variant}
                  </span>
                )}
              </Link>
            )}
            {title && (
              <div className="flex items-center gap-2.5">
                <span className="h-4 w-px bg-zinc-800" aria-hidden="true" />
                <span className="text-xs sm:text-sm font-medium text-zinc-300 truncate max-w-xs">{title}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {actions ? (
              actions
            ) : variant === "public" ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/marketplace"
                  className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Marketplace
                </Link>
                <Link
                  href="/login"
                  className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/register"
                  className="btn-press text-xs sm:text-sm font-medium bg-zinc-100 text-zinc-900 hover:bg-white px-3.5 py-1.5 rounded-lg shadow-sm transition-colors"
                >
                  Comenzar gratis
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}