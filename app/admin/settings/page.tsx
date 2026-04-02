import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Header from '@/components/Header';
import SettingsClient from './SettingsClient';
import { getAppSettings } from '@/lib/data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings — Admin — Orbis Dei',
};

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'administrator') redirect('/');

  const settings = await getAppSettings();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <SettingsClient settings={settings} />
    </div>
  );
}
