import Link from "next/link";

interface EmptyStateProps {
  icon?: React.ReactNode | string;
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl p-8 sm:p-10 text-center max-w-lg mx-auto my-6 border border-zinc-800 bg-zinc-900/40">
      {icon ? (
        <div className="flex justify-center mb-4 text-zinc-400" aria-hidden="true">
          {typeof icon === "string" ? (
            <span className="text-4xl">{icon}</span>
          ) : (
            icon
          )}
        </div>
      ) : (
        <div className="w-12 h-12 rounded-xl bg-zinc-850 border border-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400" aria-hidden="true">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
      )}
      <h3 className="text-base font-semibold text-zinc-100 mb-1.5 tracking-tight">{title}</h3>
      {description && <p className="text-zinc-400 text-xs sm:text-sm mb-6 leading-relaxed max-w-sm mx-auto">{description}</p>}
      {action && (
        <Link
          href={action.href}
          className="btn-press inline-flex items-center justify-center px-4 py-2 bg-zinc-100 text-zinc-900 hover:bg-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
