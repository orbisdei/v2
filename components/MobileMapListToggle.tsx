'use client';

type View = 'map' | 'list';

interface MobileMapListToggleProps {
  value: View;
  onChange: (v: View) => void;
  className?: string;
}

export default function MobileMapListToggle({ value, onChange, className }: MobileMapListToggleProps) {
  const base = 'px-4 py-1.5 transition-colors';
  const active = 'bg-navy-900 text-white';
  const inactive = 'text-navy-700';
  return (
    <div className={`flex rounded-full overflow-hidden border border-navy-200 shadow-md bg-white text-sm font-medium ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => onChange('map')}
        className={`${base} ${value === 'map' ? active : inactive}`}
      >
        Map
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        className={`${base} ${value === 'list' ? active : inactive}`}
      >
        List
      </button>
    </div>
  );
}
