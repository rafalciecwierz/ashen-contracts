import { useId, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, className = '', ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-body text-ink-muted">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`px-3 py-2 rounded bg-surface border font-body text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors ${error ? 'border-error' : 'border-surface-raised focus:border-brand-500'
          } ${className}`}
        {...rest}
      />
      {error && (
        <span id={errorId} className="text-sm text-error">
          {error}
        </span>
      )}
    </div>
  );
}