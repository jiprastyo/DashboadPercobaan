import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
}

// Status variants use token colors via color-mix so they read correctly in BOTH
// light and dark (the old emerald/amber/red/sky-50 palettes ignored .dark).
const variantClasses: Record<string, string> = {
  default: 'bg-[var(--app-bg-soft)] text-[var(--app-muted)] border-[var(--app-border)]',
  success:
    'bg-[color:color-mix(in_srgb,var(--app-success)_12%,var(--app-surface))] text-[var(--app-success)] border-[color:color-mix(in_srgb,var(--app-success)_35%,var(--app-border))]',
  warning:
    'bg-[color:color-mix(in_srgb,var(--app-warning)_12%,var(--app-surface))] text-[var(--app-warning)] border-[color:color-mix(in_srgb,var(--app-warning)_35%,var(--app-border))]',
  danger:
    'bg-[color:color-mix(in_srgb,var(--app-danger)_12%,var(--app-surface))] text-[var(--app-danger)] border-[color:color-mix(in_srgb,var(--app-danger)_35%,var(--app-border))]',
  info:
    'bg-[color:color-mix(in_srgb,var(--app-link)_12%,var(--app-surface))] text-[var(--app-link)] border-[color:color-mix(in_srgb,var(--app-link)_35%,var(--app-border))]',
  outline: 'bg-[var(--app-surface)] text-[var(--app-muted)] border-[var(--app-border)]',
};

export default function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[3px] border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
