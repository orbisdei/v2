'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface FullscreenMapOverlayProps {
  onClose: () => void;
  map: ReactNode;
  search?: ReactNode;
  belowSearch?: ReactNode;
  className?: string;
}

export default function FullscreenMapOverlay({
  onClose,
  map,
  search,
  belowSearch,
  className,
}: FullscreenMapOverlayProps) {
  return (
    <div className={`fixed inset-0 z-50 ${className ?? ''}`}>
      {map}
      <div className="absolute top-0 left-0 right-0 z-[500] p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="bg-white rounded-full w-11 h-11 flex items-center justify-center shadow-md shrink-0"
            aria-label="Close map"
          >
            <X size={20} className="text-navy-700" />
          </button>
          {search && <div className="relative flex-1">{search}</div>}
        </div>
        {belowSearch}
      </div>
    </div>
  );
}
