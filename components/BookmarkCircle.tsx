'use client';

import { useState, useRef, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { useUserSiteActions } from '@/context/UserSiteActionsContext';
import { createClient } from '@/utils/supabase/client';
import SaveToListPanel from './SaveToListPanel';

interface BookmarkCircleProps {
  siteId: string;
  siteName: string;
  thumbnailUrl?: string;
}

export default function BookmarkCircle({ siteId, siteName, thumbnailUrl }: BookmarkCircleProps) {
  const { lists: { isOnAnyList, isLoggedIn } } = useUserSiteActions();
  const [pressed, setPressed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const active = isOnAnyList(siteId);

  useEffect(() => {
    if (!panelOpen) return;
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setPanelOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [panelOpen]);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    setPressed(true); setTimeout(() => setPressed(false), 150);
    if (!isLoggedIn) {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({ provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}` } });
      return;
    }
    setPanelOpen(true);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button type="button" onClick={handleClick}
        aria-label={active ? 'Saved to list' : 'Save to list'}
        className="flex items-center justify-center min-w-[44px] min-h-[44px]"
        style={{ WebkitTapHighlightColor: 'transparent' }}>
        <span className="w-[30px] h-[30px] rounded-full flex items-center justify-center"
          style={{
            transform: pressed ? 'scale(0.85)' : 'scale(1)', transition: 'transform 150ms',
            background: active ? '#e6e6f4' : 'transparent',
            border: active ? '1.5px solid #1e1e5f' : '1.5px solid #ccc',
          }}>
          <Bookmark size={13} strokeWidth={2} color={active ? '#1e1e5f' : '#bbb'} fill={active ? '#1e1e5f' : 'none'} />
        </span>
      </button>
      <SaveToListPanel siteId={siteId} siteName={siteName} thumbnailUrl={thumbnailUrl}
        isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
    </div>
  );
}
