import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
}

export function Card({ children, hoverable = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={[
        'bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4',
        hoverable && 'transition-shadow duration-[var(--transition-base)] hover:shadow-[var(--card-hover-shadow)] cursor-pointer',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
