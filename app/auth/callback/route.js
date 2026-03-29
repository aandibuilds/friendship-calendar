import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/*
  GET /auth/callback

  Handles redirect from Supabase auth links.
  - token_hash/type → forward to /auth/confirm (client page handles it)
  - code → exchange for session server-side (PKCE), then redirect
  - neither → redirect to /login
*/

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  // token_hash must be handled client-side for proper session storage
  if (tokenHash && type) {
    const confirmUrl = new URL(`${origin}/auth/confirm`);
    confirmUrl.searchParams.set('token_hash', tokenHash);
    confirmUrl.searchParams.set('type', type);
    return NextResponse.redirect(confirmUrl.toString());
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // PKCE code exchange (server-side)
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('Auth callback code exchange error:', error);
    return NextResponse.redirect(`${origin}/login`);
  }

  return NextResponse.redirect(`${origin}/`);
}
