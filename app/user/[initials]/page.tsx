import { notFound } from 'next/navigation';
import { getProfileByInitials, getPublicListsForUser, getVisitedCountForUser } from '@/lib/data';
import Header from '@/components/Header';
import UserProfileClient from './UserProfileClient';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ initials: string }> }): Promise<Metadata> {
  const { initials } = await params;
  const profile = await getProfileByInitials(initials);
  if (!profile) return { title: 'User Not Found — Orbis Dei' };

  const name = profile.display_name ?? profile.initials_display;
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://orbisdei.org';
  const canonical = `${base}/user/${initials}`;

  return {
    title: `${name} — Orbis Dei`,
    description: profile.about_me ?? `${name}'s profile on Orbis Dei`,
    alternates: { canonical },
    openGraph: {
      title: `${name} on Orbis Dei`,
      description: profile.about_me ?? `${name}'s profile on Orbis Dei`,
      url: canonical,
      type: 'profile',
    },
  };
}

export default async function UserProfilePage({ params }: { params: Promise<{ initials: string }> }) {
  const { initials } = await params;

  const profile = await getProfileByInitials(initials);
  if (!profile) notFound();

  const [publicLists, visitedCount] = await Promise.all([
    getPublicListsForUser(profile.id),
    getVisitedCountForUser(profile.id),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <UserProfileClient
        profile={profile}
        publicLists={publicLists}
        visitedCount={visitedCount}
      />
    </div>
  );
}
