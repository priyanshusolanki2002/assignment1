"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

type PasswordFieldProps = {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  minLength?: number;
  id?: string;
  /** Extra classes for the text input (merged after defaults). */
  inputClassName?: string;
};

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  id: idProp,
  inputClassName
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const genId = useId();
  const inputId = idProp ?? genId;

  return (
    <div className="grid gap-1.5 text-sm text-slate-700">
      <label htmlFor={inputId} className="font-medium text-slate-600">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          className={`h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-11 outline-none transition-shadow focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10 ${inputClassName ?? ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
        />
        <button
          type="button"
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </div>
  );
}
