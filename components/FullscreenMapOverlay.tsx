'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface FullscreenMapOverlayProps {
  onClose: () => void;
  map: ReactNode;
  search?: ReactNode;
  belowSearch?: ReactNode;
  /** Bottom-anchored floating card (e.g. SiteFloatingCard), positioned left/right with small insets. */
  floatingCard?: ReactNode;
  /** Stacked under the close button — e.g. the Around Me locate crosshair. */
  topRight?: ReactNode;
  /**
   * Centred pill above the bottom edge, e.g. "8 sites nearby" returning to the
   * list. Without it a fullscreen Around Me map is a dead end: you can see the
   * pins but you've lost the ranking that brought you here.
   */
  bottomAction?: ReactNode;
  className?: string;
}

export default function FullscreenMapOverlay({
  onClose,
  map,
  search,
  belowSearch,
  floatingCard,
  topRight,
  bottomAction,
  className,
}: FullscreenMapOverlayProps) {
  return (
    <div className={`fixed inset-0 z-50 ${className ?? ''}`}>
      {map}
      <div className="absolute top-0 left-0 right-0 z-500 p-3 flex flex-col gap-2">
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
      {topRight && <div className="absolute right-3 top-17 z-500">{topRight}</div>}
      {bottomAction && !floatingCard && (
        <div
          className="absolute left-1/2 z-500 -translate-x-1/2"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        >
          {bottomAction}
        </div>
      )}
      {floatingCard && (
        <div
          className="absolute left-2.5 right-2.5 z-500"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
        >
          {floatingCard}
        </div>
      )}
    </div>
  );
}
