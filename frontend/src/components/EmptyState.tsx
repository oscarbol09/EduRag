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
    <div className="glass-card specular-highlight rounded-2xl p-8 sm:p-10 text-center max-w-lg mx-auto my-6 border border-white/10">
      {icon ? (
        <div className="flex justify-center mb-4 text-indigo-400" aria-hidden="true">
          {typeof icon === "string" ? (
            <span className="text-4xl">{icon}</span>
          ) : (
            icon
          )}
        </div>
      ) : (
        <div className="w-14 h-14 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4 text-indigo-400 shadow-inner" aria-hidden="true">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
      )}
      <h3 className="text-base font-bold text-white mb-1.5 font-display tracking-tight">{title}</h3>
      {description && <p className="text-slate-400 text-xs sm:text-sm mb-6 leading-relaxed max-w-sm mx-auto">{description}</p>}
      {action && (
        <Link
          href={action.href}
          className="btn-press inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-500/20 border border-indigo-400/30 transition-all"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
