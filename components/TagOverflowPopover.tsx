'use client';

// Outside-click detection is handled INSIDE this component (not by the parent).
// It checks both anchorRef (the "+N more" trigger) and the popover content ref.
// This differs from SaveToListPanel, which delegates outside-click to the parent.
// Reason: the popover is portaled to document.body, so the parent's DOM subtree
// does not contain the portaled content — only the anchor button is in the parent.

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import TagPill from './TagPill';
import type { Tag } from '@/lib/types';

interface TagOverflowPopoverProps {
  tags: Tag[];
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  title?: string;
}

export default function TagOverflowPopover({
  tags,
  isOpen,
  onClose,
  anchorRef,
  title = 'More tags',
}: TagOverflowPopoverProps) {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right?: number }>({});
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Compute fixed position from anchor on open; recompute on scroll / resize
  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    function computePos() {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 180) {
        setPos({ bottom: window.innerHeight - rect.top + 8, right: window.innerWidth - rect.right });
      } else {
        setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
      }
    }

    computePos();
    window.addEventListener('scroll', computePos, true);
    window.addEventListener('resize', computePos);
    return () => {
      window.removeEventListener('scroll', computePos, true);
      window.removeEventListener('resize', computePos);
    };
  }, [isOpen, anchorRef]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Outside-click: close if click lands outside both anchor and popover content
  useEffect(() => {
    if (!isOpen) return;
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || contentRef.current?.contains(t)) return;
      onClose();
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen || !mounted) return null;

  // Both desktop and mobile are wrapped in one div so contentRef covers both.
  // On desktop: desktopDropdown is shown (hidden md:block), mobileSheet hidden (md:hidden).
  // On mobile: vice versa. Clicks inside either are caught by contentRef.
  return createPortal(
    <div ref={contentRef}>
      {/* Desktop: fixed-positioned dropdown anchored to trigger */}
      <div
        className="hidden md:block fixed w-64 bg-white rounded-xl border border-gray-200 shadow-lg z-[9999] px-3 py-3"
        style={pos}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[14px] font-semibold text-navy-900">{title}</span>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <TagPill key={tag.id} href={`/tag/${tag.id}`} variant="topic" size="sm">
              {tag.name}
            </TagPill>
          ))}
        </div>
      </div>

      {/* Mobile: bottom sheet */}
      <div className="md:hidden">
        <div className="fixed inset-0 bg-black/40 z-[9998]" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white rounded-t-2xl shadow-xl">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-[15px] font-semibold text-navy-900">{title}</span>
            <button
              type="button"
              onClick={onClose}
              className="text-[13px] font-medium text-navy-700 min-h-[44px] px-2"
            >
              Done
            </button>
          </div>
          <div className="flex flex-wrap gap-2 px-4 pb-4">
            {tags.map(tag => (
              <TagPill key={tag.id} href={`/tag/${tag.id}`} variant="topic" size="sm">
                {tag.name}
              </TagPill>
            ))}
          </div>
          <div className="h-4" />
        </div>
      </div>
    </div>,
    document.body
  );
}
