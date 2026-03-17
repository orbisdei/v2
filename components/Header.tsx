import { createClient } from '@/utils/supabase/server';
import HeaderClient from './HeaderClient';

export default async function Header() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  let profile = null;
  if (authUser) {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, role')
      .eq('id', authUser.id)
      .single();
    if (data) {
      profile = {
        id: authUser.id,
        display_name: data.display_name as string | null,
        avatar_url: data.avatar_url as string | null,
        role: data.role as 'general' | 'contributor' | 'administrator',
      };
    }
  }

  return <HeaderClient user={profile} />;
}
