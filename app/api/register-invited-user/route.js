import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

/*
  POST /api/register-invited-user
  Body: { token, name, birthday, password }

  Creates a new Supabase auth account for the invited user,
  completes their profile, accepts the invitation, and
  the DB trigger automatically creates friendships.

  This is a PUBLIC endpoint — the user hasn't signed up yet.
*/

export async function POST(req) {
  const { token, name, birthday, password } = await req.json();

  if (!token || !name?.trim() || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // ── Validate token ──────────────────────────────────────────
  const { data: invitation, error: fetchErr } = await admin
    .from('invitations')
    .select('id, inviter_id, invitee_email, status, expires_at, friend_id')
    .eq('token', token)
    .single();

  if (fetchErr || !invitation) {
    return NextResponse.json({ error: 'Invalid invite token' }, { status: 400 });
  }
  if (invitation.status === 'accepted') {
    return NextResponse.json({ error: 'This invite has already been used' }, { status: 400 });
  }
  if (invitation.status === 'expired' || new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite has expired. Ask your friend to resend it.' }, { status: 400 });
  }

  const email = invitation.invitee_email;

  // ── Check if user already has a Supabase account ────────────
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email);

  let userId;

  if (existingUser) {
    // User exists (maybe from a prior inviteUserByEmail call) — update their password + metadata
    userId = existingUser.id;
    await admin.auth.admin.updateUserById(userId, {
      password,
      user_metadata: { name: name.trim(), completed_profile: true },
    });
  } else {
    // Create new Supabase auth account (email auto-confirmed, no verification email)
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name.trim(), completed_profile: true },
    });
    if (createErr) {
      console.error('createUser error:', createErr);
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }
    userId = newUser.user.id;
  }

  // ── Update profile ──────────────────────────────────────────
  await admin.from('profiles').upsert({
    id: userId,
    name: name.trim(),
    email,
    birthday: birthday || '',
    completed_profile: true,
  });

  // ── Accept invitation (triggers DB function → creates friendships) ─
  const { error: acceptErr } = await admin
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', invitation.id);

  if (acceptErr) {
    console.error('Accept invitation error:', acceptErr);
    // Non-fatal — friendships might not be created by trigger, so do it manually
    await createFriendshipsManually(admin, invitation.inviter_id, userId, invitation.friend_id);
  }

  // ── Double-check: ensure friendships exist (belt + suspenders) ─
  await createFriendshipsManually(admin, invitation.inviter_id, userId, invitation.friend_id);

  return NextResponse.json({ success: true, email });
}

async function createFriendshipsManually(admin, inviterId, inviteeId, friendCardId) {
  // Bidirectional friendship (idempotent via upsert)
  await admin.from('friendships').upsert(
    { user_id: inviterId, friend_id: inviteeId },
    { onConflict: 'user_id,friend_id' }
  );
  await admin.from('friendships').upsert(
    { user_id: inviteeId, friend_id: inviterId },
    { onConflict: 'user_id,friend_id' }
  );

  // Update inviter's friend card for UI badge
  if (friendCardId) {
    await admin.from('friends')
      .update({ linked_user_id: inviteeId })
      .eq('id', friendCardId)
      .eq('user_id', inviterId);
  }
}
