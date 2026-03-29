import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Find all pending invites for this user's email
  const { data: invites } = await admin
    .from('friend_invites')
    .select('inviter_id, friend_id')
    .eq('email', user.email)
    .eq('accepted', false);

  if (!invites?.length) return NextResponse.json({ linked: 0 });

  for (const inv of invites) {
    await admin
      .from('friends')
      .update({ linked_user_id: user.id })
      .eq('id', inv.friend_id)
      .eq('user_id', inv.inviter_id);

    await admin
      .from('friend_invites')
      .update({ accepted: true })
      .eq('friend_id', inv.friend_id)
      .eq('inviter_id', inv.inviter_id);
  }

  return NextResponse.json({ linked: invites.length });
}
