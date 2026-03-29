import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/*
  POST /api/accept-invite

  Called after an invited user completes their profile, or on sign-in.
  Uses service role to bypass RLS.

  1. Finds all pending invitations for the current user's email
  2. Marks them as accepted
  3. Creates bidirectional friendship rows
  4. Updates friends.linked_user_id for UI compatibility

  This is the CRITICAL step that must never fail.
*/

export async function POST() {
  // Get current user from session
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Admin client — bypasses RLS
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // ── Find all pending invitations for this user's email ──────
  const { data: invitations, error: fetchErr } = await admin
    .from('invitations')
    .select('id, inviter_id, friend_id, invitee_email')
    .eq('invitee_email', user.email)
    .eq('status', 'pending');

  if (fetchErr) {
    console.error('Fetch invitations error:', fetchErr);
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!invitations?.length) {
    // Also check old friend_invites table for backward compatibility
    const { data: oldInvites } = await admin
      .from('friend_invites')
      .select('inviter_id, friend_id')
      .eq('email', user.email)
      .eq('accepted', false);

    if (oldInvites?.length) {
      for (const inv of oldInvites) {
        await linkFriendship(admin, inv.inviter_id, user.id, inv.friend_id);
        await admin.from('friend_invites').update({ accepted: true })
          .eq('friend_id', inv.friend_id).eq('inviter_id', inv.inviter_id);
      }
      return NextResponse.json({ linked: oldInvites.length, source: 'legacy' });
    }

    return NextResponse.json({ linked: 0 });
  }

  // ── Process each invitation ─────────────────────────────────
  let linked = 0;
  for (const inv of invitations) {
    try {
      // 1. Mark invitation as accepted
      await admin.from('invitations')
        .update({ status: 'accepted' })
        .eq('id', inv.id);

      // 2. Create bidirectional friendship
      await linkFriendship(admin, inv.inviter_id, user.id, inv.friend_id);

      linked++;
    } catch (err) {
      console.error(`Error processing invitation ${inv.id}:`, err);
      // Continue processing other invitations even if one fails
    }
  }

  return NextResponse.json({ linked });
}

/*
  Creates a bidirectional friendship between two users.
  Also updates the inviter's friends.linked_user_id for UI compatibility.
*/
async function linkFriendship(admin, inviterId, inviteeId, friendCardId) {
  // Create friendship: inviter → invitee
  await admin.from('friendships').upsert(
    { user_id: inviterId, friend_id: inviteeId },
    { onConflict: 'user_id,friend_id' }
  );

  // Create friendship: invitee → inviter
  await admin.from('friendships').upsert(
    { user_id: inviteeId, friend_id: inviterId },
    { onConflict: 'user_id,friend_id' }
  );

  // Update the inviter's friend card with linked_user_id (UI shows green badge)
  if (friendCardId) {
    await admin.from('friends')
      .update({ linked_user_id: inviteeId })
      .eq('id', friendCardId)
      .eq('user_id', inviterId);
  }
}
