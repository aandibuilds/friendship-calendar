import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const inviterId = searchParams.get('inviter');
  const friendId = searchParams.get('friend');

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  let sessionError = null;

  if (code) {
    // Standard OAuth / magic link with PKCE
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    sessionError = error;
  } else if (tokenHash && type) {
    // Invite link — uses token_hash + type instead of code
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    sessionError = error;
  } else {
    return NextResponse.redirect(`${origin}/login`);
  }

  if (sessionError) {
    console.error('Auth callback error:', sessionError);
    return NextResponse.redirect(`${origin}/login`);
  }

  // Link accounts if this came from a friend invite
  if (inviterId && friendId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('friends')
        .update({ linked_user_id: user.id })
        .eq('id', friendId)
        .eq('user_id', inviterId);

      await supabase
        .from('friend_invites')
        .update({ accepted: true })
        .eq('friend_id', friendId)
        .eq('inviter_id', inviterId);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
