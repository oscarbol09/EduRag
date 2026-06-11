import Link from "next/link";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
}

export function EmptyState({ icon = "📭", title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
      <div className="text-6xl mb-4" aria-hidden="true">{icon}</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
      {description && <p className="text-gray-500 text-sm mb-6 leading-relaxed">{description}</p>}
      {action && (
        // Link de Next.js para navegación client-side optimizada (IMP-05)
        <Link
          href={action.href}
          className="inline-block px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-bold text-sm shadow-sm transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
