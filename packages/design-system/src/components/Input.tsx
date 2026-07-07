import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-[0.8rem] font-medium text-[var(--text-2)]">
          {label}
        </label>
      )}
      <input
        id={id}
        className={[
          'bg-[var(--input-bg)] text-[var(--input-fg)] border border-[var(--input-border)]',
          'rounded-[var(--radius-md)] px-3 py-1.5 text-[0.88rem]',
          'transition-colors duration-[var(--transition-base)]',
          'focus:outline-none focus:border-[var(--accent)]',
          'placeholder:text-[var(--text-3)]',
          error && 'border-[var(--rose)]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {error && <p className="text-[0.75rem] text-[var(--rose)]">{error}</p>}
    </div>
  );
}
