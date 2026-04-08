"use client";

import { Loader2 } from "lucide-react";

type Props = {
  className?: string;
  /** Thinner bar (e.g. under navbar). */
  slim?: boolean;
  /** Screen-reader label. */
  label?: string;
};

/** Indeterminate loading bar (no numeric progress). */
export function IndeterminateProgressBar({ className = "", slim, label = "Loading" }: Props) {
  return (
    <div
      className={`w-full overflow-hidden bg-slate-200/90 ${slim ? "h-0.5" : "h-1"} ${className}`}
      role="progressbar"
      aria-valuetext={label}
      aria-busy="true"
    >
      <div
        className={`h-full rounded-full bg-gradient-to-r from-slate-700 via-slate-900 to-slate-700 tm-progress-indeterminate-fill`}
      />
    </div>
  );
}

type BlockProps = {
  message: string;
  className?: string;
};

/** Centered spinner + message + progress bar for empty states. */
export function LoadingBlock({ message, className = "" }: BlockProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-8 ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-slate-700" aria-hidden />
      <p className="text-sm text-slate-600">{message}</p>
      <div className="w-40 max-w-[80%]">
        <IndeterminateProgressBar slim label={message} />
      </div>
    </div>
  );
}
