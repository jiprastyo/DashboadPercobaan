'use client';

import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export default function Select({
  options,
  value,
  onChange,
  placeholder,
  label,
  className,
  size = 'md',
}: SelectProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'appearance-none bg-white border border-gray-200 rounded-lg text-gray-700',
          'focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]',
          'cursor-pointer transition-colors',
          'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20fill%3D%22none%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E")] bg-[length:20px] bg-[right_8px_center] bg-no-repeat',
          size === 'sm' ? 'px-3 py-1.5 pr-8 text-sm' : 'px-4 py-2 pr-10 text-sm'
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
