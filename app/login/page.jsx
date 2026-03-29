'use client';
import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';

export default function LoginPage() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'reset'
  const isInvited = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('invited') === '1';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);

    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) { setError(error.message); setLoading(false); return; }
      setMessage('Check your email for a password reset link.');
    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email, password, options: { data: { name } },
      });
      if (error) { setError(error.message); setLoading(false); return; }
      setMessage('Check your email to confirm your account, then sign in.');
      setMode('signin');
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      // Auto-link any pending invites for this email
      if (data.user) {
        const { data: invites } = await supabase
          .from('friend_invites')
          .select('inviter_id, friend_id')
          .eq('email', email)
          .eq('accepted', false);
        if (invites?.length) {
          for (const inv of invites) {
            await supabase.from('friends').update({ linked_user_id: data.user.id })
              .eq('id', inv.friend_id).eq('user_id', inv.inviter_id);
            await supabase.from('friend_invites').update({ accepted: true })
              .eq('friend_id', inv.friend_id).eq('inviter_id', inv.inviter_id);
          }
        }
      }
      window.location.href = '/';
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 60%, #FCE7F3 100%)',
      padding: '24px',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16, margin: '0 auto 12px',
          background: 'linear-gradient(135deg, #7C3AED, #B07ACC)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 700, color: 'white', letterSpacing: -1,
        }}>FC</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>Friendship Calendar</h1>
        <p style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>Stay intentional about the people who matter.</p>
      </div>

      {/* Card */}
      <div style={{
        background: 'white', borderRadius: 20, padding: '32px 28px',
        width: '100%', maxWidth: 380,
        boxShadow: '0 4px 24px rgba(124,58,237,0.10)',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>
          {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
        </h2>
        <p style={{ fontSize: 13.5, color: '#6B7280', marginBottom: isInvited ? 12 : 24 }}>
          {mode === 'signin' ? 'Sign in to your account' : mode === 'signup' ? 'Start nurturing your friendships' : 'We\'ll email you a reset link'}
        </p>
        {isInvited && (
          <div style={{ background: '#FFF8E1', border: '1px solid #F9A825', borderRadius: 8, padding: '9px 12px', marginBottom: 16, fontSize: 13, color: '#7A5C00' }}>
            You were invited! Check your email for the invite link — click it to set your password and sign in.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'signup' && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Your name</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="What should friends call you?"
                required
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          {mode !== 'reset' && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                required
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#DC2626' }}>
              {error}
            </div>
          )}
          {message && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#16A34A' }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #9F67E4)',
              color: 'white', border: 'none', borderRadius: 12,
              padding: '12px', fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, marginTop: 4,
            }}
          >
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13.5, color: '#6B7280' }}>
          {mode === 'reset' ? (
            <button onClick={() => { setMode('signin'); setError(''); setMessage(''); }}
              style={{ background: 'none', border: 'none', color: '#7C3AED', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              Back to sign in
            </button>
          ) : (
            <>
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage(''); }}
                style={{ background: 'none', border: 'none', color: '#7C3AED', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
              {mode === 'signin' && (
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => { setMode('reset'); setError(''); setMessage(''); }}
                    style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 13, cursor: 'pointer', padding: 0 }}>
                    Forgot password?
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
