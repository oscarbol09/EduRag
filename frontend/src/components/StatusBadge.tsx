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
    draft: "bg-zinc-900/80 text-zinc-400 border-zinc-700/60",
    active: "bg-emerald-950/70 text-emerald-300 border-emerald-500/40",
    inactive: "bg-rose-950/70 text-rose-300 border-rose-500/40",
    queued: "bg-amber-950/70 text-amber-300 border-amber-500/40",
    processing: "bg-cyan-950/70 text-cyan-300 border-cyan-500/40",
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

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[11px] font-medium" : "px-2.5 py-1 text-xs font-semibold";
  const colorClass = defaultColors[status] || "bg-zinc-900/80 text-zinc-400 border-zinc-700/60";

  const isPositive = status === "published" || status === "active" || status === "indexed";
  const isPending = status === "queued" || status === "processing";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md font-mono border backdrop-blur-md ${sizeClasses} ${colorClass}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isPositive
            ? "bg-emerald-400 led-pulse"
            : isPending
            ? "bg-cyan-400 animate-pulse"
            : status === "error" || status === "inactive"
            ? "bg-rose-400"
            : "bg-zinc-500"
        }`}
        aria-hidden="true"
      />
      {defaultLabels[status] || status}
    </span>
  );
}