import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const inviterId = searchParams.get('inviter');
  const friendId = searchParams.get('friend');

  if (!code) return NextResponse.redirect(`${origin}/login`);

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

  // Exchange code for session
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login`);

  // If this came from a friend invite, link the accounts
  if (inviterId && friendId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Link this user's account to the friend record in the inviter's list
      await supabase
        .from('friends')
        .update({ linked_user_id: user.id })
        .eq('id', friendId)
        .eq('user_id', inviterId);

      // Mark invite as accepted
      await supabase
        .from('friend_invites')
        .update({ accepted: true })
        .eq('friend_id', friendId)
        .eq('inviter_id', inviterId);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
