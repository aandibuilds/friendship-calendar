import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

/*
  POST /api/register-invited-user
  Body: { token, name, birthday, password }

  PUBLIC endpoint — the user hasn't signed up yet.

  1. Validates the invite token
  2. Creates (or updates) the Supabase auth account
  3. Updates the profile row
  4. Sets invitation status to 'accepted'
     → DB trigger handles friendship creation + linked_user_id
*/

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { token, name, birthday, password } = body;

  if (!token || !name?.trim() || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!birthday) {
    return NextResponse.json({ error: 'Birthday is required' }, { status: 400 });
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

  // ── Create or update auth account ───────────────────────────
  // Check if user exists via profiles table (efficient single-row lookup)
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  let userId;

  try {
    if (existingProfile) {
      // User exists (maybe from a prior inviteUserByEmail call) — update password + metadata
      userId = existingProfile.id;
      const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
        password,
        user_metadata: { name: name.trim(), completed_profile: true },
      });
      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
    } else {
      // Create new account (email auto-confirmed, no verification email sent)
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: name.trim(), completed_profile: true },
      });
      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 500 });
      }
      userId = newUser.user.id;
    }
  } catch (err) {
    console.error('Auth account error:', err);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }

  // ── Update profile ──────────────────────────────────────────
  const { error: profileErr } = await admin.from('profiles').upsert({
    id: userId,
    name: name.trim(),
    email,
    birthday: birthday || '',
    completed_profile: true,
  });
  if (profileErr) {
    console.error('Profile upsert error:', profileErr);
  }

  // ── Accept invitation ───────────────────────────────────────
  // Setting status to 'accepted' fires the DB trigger which:
  //   1. Creates bidirectional friendships
  //   2. Updates friends.linked_user_id
  // No manual friendship creation needed here.
  const { error: acceptErr } = await admin
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', invitation.id);

  if (acceptErr) {
    console.error('Accept invitation error:', acceptErr);
    return NextResponse.json({ error: 'Account created but invitation acceptance failed. Try signing in.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, email });
}
