'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, Bookmark } from 'lucide-react';
import { useUserSiteActions } from '@/context/UserSiteActionsContext';
import { createClient } from '@/utils/supabase/client';
import SaveToListPanel from './SaveToListPanel';

interface SiteInlineActionsProps {
  siteId: string;
  siteName: string;
  thumbnailUrl?: string;
}

export default function SiteInlineActions({ siteId, siteName, thumbnailUrl }: SiteInlineActionsProps) {
  const { visited: { isVisited, toggleVisited, isLoggedIn: visitedLoggedIn }, lists: { isOnAnyList, isLoggedIn: listsLoggedIn } } = useUserSiteActions();
  const [panelOpen, setPanelOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isVisitedActive = isVisited(siteId);
  const isBookmarked = isOnAnyList(siteId);

  useEffect(() => {
    if (!panelOpen) return;
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setPanelOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [panelOpen]);

  async function handleVisitedClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!visitedLoggedIn) {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({ provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}` } });
      return;
    }
    await toggleVisited(siteId);
  }

  async function handleBookmarkClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!listsLoggedIn) {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({ provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}` } });
      return;
    }
    setPanelOpen(true);
  }

  return (
    <div ref={wrapperRef} className="relative flex items-center gap-0.5 shrink-0 ml-1">
      <button
        type="button"
        onClick={handleVisitedClick}
        aria-label={isVisitedActive ? 'Mark unvisited' : 'Mark as visited'}
        className="w-6 h-6 flex items-center justify-center rounded-sm active:bg-gray-100"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <Check size={14} strokeWidth={isVisitedActive ? 2.5 : 2} color={isVisitedActive ? '#639922' : '#d1d5db'} />
      </button>
      <button
        type="button"
        onClick={handleBookmarkClick}
        aria-label={isBookmarked ? 'Saved to list' : 'Save to list'}
        className="w-6 h-6 flex items-center justify-center rounded-sm active:bg-gray-100"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <Bookmark size={13} strokeWidth={2} color={isBookmarked ? '#1e1e5f' : '#d1d5db'} fill={isBookmarked ? '#1e1e5f' : 'none'} />
      </button>
      <SaveToListPanel
        siteId={siteId}
        siteName={siteName}
        thumbnailUrl={thumbnailUrl}
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
      />
    </div>
  );
}
