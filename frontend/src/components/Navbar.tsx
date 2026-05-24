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
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-4">
            {backTo ? (
              <Link
                href={backTo}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-brand-600 font-semibold transition-colors group"
              >
                <span className="group-hover:-translate-x-0.5 transition-transform">←</span> {backLabel}
              </Link>
            ) : (
              <Link href="/" className="flex items-center gap-2 group">
                <span className="text-xl font-extrabold bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-transparent group-hover:opacity-85 transition-opacity font-display">
                  EduRAG
                </span>
                {variant !== "public" && (
                  <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-100">
                    {variant}
                  </span>
                )}
              </Link>
            )}
            {title && (
              <div className="flex items-center gap-2">
                <span className="h-4 w-px bg-gray-200"></span>
                <span className="text-sm font-semibold text-gray-700">{title}</span>
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      </div>
    </nav>
  );
}