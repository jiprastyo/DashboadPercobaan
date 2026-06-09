import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const variantClasses: Record<string, string> = {
  primary: 'bg-[var(--app-accent)] text-[var(--app-bg)] hover:bg-[var(--app-accent-ink)]',
  secondary: 'bg-[var(--app-bg-soft)] text-[var(--app-text)] hover:bg-[var(--app-header)]',
  outline: 'bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)] hover:border-[var(--app-border-strong)]',
  ghost: 'bg-transparent text-[var(--app-muted)] hover:bg-[var(--app-bg-soft)] hover:text-[var(--app-text)]',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors duration-150 cursor-pointer',
        'rounded-[4px] focus-visible:app-focus',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
