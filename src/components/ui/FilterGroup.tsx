'use client';

import { cn } from '@/lib/utils';

interface FilterOption {
  id: string;
  label: string;
  color?: string;
}

interface FilterGroupProps {
  label?: string;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

export default function FilterGroup({
  label,
  options,
  selected,
  onChange,
  className,
}: FilterGroupProps) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const allSelected = selected.length === 0;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onChange([])}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer',
            allSelected
              ? 'bg-[#0D9488] text-white border-[#0D9488]'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          )}
        >
          Semua
        </button>
        {options.map((opt) => {
          const isActive = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer',
                isActive
                  ? 'bg-[#0D9488] text-white border-[#0D9488]'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              )}
              style={
                isActive && opt.color
                  ? { backgroundColor: opt.color, borderColor: opt.color }
                  : undefined
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
