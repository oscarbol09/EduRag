interface StatusBadgeProps {
  status: string;
  labels?: Record<string, string>;
  colors?: Record<string, string>;
  size?: "sm" | "md";
}

export function StatusBadge({
  status,
  labels = {},
  colors = {},
  size = "sm",
}: StatusBadgeProps) {
  const defaultColors: Record<string, string> = {
    published: "bg-green-100 text-green-700 border-green-200",
    draft: "bg-gray-100 text-gray-600 border-gray-200",
    active: "bg-green-100 text-green-700 border-green-200",
    inactive: "bg-red-100 text-red-700 border-red-200",
    queued: "bg-yellow-100 text-yellow-700 border-yellow-200",
    processing: "bg-blue-100 text-blue-700 border-blue-200",
    indexed: "bg-green-100 text-green-700 border-green-200",
    error: "bg-red-100 text-red-700 border-red-200",
    ...colors,
  };

  const defaultLabels: Record<string, string> = {
    published: "Publicado",
    draft: "Borrador",
    active: "Activo",
    inactive: "Inactivo",
    queued: "En cola",
    processing: "Procesando",
    indexed: "Indexado",
    error: "Error",
    ...labels,
  };

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs font-medium" : "px-2.5 py-1 text-xs font-semibold";
  const colorClass = defaultColors[status] || "bg-gray-100 text-gray-600 border-gray-200";

  return (
    <span className={`inline-flex items-center rounded-full border ${sizeClasses} ${colorClass}`}>
      {defaultLabels[status] || status}
    </span>
  );
}