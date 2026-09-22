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

const STYLES: Record<ToastVariant, string> = {
  success: "glass-panel border-emerald-500/30 text-slate-100 shadow-2xl shadow-emerald-950/40",
  error:   "glass-panel border-rose-500/30 text-slate-100 shadow-2xl shadow-rose-950/40",
  warning: "glass-panel border-amber-500/30 text-slate-100 shadow-2xl shadow-amber-950/40",
  info:    "glass-panel border-indigo-500/30 text-slate-100 shadow-2xl shadow-indigo-950/40",
};

const ICON_STYLES: Record<ToastVariant, string> = {
  success: "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40",
  error:   "bg-rose-950/80 text-rose-400 border border-rose-500/40",
  warning: "bg-amber-950/80 text-amber-400 border border-amber-500/40",
  info:    "bg-indigo-950/80 text-indigo-400 border border-indigo-500/40",
};

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === "success") {
    return (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (variant === "error") {
    return (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }
  if (variant === "warning") {
    return (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`specular-highlight flex items-start gap-3 px-4 py-3 rounded-xl border text-xs font-medium max-w-sm w-full animate-in slide-in-from-bottom-3 duration-200 backdrop-blur-xl ${STYLES[toast.variant]}`}
    >
      <span className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${ICON_STYLES[toast.variant]}`}>
        <ToastIcon variant={toast.variant} />
      </span>
      <span className="flex-1 leading-snug pt-0.5 text-slate-100">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        aria-label="Cerrar notificación"
        className="flex-shrink-0 text-slate-400 hover:text-white transition-colors p-0.5 rounded"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notificaciones"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}
