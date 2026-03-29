import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

/*
  POST /api/validate-token
  Body: { token }

  Validates an invite token against the invitations table.
  This is a PUBLIC endpoint (no auth required) — invited users
  haven't signed up yet.
*/

export async function POST(req) {
  const { token } = await req.json();
  if (!token) {
    return NextResponse.json({ valid: false, reason: 'missing_token' });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Look up the invitation
  const { data: invitation, error } = await admin
    .from('invitations')
    .select('id, inviter_id, invitee_email, status, expires_at, friend_id')
    .eq('token', token)
    .single();

  if (error || !invitation) {
    return NextResponse.json({ valid: false, reason: 'not_found' });
  }

  if (invitation.status === 'accepted') {
    return NextResponse.json({ valid: false, reason: 'already_used' });
  }

  if (invitation.status === 'expired' || new Date(invitation.expires_at) < new Date()) {
    // Mark as expired if not already
    if (invitation.status !== 'expired') {
      await admin.from('invitations').update({ status: 'expired' }).eq('id', invitation.id);
    }
    return NextResponse.json({ valid: false, reason: 'expired' });
  }

  // Get inviter's name for display
  const { data: inviterProfile } = await admin
    .from('profiles')
    .select('name')
    .eq('id', invitation.inviter_id)
    .single();

  // Check if invitee already has a Supabase account
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === invitation.invitee_email);

  return NextResponse.json({
    valid: true,
    email: invitation.invitee_email,
    inviterName: inviterProfile?.name || 'A friend',
    existingUser: !!existingUser,
  });
}
