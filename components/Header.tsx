'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, LogOut, User, ChevronDown } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type UserProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'general' | 'contributor' | 'administrator';
} | null;

const ROLE_BADGE: Record<string, string> = {
  administrator: 'bg-gold-500 text-navy-900',
  contributor: 'bg-navy-700 text-white',
  general: 'bg-navy-800 text-white',
};

export default function Header() {
  const [user, setUser] = useState<UserProfile>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { setUser(null); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, role')
        .eq('id', authUser.id)
        .single();

      setUser(profile ? {
        id: authUser.id,
        display_name: profile.display_name as string | null,
        avatar_url: profile.avatar_url as string | null,
        role: profile.role as 'general' | 'contributor' | 'administrator',
      } : null);
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <header className="bg-navy-900 text-white relative z-50">
      <div className="grid grid-cols-3 items-center px-4 md:px-6 h-14">

        {/* Left: Hamburger (mobile) / Nav (desktop) */}
        <div className="flex items-center">
          <button
            className="md:hidden p-1 -ml-1"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/" className="hover:text-gold-400 transition-colors">Home</Link>
            <Link href="/search" className="hover:text-gold-400 transition-colors">Search</Link>
            <Link href="/about" className="hover:text-gold-400 transition-colors">About</Link>
            {user && ['contributor', 'administrator'].includes(user.role) && (
              <Link href="/contribute/new-site" className="hover:text-gold-400 transition-colors">Contribute</Link>
            )}
            {user?.role === 'administrator' && (
              <Link href="/admin" className="hover:text-gold-400 transition-colors">Admin</Link>
            )}
          </nav>
        </div>

        {/* Center: Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 whitespace-nowrap">
          <img src="/images/orbisdei.png" alt="" aria-hidden="true" className="h-10 w-auto object-contain shrink-0" />
          <span className="font-mont font-bold text-lg tracking-widest uppercase">Orbis Dei</span>
        </Link>

        {/* Right: User menu (desktop) / Hamburger (mobile) */}
        <div className="flex items-center justify-end">
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-white/30 rounded hover:bg-white/10 transition-colors"
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <User size={16} />
                  )}
                  <span>{user.display_name ?? 'Account'}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${ROLE_BADGE[user.role]}`}>
                    {user.role}
                  </span>
                  <ChevronDown size={14} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-1 w-44 bg-white text-navy-900 rounded shadow-lg border border-gray-200 py-1 z-50">
                    <form action="/auth/signout" method="post">
                      <button type="submit" className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                        <LogOut size={14} />
                        Sign out
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="px-4 py-1.5 text-sm font-medium border border-white/30 rounded hover:bg-white/10 transition-colors"
              >
                Log in
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Mobile menu — absolute overlay so it doesn't push page content */}
      {mobileMenuOpen && (
        <nav className="md:hidden absolute top-full left-0 right-0 bg-navy-800 border-t border-navy-700 px-4 py-3 flex flex-col gap-3 text-sm shadow-lg z-50">
          <Link href="/" className="py-1.5 hover:text-gold-400" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          <Link href="/search" className="py-1.5 hover:text-gold-400" onClick={() => setMobileMenuOpen(false)}>Search</Link>
          <Link href="/about" className="py-1.5 hover:text-gold-400" onClick={() => setMobileMenuOpen(false)}>About</Link>
          {user && ['contributor', 'administrator'].includes(user.role) && (
            <Link href="/contribute/new-site" className="py-1.5 hover:text-gold-400" onClick={() => setMobileMenuOpen(false)}>Contribute</Link>
          )}
          {user?.role === 'administrator' && (
            <Link href="/admin" className="py-1.5 hover:text-gold-400" onClick={() => setMobileMenuOpen(false)}>Admin</Link>
          )}
          <div className="border-t border-navy-700 pt-2">
            {user ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm">
                  {user.avatar_url && <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full" />}
                  <span>{user.display_name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${ROLE_BADGE[user.role]}`}>
                    {user.role}
                  </span>
                </div>
                <form action="/auth/signout" method="post">
                  <button type="submit" className="flex items-center gap-2 text-sm hover:text-gold-400">
                    <LogOut size={14} />
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="mt-1 px-4 py-1.5 text-sm font-medium border border-white/30 rounded hover:bg-white/10 transition-colors w-fit"
              >
                Log in
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
