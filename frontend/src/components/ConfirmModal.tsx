"use client";

import { useEffect, useRef } from "react";

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onCancel]);

  // Enfocar el botón cancelar al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => cancelRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const confirmStyles =
    variant === "danger"
      ? "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-sm"
      : "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500 shadow-sm";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby={description ? "confirm-modal-desc" : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative bg-zinc-950 rounded-2xl shadow-xl border border-zinc-800 p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3.5">
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${
              variant === "danger" ? "bg-rose-950/40 text-rose-400 border-rose-500/20" : "bg-amber-950/40 text-amber-400 border-amber-500/20"
            }`}
            aria-hidden="true"
          >
            {variant === "danger" ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h2 id="confirm-modal-title" className="font-semibold text-zinc-100 text-base leading-snug tracking-tight">
              {title}
            </h2>
            {description && (
              <p id="confirm-modal-desc" className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 py-2 px-3 rounded-lg border border-zinc-800 text-zinc-300 font-medium text-xs hover:bg-zinc-900 hover:text-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-700 btn-press"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2 px-3 rounded-lg font-medium text-xs transition-all focus:outline-none focus:ring-2 btn-press ${confirmStyles}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
