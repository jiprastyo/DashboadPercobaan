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
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full pl-10 pr-9 py-2 text-sm bg-white border border-gray-200 rounded-lg',
          'text-gray-700 placeholder-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]',
          'transition-colors'
        )}
      />
      {value && (
        <button
          onClick={() => handleChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
