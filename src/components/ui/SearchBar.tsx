'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export default function SearchBar({
  placeholder = 'Cari...',
  value: controlledValue,
  onChange,
  className,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState('');
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const handleChange = (val: string) => {
    if (controlledValue === undefined) setInternalValue(val);
    onChange?.(val);
  };

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-subtle)]" />
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full border border-[var(--app-border)] bg-[var(--app-surface)] px-10 py-2 text-sm text-[var(--app-text)]',
          'placeholder:text-[var(--app-subtle)] focus:border-[var(--app-link)] focus:outline-none',
          'transition-colors'
        )}
      />
      {value && (
        <button
          onClick={() => handleChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-subtle)] hover:text-[var(--app-text)]"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
