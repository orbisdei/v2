'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';
import type { CelebrationEntry } from '@/lib/types';

interface CelebrationListEditorProps {
  celebrations: CelebrationEntry[];
  onChange: (celebrations: CelebrationEntry[]) => void;
  disabled?: boolean;
  inputClass?: string;
}

export function CelebrationListEditor({
  celebrations,
  onChange,
  disabled,
  inputClass = '',
}: CelebrationListEditorProps) {
  function updateCelebration(idx: number, field: keyof CelebrationEntry, value: string) {
    onChange(celebrations.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  }

  function removeCelebration(idx: number) {
    onChange(celebrations.filter((_, i) => i !== idx));
  }

  function moveCelebration(idx: number, direction: 'up' | 'down') {
    const next = [...celebrations];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    onChange(next);
  }

  return (
    <div>
      {celebrations.map((celebration, idx) => (
        <div key={celebration.id ?? idx} className="flex items-start gap-2 mb-3 p-3 border border-gray-200 rounded-lg">
          {!disabled && celebrations.length > 1 && (
            <div className="flex flex-col gap-1 pt-1 shrink-0">
              <button
                type="button"
                onClick={() => moveCelebration(idx, 'up')}
                disabled={idx === 0}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Move up"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => moveCelebration(idx, 'down')}
                disabled={idx === celebrations.length - 1}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Move down"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          )}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <input
              type="text"
              placeholder="When (e.g. July 25-26, First Saturday in May)"
              value={celebration.date_label}
              onChange={(e) => updateCelebration(idx, 'date_label', e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Celebration (e.g. Grand Pardon)"
              value={celebration.description}
              onChange={(e) => updateCelebration(idx, 'description', e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => removeCelebration(idx)}
                className="self-end text-xs text-red-600 hover:text-red-800 font-medium"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
      {!disabled && (
        <button
          type="button"
          onClick={() => onChange([...celebrations, { date_label: '', description: '' }])}
          className="text-sm text-navy-700 font-medium hover:text-navy-500"
        >
          + Add celebration
        </button>
      )}
    </div>
  );
}
