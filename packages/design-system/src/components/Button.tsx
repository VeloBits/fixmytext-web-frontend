import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-[var(--accent)] text-white border-transparent hover:bg-[var(--accent-hover)] active:bg-[var(--accent)]',
  secondary:
    'bg-transparent text-[var(--accent)] border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white',
  ghost:
    'bg-transparent text-[var(--text-2)] border-transparent hover:bg-[var(--list-hover)] hover:text-[var(--text)]',
  danger: 'bg-[var(--rose)] text-white border-transparent hover:opacity-90',
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-[0.75rem] px-3 py-1',
  md: 'text-[0.82rem] px-3.5 py-1.5',
  lg: 'text-[0.9rem] px-4 py-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center font-semibold rounded-[var(--radius-md)] border',
        'transition-all duration-[var(--transition-base)] cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'font-[var(--font-display)]',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
