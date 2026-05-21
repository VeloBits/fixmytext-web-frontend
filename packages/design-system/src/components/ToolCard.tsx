import type { ButtonHTMLAttributes } from 'react';

export interface ToolCardProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label: string;
  description?: string;
  color?: string;
  active?: boolean;
}

export function ToolCard({ icon, label, description, color, active = false, className = '', ...props }: ToolCardProps) {
  return (
    <button
      title={description}
      className={[
        'flex flex-col items-start gap-1 p-2 rounded-[var(--radius-md)] border',
        'text-left cursor-pointer transition-all duration-[var(--transition-base)] w-full',
        'bg-[var(--surface)] border-[var(--border)] text-[var(--text)]',
        'hover:border-[var(--accent)] hover:shadow-[var(--card-hover-shadow)]',
        active && 'border-[var(--accent)] bg-[var(--list-active)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      <span
        className="text-[0.7rem] font-bold px-1.5 py-0.5 rounded-sm"
        style={{ color: `var(--${color ?? 'accent'})`, background: `var(--surface-2)` }}
      >
        {icon}
      </span>
      <span className="text-[0.82rem] font-medium leading-tight">{label}</span>
    </button>
  );
}
