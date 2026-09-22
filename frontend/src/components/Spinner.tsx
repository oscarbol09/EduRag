interface SpinnerProps {
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-6 w-6 border-2",
  md: "h-10 w-10 border-2",
  lg: "h-14 w-14 border-3",
};

export function Spinner({ size = "md" }: SpinnerProps) {
  return (
    <div className="flex justify-center items-center py-8" role="status" aria-label="Cargando...">
      <div className={`relative ${sizeClasses[size]} rounded-full border-white/10 border-t-indigo-400 border-r-cyber-cyan-400 animate-spin shadow-sm`}>
        <div className="absolute inset-0 rounded-full blur-[2px] bg-indigo-500/20" />
      </div>
    </div>
  );
}