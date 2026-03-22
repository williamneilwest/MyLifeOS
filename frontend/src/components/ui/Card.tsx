import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement>, PropsWithChildren {
  className?: string;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-900/50 p-5 shadow-glow backdrop-blur-xl',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
