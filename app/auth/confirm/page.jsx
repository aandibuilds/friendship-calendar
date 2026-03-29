'use client';
import { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';

export default function ConfirmPage() {
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    async function verify() {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const searchParams = new URLSearchParams(window.location.search);

      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      const inviterId = searchParams.get('inviter');
      const friendId = searchParams.get('friend');

      if (!tokenHash || !type) {
        window.location.href = '/login';
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

      if (error) {
        console.error('verifyOtp error:', error);
        setStatus('error');
        return;
      }

      // Link accounts if from friend invite
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
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>Link expired</h2>
          <p style={{ fontSize: 13.5, color: '#6B7280', marginBottom: 20 }}>
            This link has expired or already been used. Request a new one from the sign-in page.
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
        Verifying…
      </div>
    </div>
  );
}
