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

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname.startsWith('/login');
  const isUpdatePassword = pathname.startsWith('/update-password');
  const isConfirmProfile = pathname.startsWith('/confirm-profile');

  // /confirm-profile?token=XYZ is PUBLIC — invited users haven't signed up yet
  if (isConfirmProfile && request.nextUrl.searchParams.has('token')) {
    return supabaseResponse;
  }

  // Unauthenticated → login (except allowed pages)
  // Note: /confirm-profile WITH a token is already handled above (early return on line 32)
  if (!user && !isLoginPage && !isUpdatePassword) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Authenticated → don't show login page
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Profile completion enforcement:
  // Only redirect if completed_profile is EXPLICITLY false.
  // undefined/null = existing user from before this feature → let them through.
  if (user && !isConfirmProfile && !isUpdatePassword && !isLoginPage) {
    const completed = user.user_metadata?.completed_profile;
    if (completed === false) {
      return NextResponse.redirect(new URL('/confirm-profile', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icon|apple-touch-icon|.*\\.png$|.*\\.svg$|api/|auth/).*)'],
};
