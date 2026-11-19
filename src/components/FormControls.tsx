import React from 'react';

interface ToggleRowProps {
  id: string;
  label: string;
  description?: string;
  cliHint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: React.ReactNode;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({
  id,
  label,
  description,
  cliHint,
  checked,
  onChange,
  children,
}) => {
  return (
    <div className="py-3.5 border-b border-slate-100 dark:border-slate-800/80 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <label htmlFor={id} className="flex-1 cursor-pointer select-none">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</div>
          {description && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
          )}
          {cliHint && (
            <div dir="ltr" className="mt-1 text-right sm:text-left font-mono text-[11px] text-sky-700 dark:text-sky-400 opacity-90">
              {cliHint}
            </div>
          )}
        </label>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex shrink-0 items-center min-h-[44px] px-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-xl`}
        >
          <span
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-150 ${
              checked ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-150 ${
                checked ? '-translate-x-6' : '-translate-x-1'
              }`}
            />
          </span>
        </button>
      </div>
      {checked && children && <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">{children}</div>}
    </div>
  );
};

interface FieldLabelProps {
  htmlFor?: string;
  label: string;
  hint?: string;
}

export const FieldLabel: React.FC<FieldLabelProps> = ({ htmlFor, label, hint }) => (
  <div className="flex items-baseline justify-between gap-2 mb-1.5">
    <label htmlFor={htmlFor} className="text-xs font-semibold text-slate-700 dark:text-slate-300">
      {label}
    </label>
    {hint && <span className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</span>}
  </div>
);

export const inputClassName =
  'w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-colors';
