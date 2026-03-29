import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/*
  POST /api/accept-invite

  Called on sign-in or profile completion for logged-in users.
  Uses service role to bypass RLS.

  1. Finds all pending invitations for the current user's email
  2. Marks them as accepted → DB trigger creates friendships + sets linked_user_id
  3. Also handles legacy friend_invites table for backward compat
*/

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

  // ── Find pending invitations (new table) ────────────────────
  const { data: invitations } = await admin
    .from('invitations')
    .select('id, inviter_id, friend_id')
    .eq('invitee_email', user.email)
    .eq('status', 'pending');

  let linked = 0;

  if (invitations?.length) {
    for (const inv of invitations) {
      // Mark accepted — DB trigger handles friendship creation + linked_user_id
      await admin.from('invitations')
        .update({ status: 'accepted' })
        .eq('id', inv.id);

      linked++;
    }
  }

  // ── Also check legacy friend_invites table ──────────────────
  const { data: oldInvites } = await admin
    .from('friend_invites')
    .select('inviter_id, friend_id')
    .eq('email', user.email)
    .eq('accepted', false);

  if (oldInvites?.length) {
    for (const inv of oldInvites) {
      await admin.from('friendships').upsert(
        { user_id: inv.inviter_id, friend_id: user.id },
        { onConflict: 'user_id,friend_id' }
      );
      await admin.from('friendships').upsert(
        { user_id: user.id, friend_id: inv.inviter_id },
        { onConflict: 'user_id,friend_id' }
      );
      if (inv.friend_id) {
        await admin.from('friends')
          .update({ linked_user_id: user.id })
          .eq('id', inv.friend_id)
          .eq('user_id', inv.inviter_id);
      }
      await admin.from('friend_invites')
        .update({ accepted: true })
        .eq('friend_id', inv.friend_id)
        .eq('inviter_id', inv.inviter_id);
      linked++;
    }
  }

  return NextResponse.json({ linked });
}
