import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { sendInviteEmail } from '../../../lib/resend';

/*
  POST /api/invite-friend
  Body: { email, friendId, friendName }

  1. Creates/updates an invitation record with a custom token
  2. Sends a proper invite email via Resend
  3. Falls back to a copyable link if Resend is not configured

  NO LONGER uses inviteUserByEmail or resetPasswordForEmail.
*/

export async function POST(req) {
  const { email, friendId, friendName } = await req.json();
  if (!email || !friendId) {
    return NextResponse.json({ error: 'Missing email or friendId' }, { status: 400 });
  }

  // Authenticate calling user
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Admin client for bypassing RLS
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // ── Check for existing invitation ───────────────────────────
  const { data: existing } = await admin
    .from('invitations')
    .select('id, status, token')
    .eq('inviter_id', user.id)
    .eq('invitee_email', email)
    .single();

  if (existing?.status === 'accepted') {
    return NextResponse.json({ alreadyFriends: true });
  }

  // ── Create or refresh invitation ────────────────────────────
  let token;

  if (existing) {
    // Refresh existing invitation (resend)
    token = crypto.randomUUID();
    await admin.from('invitations').update({
      status: 'pending',
      token,
      friend_id: friendId,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq('id', existing.id);
  } else {
    // Create new invitation
    token = crypto.randomUUID();
    const { error: insertErr } = await admin.from('invitations').insert({
      inviter_id: user.id,
      invitee_email: email,
      friend_id: friendId,
      status: 'pending',
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (insertErr) {
      console.error('Insert invitation error:', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  // ── Send email ──────────────────────────────────────────────
  const inviterName = user.user_metadata?.name || 'A friend';
  const emailResult = await sendInviteEmail({ to: email, inviterName, token });

  if (emailResult.sent) {
    return NextResponse.json({ success: true });
  }

  // Email not sent (no API key or send failed) — return link for manual sharing
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://friendship-calendar.vercel.app';
  const inviteLink = `${siteUrl}/confirm-profile?token=${token}`;

  return NextResponse.json({
    success: true,
    manualLink: inviteLink,
    emailNotSent: true,
    reason: emailResult.reason,
  });
}
