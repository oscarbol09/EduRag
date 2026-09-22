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
      <div className={`relative ${sizeClasses[size]} rounded-full border-zinc-800 border-t-zinc-200 animate-spin`} />
    </div>
  );
}