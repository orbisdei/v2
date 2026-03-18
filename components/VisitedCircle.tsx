'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { useUserSiteActions } from '@/context/UserSiteActionsContext';
import { createClient } from '@/utils/supabase/client';

interface VisitedCircleProps {
  siteId: string;
}

export default function VisitedCircle({ siteId }: VisitedCircleProps) {
  const { visited: { isVisited, toggleVisited, isLoggedIn } } = useUserSiteActions();
  const [pressed, setPressed] = useState(false);
  const active = isVisited(siteId);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    setPressed(true); setTimeout(() => setPressed(false), 150);
    if (!isLoggedIn) {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({ provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}` } });
      return;
    }
    await toggleVisited(siteId);
  }

  return (
    <button type="button" onClick={handleClick}
      aria-label={active ? 'Mark unvisited' : 'Mark as visited'}
      className="flex items-center justify-center min-w-[44px] min-h-[44px]"
      style={{ WebkitTapHighlightColor: 'transparent' }}>
      <span className="w-[30px] h-[30px] rounded-full flex items-center justify-center"
        style={{
          transform: pressed ? 'scale(0.85)' : 'scale(1)', transition: 'transform 150ms',
          background: active ? '#eaf3de' : 'transparent',
          border: active ? '1.5px solid #97c459' : '1.5px solid #ccc',
        }}>
        <Check size={14} strokeWidth={active ? 2.5 : 2} color={active ? '#639922' : '#bbb'} />
      </span>
    </button>
  );
}
