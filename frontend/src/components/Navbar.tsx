"use client";

import Link from "next/link";

interface NavbarProps {
  backTo?: string;
  backLabel?: string;
  title?: string;
  actions?: React.ReactNode;
}

export function Navbar({ backTo, backLabel = "Volver", title, actions }: NavbarProps) {
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-4">
            {backTo ? (
              <Link href={backTo} className="text-gray-600 hover:text-gray-900">
                ← {backLabel}
              </Link>
            ) : (
              <Link href="/" className="text-2xl font-bold text-blue-600">
                EduRAG
              </Link>
            )}
            {title && <span className="text-xl font-semibold">{title}</span>}
          </div>
          {actions && <div className="flex items-center gap-4">{actions}</div>}
        </div>
      </div>
    </nav>
  );
}