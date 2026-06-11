'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiSelectOption {
  id: string;
  label: string;
  color?: string;
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  className?: string;
}

export default function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder,
  className,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  const selectedSummary = useMemo(() => {
    if (selected.length === 0) {
      return placeholder;
    }

    if (selected.length === 1) {
      return options.find((option) => option.id === selected[0])?.label || placeholder;
    }

    return `${selected.length} dipilih`;
  }, [options, placeholder, selected]);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((item) => item !== id));
      return;
    }

    onChange([...selected, id]);
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-left text-sm text-[var(--app-text)] transition hover:bg-[var(--app-bg-soft)] focus:border-[var(--app-link)] focus:outline-none"
      >
        <span className={selected.length === 0 ? 'text-[var(--app-subtle)]' : ''}>{selectedSummary}</span>
        <ChevronDown className={cn('h-4 w-4 text-[var(--app-subtle)] transition-transform', open ? 'rotate-180' : '')} />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-30 mt-2 border border-[var(--app-border)] bg-[var(--app-surface)] shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--app-border)] px-3 py-2 text-xs text-[var(--app-muted)]">
            <span>{selected.length === 0 ? 'Semua aktif' : `${selected.length} filter aktif`}</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="font-medium text-[var(--app-link)] hover:underline"
            >
              Reset
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            <div className="space-y-1">
              {options.map((option) => {
                const isSelected = selected.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggle(option.id)}
                    className={cn(
                      'flex w-full items-center gap-2 border px-2.5 py-2 text-left text-sm transition',
                      isSelected
                        ? 'border-[var(--app-link)] bg-[var(--app-bg-soft)] text-[var(--app-text)]'
                        : 'border-transparent text-[var(--app-muted)] hover:border-[var(--app-border)] hover:bg-[var(--app-bg-soft)] hover:text-[var(--app-text)]'
                    )}
                  >
                    <span
                      className="inline-flex h-4 w-4 items-center justify-center border text-[10px]"
                      style={
                        option.color
                          ? {
                              borderColor: option.color,
                              color: option.color,
                              backgroundColor: isSelected ? `${option.color}18` : 'transparent',
                            }
                          : undefined
                      }
                    >
                      {isSelected ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
