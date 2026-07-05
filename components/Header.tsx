'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Menu, X, LogOut, User, List } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useProfileContext } from '@/context/ProfileContext';
import UserAvatar from './UserAvatar';

function roleBadgeStyle(role: string): React.CSSProperties {
  if (role === 'contributor') {
    return { background: 'rgba(201,149,12,0.3)', color: '#c9950c', fontSize: 10, padding: '2px 8px', borderRadius: 8 };
  }
  if (role === 'administrator') {
    return { background: 'rgba(29,158,117,0.3)', color: '#5de8c5', fontSize: 10, padding: '2px 8px', borderRadius: 8 };
  }
  return { background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 8 };
}

const dropdownStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  overflow: 'hidden',
  minWidth: 160,
};
const dropdownRowStyle: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  textAlign: 'left' as const,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#1e1e5f',
  textDecoration: 'none',
};

export default function Header() {
  const { profile } = useProfileContext();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  async function handleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    router.push('/');
  }

  const dropdownMenu = (
    <div style={dropdownStyle}>
      <Link
        href="/profile"
        onClick={() => setUserMenuOpen(false)}
        style={{ ...dropdownRowStyle }}
        className="hover:bg-gray-50 transition-colors"
      >
        <User size={14} />
        Profile
      </Link>
      <div style={{ height: 1, background: '#e5e7eb' }} />
      <Link
        href="/lists"
        onClick={() => setUserMenuOpen(false)}
        style={{ ...dropdownRowStyle }}
        className="hover:bg-gray-50 transition-colors"
      >
        <List size={14} />
        My Lists
      </Link>
      <div style={{ height: 1, background: '#e5e7eb' }} />
      <button
        onClick={handleSignOut}
        style={dropdownRowStyle}
        className="hover:bg-gray-50 transition-colors"
      >
        <LogOut size={14} />
        Sign out
      </button>
    </div>
  );

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
            {profile && ['contributor', 'administrator'].includes(profile.role) && (
              <Link href="/contribute/new-site" className="hover:text-gold-400 transition-colors">Contribute</Link>
            )}
            {profile?.role === 'administrator' && (
              <Link href="/admin" className="hover:text-gold-400 transition-colors">Admin</Link>
            )}
          </nav>
        </div>

        {/* Center: Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 whitespace-nowrap">
          <Image src="/images/orbisdei.png" alt="" aria-hidden width={24} height={24} priority className="h-6 w-auto object-contain shrink-0" />
          <span className="font-mont font-bold text-lg tracking-widest uppercase">Orbis Dei</span>
        </Link>

        {/* Right: User section */}
        <div className="flex items-center justify-end" ref={menuRef}>

          {/* ── DESKTOP (md+) ── */}
          <div className="hidden md:flex items-center">
            {profile ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-white/10 transition-colors"
                >
                  <UserAvatar avatarUrl={profile.avatar_url} initials={profile.initials_display} size={32} />
                  <span style={{ fontSize: 12, color: '#fff' }}>{profile.initials_display}</span>
                  <span style={roleBadgeStyle(profile.role)}>{profile.role}</span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-1 z-50">
                    {dropdownMenu}
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

          {/* ── MOBILE (below md) ── */}
          <div className="flex md:hidden items-center">
            {profile ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  className="p-1"
                  aria-label="Account"
                >
                  <UserAvatar avatarUrl={profile.avatar_url} initials={profile.initials_display} size={28} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-1 z-50">
                    {dropdownMenu}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="p-1"
                aria-label="Log in"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: '1.5px solid rgba(255,255,255,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User size={20} color="#fff" strokeWidth={1.5} />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Mobile nav menu — absolute overlay */}
      {mobileMenuOpen && (
        <nav className="md:hidden absolute top-full left-0 right-0 bg-navy-800 border-t border-navy-700 px-4 py-3 flex flex-col gap-3 text-sm shadow-lg z-50">
          <Link href="/" className="py-1.5 hover:text-gold-400" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          <Link href="/search" className="py-1.5 hover:text-gold-400" onClick={() => setMobileMenuOpen(false)}>Search</Link>
          <Link href="/about" className="py-1.5 hover:text-gold-400" onClick={() => setMobileMenuOpen(false)}>About</Link>
          {profile && ['contributor', 'administrator'].includes(profile.role) && (
            <Link href="/contribute/new-site" className="py-1.5 hover:text-gold-400" onClick={() => setMobileMenuOpen(false)}>Contribute</Link>
          )}
          {profile?.role === 'administrator' && (
            <Link href="/admin" className="py-1.5 hover:text-gold-400" onClick={() => setMobileMenuOpen(false)}>Admin</Link>
          )}
        </nav>
      )}
    </header>
  );
}
