'use client';

import { Search, X } from 'lucide-react';

type Variant = 'bordered' | 'shadow' | 'hero';

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  variant?: Variant;
  autoFocus?: boolean;
  clearable?: boolean;
  className?: string;
  ariaLabel?: string;
}

const CONTAINERS: Record<Variant, string> = {
  bordered: 'relative',
  shadow: 'relative',
  hero: 'relative',
};

const INPUTS: Record<Variant, string> = {
  bordered:
    'w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-transparent',
  shadow:
    'w-full pl-9 pr-3 py-2.5 text-sm bg-white rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-navy-300',
  hero:
    'w-full pl-11 pr-4 py-3 text-base rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-gold-400',
};

const ICONS: Record<Variant, { size: number; leftClass: string }> = {
  bordered: { size: 16, leftClass: 'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none' },
  shadow: { size: 15, leftClass: 'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none' },
  hero: { size: 18, leftClass: 'absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none' },
};

export default function SearchInput({
  value,
  onChange,
  placeholder,
  variant = 'bordered',
  autoFocus,
  clearable = false,
  className,
  ariaLabel,
}: SearchInputProps) {
  const icon = ICONS[variant];
  return (
    <div className={`${CONTAINERS[variant]} ${className ?? ''}`}>
      <Search size={icon.size} className={icon.leftClass} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        className={INPUTS[variant]}
      />
      {clearable && value && (
        <button
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
