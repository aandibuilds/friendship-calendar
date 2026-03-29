import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(req) {
  const { email, friendId, friendName } = await req.json();
  if (!email || !friendId) {
    return NextResponse.json({ error: 'Missing email or friendId' }, { status: 400 });
  }

  // Get the calling user's session
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Use service role to send invite (bypasses email confirmation)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Store the invite record so we can link accounts on signup
  const { data: invite, error: inviteErr } = await supabase
    .from('friend_invites')
    .insert({ inviter_id: user.id, friend_id: friendId, email })
    .select()
    .single();

  if (inviteErr) {
    // Ignore duplicate invite errors
    if (!inviteErr.message.includes('duplicate')) {
      return NextResponse.json({ error: inviteErr.message }, { status: 500 });
    }
  }

  // Send the invite email via Supabase Auth
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://friendship-calendar.vercel.app';
  // Invite links use /auth/callback (Route Handler handles token_hash from inviteUserByEmail)
  const redirectUrl = `${siteUrl}/auth/callback?inviter=${user.id}&friend=${friendId}`;
  // Recovery emails must go to a CLIENT page — server Route Handlers can't read the hash fragment
  const recoveryRedirectUrl = `${siteUrl}/auth/confirm?inviter=${user.id}&friend=${friendId}`;
  const { error: sendErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirectUrl,
    data: { invited_by: user.id, friend_id: friendId, inviter_name: user.user_metadata?.name || 'A friend' },
  });

  if (sendErr) {
    if (sendErr.message.includes('already been registered')) {
      // Account exists from a previous invite attempt — send a recovery link
      // so they can still complete their profile setup
      const { error: resetErr } = await admin.auth.resetPasswordForEmail(email, {
        redirectTo: recoveryRedirectUrl,
      });
      if (resetErr) {
        return NextResponse.json({ error: resetErr.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: sendErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
