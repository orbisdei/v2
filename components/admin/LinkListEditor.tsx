'use client';

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

  return (
    <div>
      {links.map((link, idx) => (
        <div key={link.id ?? idx} className="flex flex-col gap-2 mb-3 p-3 border border-gray-200 rounded-lg">
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
