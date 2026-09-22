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
    published: "bg-emerald-950/70 text-emerald-300 border-emerald-500/40",
    draft: "bg-zinc-900 text-zinc-400 border-zinc-800",
    active: "bg-emerald-950/70 text-emerald-300 border-emerald-500/40",
    inactive: "bg-zinc-900 text-zinc-500 border-zinc-800",
    queued: "bg-amber-950/70 text-amber-300 border-amber-500/40",
    processing: "bg-zinc-900 text-zinc-300 border-zinc-700",
    indexed: "bg-emerald-950/70 text-emerald-300 border-emerald-500/40",
    error: "bg-rose-950/70 text-rose-300 border-rose-500/40",
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

  const sizeClasses = size === "sm" ? "px-2.5 py-0.5 text-xs font-medium" : "px-3 py-1 text-xs font-medium";
  const colorClass = defaultColors[status] || "bg-zinc-900 text-zinc-400 border-zinc-800";

  const isPositive = status === "published" || status === "active" || status === "indexed";
  const isPending = status === "queued" || status === "processing";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${sizeClasses} ${colorClass}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isPositive
            ? "bg-emerald-400"
            : isPending
            ? "bg-amber-400"
            : status === "error"
            ? "bg-rose-400"
            : "bg-zinc-500"
        }`}
        aria-hidden="true"
      />
      {defaultLabels[status] || status}
    </span>
  );
}