import { cn } from '../../../utils/cn';

interface AccountToggleProps {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
}

export function AccountToggle({ checked, onChange, ariaLabel }: AccountToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={cn(
        'relative h-6 w-11 rounded-full border transition-all duration-200',
        checked
          ? 'border-emerald-400/50 bg-emerald-500/30 shadow-[0_0_14px_rgba(16,185,129,0.25)]'
          : 'border-white/10 bg-zinc-800/80',
      )}
    >
      <span
        className={cn(
          'absolute top-1 h-4 w-4 rounded-full bg-white transition-all duration-200',
          checked ? 'left-[22px]' : 'left-0.5',
        )}
      />
    </button>
  );
}
