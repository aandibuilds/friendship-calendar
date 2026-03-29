'use client';
import { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';

/*
  /auth/confirm — Session establishment for Supabase email links

  Used for: password reset links, email confirmation links.
  NOT used for invite links (those go directly to /confirm-profile?token=XYZ).

  After establishing the session, routes to:
    - type=recovery → /update-password
    - all other → /
*/

export default function ConfirmPage() {
  const [status, setStatus] = useState('verifying');

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
        ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
      } else if (accessToken && refreshToken) {
        ({ error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }));
      } else if (code) {
        ({ error } = await supabase.auth.exchangeCodeForSession(code));
      } else {
        window.location.href = '/login';
        return;
      }

      if (error) {
        console.error('Auth confirm error:', error);
        setStatus('error');
        return;
      }

      // Route based on type
      if (type === 'recovery') {
        window.location.href = '/update-password';
      } else {
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
