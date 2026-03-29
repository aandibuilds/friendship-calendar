import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createAdminClient } from '@supabase/supabase-js';

/*
  POST /api/invite-friend
  Body: { email, friendId, friendName }

  1. Creates an invitation record in our invitations table
  2. Sends email via Supabase inviteUserByEmail (new users)
     or resetPasswordForEmail (existing users)
  3. Both redirect to /auth/confirm → /confirm-profile
*/

export async function POST(req) {
  const { email, friendId, friendName } = await req.json();
  if (!email || !friendId) {
    return NextResponse.json({ error: 'Missing email or friendId' }, { status: 400 });
  }

  // Get calling user's session
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Admin client (service role) for sending invites and bypassing RLS
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // ── Check for existing pending invite (prevent duplicates) ──
  const { data: existing } = await admin
    .from('invitations')
    .select('id, status')
    .eq('inviter_id', user.id)
    .eq('invitee_email', email)
    .single();

  if (existing && existing.status === 'pending') {
    // Already has a pending invite — resend the email
    return await sendInviteEmail(admin, email, user, friendId);
  }

  if (existing && existing.status === 'accepted') {
    return NextResponse.json({ alreadyFriends: true });
  }

  // ── Create invitation record ────────────────────────────────
  const { error: insertErr } = await admin
    .from('invitations')
    .upsert({
      inviter_id: user.id,
      invitee_email: email,
      friend_id: friendId,
      status: 'pending',
      token: crypto.randomUUID(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'inviter_id,invitee_email' });

  if (insertErr) {
    console.error('Insert invitation error:', insertErr);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // ── Send email ──────────────────────────────────────────────
  return await sendInviteEmail(admin, email, user, friendId);
}

async function sendInviteEmail(admin, email, user, friendId) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://friendship-calendar.vercel.app';
  const confirmUrl = `${siteUrl}/auth/confirm`;

  // Try inviteUserByEmail first (creates account + sends email for new users)
  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: confirmUrl,
    data: {
      invited_by: user.id,
      friend_id: friendId,
      inviter_name: user.user_metadata?.name || 'A friend',
    },
  });

  if (!inviteErr) {
    return NextResponse.json({ success: true });
  }

  // User already has an account — send a recovery/login link instead
  if (inviteErr.message?.includes('already been registered')) {
    const { error: resetErr } = await admin.auth.resetPasswordForEmail(email, {
      redirectTo: confirmUrl,
    });
    if (resetErr) {
      console.error('resetPasswordForEmail error:', resetErr);
      return NextResponse.json({ error: resetErr.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, existingUser: true });
  }

  console.error('inviteUserByEmail error:', inviteErr);
  return NextResponse.json({ error: inviteErr.message }, { status: 500 });
}
