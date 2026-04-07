'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';
import type { LinkEntry } from '@/lib/types';

interface LinkListEditorProps {
  links: LinkEntry[];
  onChange: (links: LinkEntry[]) => void;
  disabled?: boolean;
  inputClass?: string;
}

export function LinkListEditor({ links, onChange, disabled, inputClass = '' }: LinkListEditorProps) {
  function updateLink(idx: number, field: keyof LinkEntry, value: string) {
    onChange(links.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }

  function removeLink(idx: number) {
    onChange(links.filter((_, i) => i !== idx));
  }

  function moveLink(idx: number, direction: 'up' | 'down') {
    const next = [...links];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    onChange(next);
  }

  return (
    <div>
      {links.map((link, idx) => (
        <div key={link.id ?? idx} className="flex items-start gap-2 mb-3 p-3 border border-gray-200 rounded-lg">
          {!disabled && links.length > 1 && (
            <div className="flex flex-col gap-1 pt-1 shrink-0">
              <button
                type="button"
                onClick={() => moveLink(idx, 'up')}
                disabled={idx === 0}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Move up"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => moveLink(idx, 'down')}
                disabled={idx === links.length - 1}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Move down"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          )}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <input
              type="url"
              placeholder="URL"
              value={link.url}
              onChange={(e) => updateLink(idx, 'url', e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Label (e.g. Official Website)"
              value={link.link_type}
              onChange={(e) => updateLink(idx, 'link_type', e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Note (optional)"
              value={link.comment ?? ''}
              onChange={(e) => updateLink(idx, 'comment', e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => removeLink(idx)}
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
          onClick={() => onChange([...links, { url: '', link_type: '', comment: '' }])}
          className="text-sm text-navy-700 font-medium hover:text-navy-500"
        >
          + Add link
        </button>
      )}
    </div>
  );
}
