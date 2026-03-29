'use client';
import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';

/*
  /update-password — Forgot password completion

  User arrives here after clicking a password reset email link.
  Session was established by /auth/confirm before redirecting here.
  After setting new password → sign out → redirect to /login.
*/

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match. Please make sure both fields are the same.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) {
      setError(updateErr.message);
      setLoading(false);
      return;
    }

    // Sign out so user must sign in with new password
    await supabase.auth.signOut();
    window.location.href = '/login?message=password_updated';
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
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16, margin: '0 auto 12px',
          background: 'linear-gradient(135deg, #7C3AED, #B07ACC)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 700, color: 'white', letterSpacing: -1,
        }}>FC</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>Friendship Calendar</h1>
      </div>

      <div style={{
        background: 'white', borderRadius: 20, padding: '32px 28px',
        width: '100%', maxWidth: 380,
        boxShadow: '0 4px 24px rgba(124,58,237,0.10)',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>Reset your password</h2>
        <p style={{ fontSize: 13.5, color: '#6B7280', marginBottom: 24 }}>Enter your new password below.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>New password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters" required autoFocus style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Confirm new password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Type the same password again" required style={inputStyle} />
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#DC2626' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            background: 'linear-gradient(135deg, #7C3AED, #9F67E4)',
            color: 'white', border: 'none', borderRadius: 12,
            padding: '12px', fontSize: 15, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, marginTop: 4,
          }}>
            {loading ? 'Saving...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
