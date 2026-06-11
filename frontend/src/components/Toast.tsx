"use client";

import { useState, useCallback, useEffect, useRef } from "react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = `toast-${++counterRef.current}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg: string) => addToast(msg, "success"),
    error: (msg: string) => addToast(msg, "error"),
    info: (msg: string) => addToast(msg, "info"),
    warning: (msg: string) => addToast(msg, "warning"),
  };

  return { toasts, toast, removeToast };
}

// ────────────────────────────────────────────────────
// Componente visual de un toast individual
// ────────────────────────────────────────────────────

const ICONS: Record<ToastVariant, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

const STYLES: Record<ToastVariant, string> = {
  success: "bg-green-50 border-green-200 text-green-800",
  error:   "bg-red-50 border-red-200 text-red-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  info:    "bg-brand-50 border-brand-100 text-brand-800",
};

const ICON_STYLES: Record<ToastVariant, string> = {
  success: "bg-green-100 text-green-700",
  error:   "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  info:    "bg-brand-100 text-brand-700",
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium max-w-sm w-full animate-in slide-in-from-right-5 ${STYLES[toast.variant]}`}
    >
      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${ICON_STYLES[toast.variant]}`}>
        {ICONS[toast.variant]}
      </span>
      <span className="flex-1 leading-snug pt-0.5">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        aria-label="Cerrar notificación"
        className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity text-lg leading-none mt-0.5"
      >
        ×
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────
// Contenedor de toasts — montar en layout.tsx
// ────────────────────────────────────────────────────

export function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notificaciones"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}
