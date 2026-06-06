import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const variantClasses: Record<string, string> = {
  primary: 'bg-[#0D9488] text-white hover:bg-[#14B8A6] active:bg-[#0F766E]',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300',
  outline: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200',
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
        'focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:ring-offset-1',
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
