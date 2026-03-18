'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, Bookmark } from 'lucide-react';
import { useUserSiteActions } from '@/context/UserSiteActionsContext';
import { createClient } from '@/utils/supabase/client';
import SaveToListPanel from './SaveToListPanel';

interface SiteActionBarProps {
  siteId: string;
  siteName: string;
  thumbnailUrl?: string;
}

export default function SiteActionBar({ siteId, siteName, thumbnailUrl }: SiteActionBarProps) {
  const { visited: { isVisited, toggleVisited, isLoggedIn: vLoggedIn },
          lists: { isOnAnyList, isLoggedIn: lLoggedIn } } = useUserSiteActions();
  const [vPressed, setVPressed] = useState(false);
  const [bPressed, setBPressed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const bookmarkRef = useRef<HTMLDivElement>(null);

  const visited = isVisited(siteId);
  const saved = isOnAnyList(siteId);

  useEffect(() => {
    if (!panelOpen) return;
    function handleOutside(e: MouseEvent) {
      if (bookmarkRef.current && !bookmarkRef.current.contains(e.target as Node)) setPanelOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [panelOpen]);

  async function handleVisited() {
    setVPressed(true); setTimeout(() => setVPressed(false), 150);
    if (!vLoggedIn) {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({ provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}` } });
      return;
    }
    await toggleVisited(siteId);
  }

  async function handleBookmark() {
    setBPressed(true); setTimeout(() => setBPressed(false), 150);
    if (!lLoggedIn) {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({ provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}` } });
      return;
    }
    setPanelOpen(true);
  }

  return (
    <div className="shrink-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-3">
      <button type="button" onClick={handleVisited}
        className="flex-1 flex items-center justify-center gap-2 py-[10px] rounded-lg border text-sm font-medium"
        style={{ transform: vPressed ? 'scale(0.97)' : 'scale(1)', transition: 'transform 150ms',
          background: visited ? '#eaf3de' : '#f7f7f7', borderColor: visited ? '#97c459' : '#ddd',
          color: visited ? '#639922' : '#666' }}>
        <Check size={16} strokeWidth={visited ? 2.5 : 2} color={visited ? '#639922' : '#999'} />
        {visited ? 'Visited' : 'Mark visited'}
      </button>

      <div ref={bookmarkRef} className="flex-1 relative">
        <button type="button" onClick={handleBookmark}
          className="w-full flex items-center justify-center gap-2 py-[10px] rounded-lg border text-sm font-medium"
          style={{ transform: bPressed ? 'scale(0.97)' : 'scale(1)', transition: 'transform 150ms',
            background: saved ? '#e6e6f4' : '#f7f7f7', borderColor: saved ? '#1e1e5f' : '#ddd',
            color: saved ? '#1e1e5f' : '#666' }}>
          <Bookmark size={15} strokeWidth={2} color={saved ? '#1e1e5f' : '#999'} fill={saved ? '#1e1e5f' : 'none'} />
          {saved ? 'Saved' : 'Save to list'}
        </button>
        <SaveToListPanel siteId={siteId} siteName={siteName} thumbnailUrl={thumbnailUrl}
          isOpen={panelOpen} onClose={() => setPanelOpen(false)} dropUp />
      </div>
    </div>
  );
}
