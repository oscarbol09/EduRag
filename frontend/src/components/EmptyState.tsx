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
    <div className="bg-white rounded-xl border border-zinc-200/80 shadow-sm p-10 text-center max-w-lg mx-auto my-6">
      {icon ? (
        <div className="flex justify-center mb-4 text-zinc-400" aria-hidden="true">
          {typeof icon === "string" ? (
            <span className="text-4xl">{icon}</span>
          ) : (
            icon
          )}
        </div>
      ) : (
        <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mx-auto mb-4 text-zinc-400" aria-hidden="true">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
      )}
      <h3 className="text-base font-bold text-zinc-900 mb-1">{title}</h3>
      {description && <p className="text-zinc-500 text-xs sm:text-sm mb-5 leading-relaxed">{description}</p>}
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center justify-center px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-sm btn-press transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

