'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, ArrowLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useProfileContext } from '@/context/ProfileContext';

type InitialsStatus = 'idle' | 'checking' | 'available' | 'taken';

function AvatarLarge({ avatarUrl, initialsDisplay }: { avatarUrl: string | null; initialsDisplay: string }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: '#1e1e5f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: 22,
        color: '#fff',
        fontWeight: 600,
        letterSpacing: 2,
      }}
    >
      {initialsDisplay}
    </div>
  );
}

export default function ProfilePage() {
  const { profile, loading, updateProfile } = useProfileContext();
  const router = useRouter();

  const [initials, setInitials] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [initialsStatus, setInitialsStatus] = useState<InitialsStatus>('idle');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Pre-fill once profile loads
  useEffect(() => {
    if (profile) {
      setInitials(profile.initials ?? '');
      setAboutMe(profile.about_me ?? '');
    }
  }, [profile?.id]); // only re-run when the user identity changes, not on every profile update

  // Redirect if not logged in after load completes
  useEffect(() => {
    if (!loading && !profile) {
      router.replace('/');
    }
  }, [loading, profile, router]);

  async function checkInitialsAvailability(candidate: string) {
    if (!profile) return;
    const upper = candidate.toUpperCase();
    setInitialsStatus('checking');
    setSuggestion(null);

    const supabase = createClient();
    const { data } = await supabase
      .from('profiles')
      .select('initials_display')
      .eq('initials_display', upper)
      .neq('id', profile.id);

    if (!data || data.length === 0) {
      setInitialsStatus('available');
    } else {
      // Find next available variant
      let i = 1;
      let found = '';
      while (i <= 99) {
        const variant = upper + i;
        const { data: d } = await supabase
          .from('profiles')
          .select('initials_display')
          .eq('initials_display', variant);
        if (!d || d.length === 0) {
          found = variant;
          break;
        }
        i++;
      }
      setSuggestion(found || `${upper}1`);
      setInitialsStatus('taken');
    }
  }

  function handleInitialsChange(val: string) {
    const upper = val.toUpperCase().slice(0, 3);
    setInitials(upper);
    setSaved(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (upper.length < 3) {
      setInitialsStatus('idle');
      setSuggestion(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      checkInitialsAvailability(upper);
    }, 500);
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/delete-account', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setDeleteError(json.error ?? 'Something went wrong. Please try again.');
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/');
    } catch {
      setDeleteError('Something went wrong. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  async function handleSave() {
    if (!profile || initials.length !== 3) return;
    setSaving(true);
    try {
      await updateProfile({ initials, about_me: aboutMe || null });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const saveDisabled = saving || initials.length !== 3 || initialsStatus === 'checking';

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  // ── Initials availability badge ──
  function InitialsStatusBadge() {
    if (initials.length < 3) {
      return <span style={{ fontSize: 12, color: '#9ca3af' }}>Enter 3 characters</span>;
    }
    if (initialsStatus === 'checking') {
      return <span style={{ fontSize: 12, color: '#9ca3af' }}>Checking…</span>;
    }
    if (initialsStatus === 'available') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: '#eaf3de',
            color: '#3b6d11',
            fontSize: 12,
            padding: '2px 8px',
            borderRadius: 6,
          }}
        >
          <Check size={12} strokeWidth={2.5} />
          Available
        </span>
      );
    }
    if (initialsStatus === 'taken') {
      return (
        <span
          style={{
            background: '#fcebeb',
            color: '#a32d2d',
            fontSize: 12,
            padding: '2px 8px',
            borderRadius: 6,
          }}
        >
          Taken — {suggestion} suggested
        </span>
      );
    }
    return null;
  }

  // ── Shared form fields ──
  const formContent = (
    <div className="flex flex-col gap-5">
      {/* Identity (read-only) */}
      <div className="flex md:flex-row flex-col md:items-center items-center gap-4">
        <AvatarLarge avatarUrl={profile.avatar_url} initialsDisplay={profile.initials_display} />
        <div className="md:text-left text-center">
          <div style={{ fontSize: 16, fontWeight: 500, color: '#111827' }}>{profile.display_name ?? profile.email}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{profile.email}</div>
        </div>
      </div>

      <div style={{ height: 1, background: '#e5e7eb' }} />

      {/* Initials field */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#6b7280', marginBottom: 6 }}>
          Initials
        </label>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            value={initials}
            onChange={e => handleInitialsChange(e.target.value)}
            maxLength={3}
            style={{
              width: 80,
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              fontSize: 16,
              fontWeight: 600,
              border: '1.5px solid #d1d5db',
              borderRadius: 8,
              padding: '8px 4px',
              outline: 'none',
            }}
            onFocus={e => (e.target.style.borderColor = '#1e1e5f')}
            onBlur={e => (e.target.style.borderColor = '#d1d5db')}
          />
          {InitialsStatusBadge()}
        </div>
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>
          3 characters required. If taken, a number will be appended automatically (e.g. JMM1).
        </p>
      </div>

      {/* About Me field */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <label style={{ fontSize: 13, fontWeight: 500, color: '#6b7280' }}>About Me</label>
          <span style={{ fontSize: 11, color: aboutMe.length > 300 ? '#a32d2d' : '#9ca3af' }}>
            {aboutMe.length} / 300
          </span>
        </div>
        <textarea
          value={aboutMe}
          onChange={e => { setAboutMe(e.target.value.slice(0, 300)); setSaved(false); }}
          rows={4}
          style={{
            width: '100%',
            minHeight: 100,
            resize: 'vertical',
            border: '1.5px solid #d1d5db',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 14,
            color: '#111827',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={e => (e.target.style.borderColor = '#1e1e5f')}
          onBlur={e => (e.target.style.borderColor = '#d1d5db')}
          placeholder="Tell pilgrims a little about yourself…"
        />
      </div>

      {/* Saved confirmation */}
      {saved && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#eaf3de',
            color: '#3b6d11',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 13,
          }}
        >
          <Check size={14} strokeWidth={2.5} />
          Profile saved
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── MOBILE layout ── */}
      <div className="md:hidden px-4 pt-4 pb-10">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-navy-700 mb-5">
          <ArrowLeft size={14} />
          Back
        </Link>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 500, marginBottom: 24, color: '#111827' }}>
          Edit profile
        </h1>
        {formContent}
        <div className="flex flex-col gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={saveDisabled}
            style={{
              background: saveDisabled ? '#9ca3af' : '#1e1e5f',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 0',
              fontSize: 15,
              fontWeight: 600,
              cursor: saveDisabled ? 'not-allowed' : 'pointer',
              width: '100%',
            }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            onClick={() => router.back()}
            style={{
              background: '#fff',
              color: '#1e1e5f',
              border: '1.5px solid #1e1e5f',
              borderRadius: 8,
              padding: '12px 0',
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Cancel
          </button>
        </div>
        {/* Danger zone — mobile */}
        <hr style={{ marginTop: 48, borderColor: '#e5e7eb' }} />
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>
            Danger Zone
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            onClick={() => { setShowDeleteModal(true); setDeleteConfirmText(''); setDeleteError(null); }}
            style={{
              background: '#fff',
              color: '#dc2626',
              border: '1.5px solid #dc2626',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Delete my account
          </button>
        </div>
      </div>

      {/* ── DESKTOP layout ── */}
      <div className="hidden md:flex justify-center px-6 py-12">
        <div
          style={{
            width: '100%',
            maxWidth: 600,
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            padding: '32px 40px',
          }}
        >
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 500, marginBottom: 28, color: '#111827' }}>
            Edit profile
          </h1>
          {formContent}
          <div className="flex justify-end gap-3 mt-8">
            <button
              onClick={() => router.back()}
              style={{
                background: '#fff',
                color: '#1e1e5f',
                border: '1.5px solid #1e1e5f',
                borderRadius: 8,
                padding: '8px 20px',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saveDisabled}
              style={{
                background: saveDisabled ? '#9ca3af' : '#1e1e5f',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 20px',
                fontSize: 14,
                fontWeight: 600,
                cursor: saveDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
          {/* Danger zone — desktop */}
          <hr style={{ marginTop: 48, borderColor: '#e5e7eb' }} />
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>
              Danger Zone
            </h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button
              onClick={() => { setShowDeleteModal(true); setDeleteConfirmText(''); setDeleteError(null); }}
              style={{
                background: '#fff',
                color: '#dc2626',
                border: '1.5px solid #dc2626',
                borderRadius: 8,
                padding: '8px 20px',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Delete my account
            </button>
          </div>
        </div>
      </div>

      {/* ── Delete confirmation modal ── */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              maxWidth: 400,
              width: '100%',
              padding: '28px 28px 24px',
            }}
          >
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 12 }}>
              Delete your account?
            </h2>
            <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6, marginBottom: 20 }}>
              This will permanently delete your profile, visited sites, lists, and notes. Sites and tags you contributed will remain but your name will be removed. This cannot be undone.
            </p>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#6b7280', marginBottom: 6 }}>
              Type DELETE to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              style={{
                width: '100%',
                border: '1.5px solid #d1d5db',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: 8,
              }}
              onFocus={e => (e.target.style.borderColor = '#dc2626')}
              onBlur={e => (e.target.style.borderColor = '#d1d5db')}
            />
            {deleteError && (
              <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 8 }}>{deleteError}</p>
            )}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  background: '#fff',
                  color: '#1e1e5f',
                  border: '1.5px solid #1e1e5f',
                  borderRadius: 8,
                  padding: '8px 20px',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                style={{
                  background: deleteConfirmText !== 'DELETE' || deleting ? '#9ca3af' : '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: deleteConfirmText !== 'DELETE' || deleting ? 'not-allowed' : 'pointer',
                }}
              >
                {deleting ? 'Deleting…' : 'Delete my account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
