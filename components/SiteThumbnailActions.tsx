'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, Bookmark, MapPin } from 'lucide-react';
import { useUserSiteActions } from '@/context/UserSiteActionsContext';
import { createClient } from '@/utils/supabase/client';
import SaveToListPanel from './SaveToListPanel';

interface SiteThumbnailActionsProps {
  siteId: string;
  siteName: string;
  thumbnailUrl?: string;
  googleMapsUrl?: string | null;
}

export default function SiteThumbnailActions({ siteId, siteName, thumbnailUrl, googleMapsUrl }: SiteThumbnailActionsProps) {
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
    <div ref={wrapperRef} className="relative">
      <div className="flex rounded-b-lg border border-t-0 border-gray-200 bg-[#f8f8fc] overflow-hidden">
        {/* Visited button */}
        <button
          type="button"
          onClick={handleVisitedClick}
          aria-label={isVisitedActive ? 'Mark unvisited' : 'Mark as visited'}
          className="flex-1 flex items-center justify-center py-[5px] border-r border-gray-200"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <Check
            size={13}
            strokeWidth={isVisitedActive ? 2.5 : 2}
            stroke={isVisitedActive ? '#639922' : '#bbb'}
          />
        </button>

        {/* Bookmark button */}
        <button
          type="button"
          onClick={handleBookmarkClick}
          aria-label={isBookmarked ? 'Saved to list' : 'Save to list'}
          className="flex-1 flex items-center justify-center py-[5px] border-r border-gray-200"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <Bookmark
            size={12}
            strokeWidth={2}
            stroke={isBookmarked ? '#1e1e5f' : '#bbb'}
            fill={isBookmarked ? '#1e1e5f' : 'none'}
          />
        </button>

        {/* Directions button */}
        {googleMapsUrl ? (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(googleMapsUrl, '_blank'); }}
            aria-label="Get directions"
            className="flex-1 flex items-center justify-center py-[5px]"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <MapPin size={12} className="text-navy-700" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Directions not available"
            disabled
            className="flex-1 flex items-center justify-center py-[5px] opacity-30 cursor-default"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <MapPin size={12} className="text-navy-700" />
          </button>
        )}
      </div>
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
