'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';

/*
  /confirm-profile — Profile completion for invited users

  User arrives here after clicking an invite email link.
  Session was established by /auth/confirm before redirecting here.
  Shows: email (locked), name, password, confirm password.
  On submit: sets password + name, accepts invite, creates friendship.
*/

export default function ConfirmProfilePage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [hasPendingInvite, setHasPendingInvite] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      setEmail(user.email || '');
      if (user.user_metadata?.name) setName(user.user_metadata.name);

      // Check for pending invitations
      const { data: invitations } = await supabase
        .from('invitations')
        .select('id')
        .eq('invitee_email', user.email)
        .eq('status', 'pending')
        .limit(1);

      setHasPendingInvite(invitations?.length > 0);
      setPageLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) {
      setError('Passwords do not match. Please make sure both fields are the same.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Set name + password on the auth user
    const { error: updateErr } = await supabase.auth.updateUser({
      password,
      data: { name: name.trim() },
    });
    if (updateErr) { setError(updateErr.message); setLoading(false); return; }

    // Upsert profile row
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').upsert({
        id: user.id,
        name: name.trim(),
        email: user.email,
      });
    }

    // Accept invite + create friendship (server-side, bypasses RLS)
    const res = await fetch('/api/accept-invite', { method: 'POST' });
    const result = await res.json();
    if (result.error) {
      console.error('accept-invite error:', result.error);
    }

    window.location.href = '/';
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
  };

  if (pageLoading) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 60%, #FCE7F3 100%)',
      }}>
        <div style={{ textAlign: 'center', color: '#7C3AED', fontSize: 15, fontWeight: 600 }}>Loading...</div>
      </div>
    );
  }

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
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>
          {hasPendingInvite ? "You're invited!" : 'Complete your profile'}
        </h2>
        <p style={{ fontSize: 13.5, color: '#6B7280', marginBottom: 24 }}>
          {hasPendingInvite
            ? 'Set up your account to connect with your friend.'
            : 'Fill in your details to get started.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Email</label>
            <input type="email" value={email} readOnly
              style={{ ...inputStyle, background: '#F9FAFB', color: '#6B7280' }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Your name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="What should friends call you?" required autoFocus style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters" required style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Confirm password</label>
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
            {loading ? 'Setting up...' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
