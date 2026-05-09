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
    published: "bg-green-100 text-green-700",
    draft: "bg-gray-100 text-gray-600",
    active: "bg-green-100 text-green-700",
    inactive: "bg-red-100 text-red-700",
    queued: "bg-yellow-100 text-yellow-700",
    processing: "bg-blue-100 text-blue-700",
    indexed: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
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

  const sizeClasses = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1 text-sm";
  const colorClass = defaultColors[status] || "bg-gray-100 text-gray-600";

  return (
    <span className={`rounded ${sizeClasses} ${colorClass}`}>
      {defaultLabels[status] || status}
    </span>
  );
}