"use client";

import { useId } from "react";
import type { FieldError, FieldResult } from "@/lib/debt/debt-input";
import type { BudgetLocale } from "@/lib/personal-finance/budget/types";

export const fieldClass = "w-full min-w-0 rounded-[4px] border border-line bg-white/80 px-2.5 py-2 text-sm font-semibold text-ink outline-none transition focus:border-petrol focus:bg-white";
export const fieldLabelClass = "text-xs font-semibold uppercase tracking-[0.14em] text-muted";

const errors = {
  es: {
    format: "Revisa el formato y el separador decimal.",
    range: "Valor fuera del rango admitido.",
    negative: "Introduce cero o un valor positivo.",
    precision: "El valor tiene más decimales de los admitidos.",
  },
  en: {
    format: "Check the format and decimal separator.",
    range: "Value outside the supported range.",
    negative: "Enter zero or a positive value.",
    precision: "The value has more decimal places than supported.",
  },
} satisfies Record<BudgetLocale, Record<FieldError, string>>;

export function DebtField({ label, text, onChange, parsed, locale, hint, error, mode = "decimal" }: {
  label: string;
  text: string;
  onChange: (value: string) => void;
  parsed: FieldResult;
  locale: BudgetLocale;
  hint?: string;
  error?: string;
  mode?: "decimal" | "numeric";
}) {
  const id = useId();
  const message = error ?? (parsed.error ? errors[locale][parsed.error] : null);
  return (
    <div className="grid min-w-0 content-start gap-2">
      <label className={fieldLabelClass} htmlFor={id}>{label}</label>
      <input
        id={id}
        className={`${fieldClass} aria-invalid:border-brass`}
        inputMode={mode}
        autoComplete="off"
        aria-invalid={Boolean(message)}
        aria-describedby={message ? `${id}-error` : hint ? `${id}-hint` : undefined}
        onChange={event => onChange(event.target.value)}
        type="text"
        value={text}
      />
      {message ? <span id={`${id}-error`} className="text-xs leading-5 text-brass">{message}</span> : null}
      {hint ? <span id={`${id}-hint`} className="text-xs leading-5 text-muted">{hint}</span> : null}
    </div>
  );
}

export function Metric({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="min-w-0 border border-line bg-panelSoft px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 break-words text-lg font-semibold leading-6 text-ink">{value}</p>
      {helper ? <p className="mt-2 text-xs leading-5 text-muted">{helper}</p> : null}
    </div>
  );
}
