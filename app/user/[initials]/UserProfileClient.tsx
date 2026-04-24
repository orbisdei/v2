'use client';

import ListCard from '@/components/ListCard';
import UserAvatar from '@/components/UserAvatar';
import type { PublicProfile, UserListSummary } from '@/lib/types';

interface UserProfileClientProps {
  profile: PublicProfile;
  publicLists: UserListSummary[];
  visitedCount: number;
  contributedSitesCount: number;
  contributedTopicsCount: number;
}

export default function UserProfileClient({ profile, publicLists, visitedCount, contributedSitesCount, contributedTopicsCount }: UserProfileClientProps) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Profile header */}
      <div className="flex flex-col items-center text-center mb-8">
        {/* Avatar */}
        <UserAvatar avatarUrl={profile.avatar_url} initials={profile.initials_display} size={72} />

        {/* Initials badge */}
        <span style={{
          display: 'inline-block', marginTop: 16,
          fontSize: 11, fontWeight: 600, color: '#1e1e5f',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          background: '#e6e6f4', borderRadius: 6, padding: '2px 8px',
        }}>
          {profile.initials_display}
        </span>

        {/* About me */}
        {profile.about_me && (
          <p className="text-sm text-gray-600 mt-4 max-w-md leading-relaxed">{profile.about_me}</p>
        )}

        {/* Member since */}
        <p className="text-xs text-gray-400 mt-3">
          Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-center gap-6 text-sm text-gray-500 mb-8">
        <span><strong className="text-gray-900">{visitedCount}</strong> sites visited</span>
        <span className="text-gray-300">·</span>
        <span><strong className="text-gray-900">{contributedSitesCount}</strong> sites contributed</span>
        <span className="text-gray-300">·</span>
        <span><strong className="text-gray-900">{contributedTopicsCount}</strong> topics contributed</span>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-200 mb-6" />

      {/* Public lists */}
      <h2 style={{ fontFamily: 'Georgia, serif' }} className="text-lg font-bold text-gray-900 mb-4">
        Public Lists
      </h2>

      {publicLists.length === 0 ? (
        <p className="text-sm text-gray-400">No public lists yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {publicLists.map(list => (
            <ListCard key={list.id} list={list} />
          ))}
        </div>
      )}
    </div>
  );
}
