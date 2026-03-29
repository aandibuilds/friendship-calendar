'use client';
import { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';

/*
  /auth/confirm — Client-side session establishment

  Supabase email links (invite, recovery, magic link) redirect here.
  Depending on project settings, the token arrives as:
    1. ?token_hash=xxx&type=invite|recovery     (OTP flow)
    2. ?code=xxx                                (PKCE flow)
    3. #access_token=xxx&refresh_token=yyy      (implicit flow)

  After establishing the session, routes the user to the right page:
    - type=recovery → /update-password
    - type=invite or no profile name → /confirm-profile
    - otherwise → /
*/

export default function ConfirmPage() {
  const [status, setStatus] = useState('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function verify() {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.slice(1));

      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type') || hashParams.get('type');
      const code = searchParams.get('code');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      const supabase = createClient();
      let error = null;

      if (tokenHash && type) {
        // OTP flow — inviteUserByEmail and some recovery links
        ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
      } else if (accessToken && refreshToken) {
        // Implicit/hash flow
        ({ error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }));
      } else if (code) {
        // PKCE code flow (resetPasswordForEmail from browser)
        ({ error } = await supabase.auth.exchangeCodeForSession(code));
      } else {
        // No token at all — redirect to login
        window.location.href = '/login';
        return;
      }

      if (error) {
        console.error('Auth confirm error:', error);
        setErrorMsg(error.message || 'Verification failed');
        setStatus('error');
        return;
      }

      // Session established — determine where to route
      const { data: { user } } = await supabase.auth.getUser();
      const hasName = user?.user_metadata?.name;

      if (type === 'recovery') {
        // Password reset — always go to update-password
        window.location.href = '/update-password';
      } else if (type === 'invite' || !hasName) {
        // New user from invite OR user with no name — complete profile
        window.location.href = '/confirm-profile';
      } else {
        // Existing user with profile — go to app
        window.location.href = '/';
      }
    }

    verify();
  }, []);

  if (status === 'error') {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 60%, #FCE7F3 100%)',
        padding: '24px',
      }}>
        <div style={{
          background: 'white', borderRadius: 20, padding: '32px 28px',
          width: '100%', maxWidth: 380,
          boxShadow: '0 4px 24px rgba(124,58,237,0.10)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>&#9888;&#65039;</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>Link expired or invalid</h2>
          <p style={{ fontSize: 13.5, color: '#6B7280', marginBottom: 20 }}>
            This link has expired or has already been used. Please request a new one.
          </p>
          <a href="/login" style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #7C3AED, #9F67E4)',
            color: 'white', borderRadius: 12,
            padding: '10px 24px', fontSize: 14, fontWeight: 700,
            textDecoration: 'none',
          }}>Back to sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 60%, #FCE7F3 100%)',
    }}>
      <div style={{ textAlign: 'center', color: '#7C3AED', fontSize: 15, fontWeight: 600 }}>
        Verifying...
      </div>
    </div>
  );
}
