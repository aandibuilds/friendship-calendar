import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session so it doesn't expire
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname.startsWith('/login');
  const isUpdatePassword = pathname.startsWith('/update-password');
  const isConfirmProfile = pathname.startsWith('/confirm-profile');

  // These pages may be accessed with a session that was JUST established
  // by /auth/confirm (via redirect). Allow them even if middleware can't
  // see the session yet (cookie propagation timing).
  if (!user && !isLoginPage && !isUpdatePassword && !isConfirmProfile) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Authenticated users shouldn't see the login page
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icon|apple-touch-icon|.*\\.png$|.*\\.svg$|api/|auth/).*)'],
};
