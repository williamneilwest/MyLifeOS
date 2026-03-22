import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, PropsWithChildren {
  variant?: 'primary' | 'ghost' | 'secondary' | 'outline';
}

const styles = {
  primary: 'bg-cyan-500 text-slate-950 hover:bg-cyan-400',
  ghost: 'bg-white/5 text-slate-100 hover:bg-white/10',
  secondary: 'bg-emerald-500/80 text-white hover:bg-emerald-400/80',
  outline: 'border border-white/15 bg-transparent text-slate-100 hover:bg-white/5',
};

export function Button({ className, children, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-50',
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
