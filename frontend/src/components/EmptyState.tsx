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
    <div className="bg-white rounded-xl shadow p-12 text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      {description && <p className="text-gray-600 mb-6">{description}</p>}
      {action && (
        <a href={action.href} className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          {action.label}
        </a>
      )}
    </div>
  );
}