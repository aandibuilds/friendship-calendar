'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';

export default function LoginPage() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'reset'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  // Check URL for success messages (e.g., after password reset)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('message') === 'password_updated') {
      setMessage('Password updated! Sign in with your new password.');
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'reset') {
        // ── Forgot password: send reset email ──
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/confirm`,
        });
        if (resetErr) { setError(resetErr.message); return; }
        setMessage('Check your email for a password reset link.');

      } else if (mode === 'signup') {
        // ── Sign up ──
        if (!name.trim()) { setError('Please enter your name.'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name.trim() } },
        });
        if (signUpErr) { setError(signUpErr.message); return; }
        setMessage('Check your email to confirm your account, then sign in.');
        setMode('signin');

      } else {
        // ── Sign in ──
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) {
          setError('Invalid email or password. Forgot your password?');
          return;
        }
        // Auto-accept any pending invitations for this email
        if (data.user) {
          await fetch('/api/accept-invite', { method: 'POST' }).catch(() => {});
        }
        window.location.href = '/';
        return;
      }
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
  };

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
        <p style={{ fontSize: 13.5, color: '#6B7280', marginBottom: 24 }}>
          {mode === 'signin' ? 'Sign in to your account'
            : mode === 'signup' ? 'Start nurturing your friendships'
            : "Enter your email and we'll send you a reset link"}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'signup' && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Your name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="What should friends call you?" required style={inputStyle} />
            </div>
          )}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required style={inputStyle} />
          </div>
          {mode !== 'reset' && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'} required style={inputStyle} />
            </div>
          )}

          {/* Error message */}
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#DC2626' }}>
              {error}
              {/* If sign-in error, offer forgot password shortcut */}
              {mode === 'signin' && error.includes('Forgot') && (
                <button
                  type="button"
                  onClick={() => { setMode('reset'); setError(''); setMessage(''); }}
                  style={{ display: 'block', marginTop: 6, background: 'none', border: 'none', color: '#7C3AED', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 13 }}
                >
                  Reset my password
                </button>
              )}
            </div>
          )}
          {/* Success message */}
          {message && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#16A34A' }}>
              {message}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            background: 'linear-gradient(135deg, #7C3AED, #9F67E4)',
            color: 'white', border: 'none', borderRadius: 12,
            padding: '12px', fontSize: 15, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, marginTop: 4,
          }}>
            {loading ? 'Please wait...'
              : mode === 'signin' ? 'Sign in'
              : mode === 'signup' ? 'Create account'
              : 'Send reset link'}
          </button>
        </form>

        {/* Mode toggle links */}
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
