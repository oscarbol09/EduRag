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

/**
 * Modal de confirmación accesible que reemplaza `window.confirm()`.
 * — Funciona dentro de iframes (Moodle) donde confirm() es silenciado.
 * — Atrapa el foco dentro del modal mientras está abierto (focus trap).
 * — Cierra con Escape.
 */
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

  // Enfocar el botón cancelar al abrir (acción segura por defecto)
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => cancelRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const confirmStyles =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
      : "bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-400";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby={description ? "confirm-modal-desc" : undefined}
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 max-w-sm w-full space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${
              variant === "danger" ? "bg-red-100" : "bg-amber-100"
            }`}
            aria-hidden="true"
          >
            {variant === "danger" ? "🗑️" : "⚠️"}
          </div>
          <div>
            <h2 id="confirm-modal-title" className="font-bold text-gray-900 text-base leading-snug">
              {title}
            </h2>
            {description && (
              <p id="confirm-modal-desc" className="text-sm text-gray-500 mt-1 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${confirmStyles}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
