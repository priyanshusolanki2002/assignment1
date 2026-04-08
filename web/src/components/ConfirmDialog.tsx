"use client";

import { IndeterminateProgressBar } from "@/components/IndeterminateProgressBar";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = destructive action styling (e.g. delete) */
  variant?: "default" | "danger";
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  loading = false
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onOpenChange(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onOpenChange]);

  if (!open) return null;

  async function handleConfirm() {
    await onConfirm();
  }

  const confirmClasses =
    variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
      : "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-500";

  return (
    <div className="tm-modal-root" role="presentation">
      <div className="tm-modal-center">
        <button
          type="button"
          aria-label="Close dialog"
          className="tm-modal-backdrop pointer-events-auto"
          disabled={loading}
          onClick={() => !loading && onOpenChange(false)}
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
          className="tm-modal-panel border border-slate-200"
        >
        {loading ? (
          <div className="relative z-20">
            <IndeterminateProgressBar slim label="Please wait" />
          </div>
        ) : null}
        <div className="p-6">
        <div className="flex items-start gap-3">
          {variant === "danger" ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </span>
          ) : null}
          <h2 id={titleId} className="min-w-0 flex-1 break-words pt-1 text-lg font-semibold text-slate-900">
            {title}
          </h2>
        </div>
        {description ? (
          <div id={descId} className="mt-2 break-words text-sm text-slate-600">
            {description}
          </div>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 ${confirmClasses}`}
            disabled={loading}
            onClick={() => void handleConfirm()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Please wait…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
        </div>
      </div>
      </div>
    </div>
  );
}
