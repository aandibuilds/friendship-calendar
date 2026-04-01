'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';

/*
  /confirm-profile — Three modes:

  Mode A: ?token=XYZ, NEW user (PUBLIC, no auth needed)
    - Validates invite token
    - Shows signup form: email (locked), name, birthday, password
    - Creates account + accepts invite + creates friendship
    - Auto-signs in and redirects to /

  Mode A2: ?token=XYZ, EXISTING user (PUBLIC, no auth needed)
    - Validates invite token, detects existing account
    - Shows sign-in form: email (locked), password only
    - Signs in + accepts invite
    - Redirects to /

  Mode B: No token (requires auth session)
    - For users with incomplete profiles (completed_profile = false)
    - Shows profile completion form: name, birthday
    - Marks profile complete, accepts any pending invites
    - Redirects to /
*/

export default function ConfirmProfilePage() {
  // Token from URL (Mode A / A2)
  const [token, setToken] = useState(null);
  const [tokenValid, setTokenValid] = useState(null); // null=loading, true, false
  const [tokenError, setTokenError] = useState('');
  const [inviterName, setInviterName] = useState('');
  const [existingUser, setExistingUser] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Mode B: logged-in user completing profile
  const [isProfileMode, setIsProfileMode] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    async function init() {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');

      if (urlToken) {
        // ── Mode A / A2: Token-based invite ──
        // First check if user is already signed in — if so, accept the invite
        // directly and redirect to the app (no need to show any form)
        const supabase = createClient();
        const { data: { user: existingAuth } } = await supabase.auth.getUser();

        if (existingAuth) {
          // User is already signed in — accept any pending invites and redirect
          await fetch('/api/accept-invite', { method: 'POST' }).catch(() => {});
          window.location.href = '/';
          return;
        }

        setToken(urlToken);
        const res = await fetch('/api/validate-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: urlToken }),
        });
        const data = await res.json();

        if (data.valid) {
          setTokenValid(true);
          setEmail(data.email);
          setInviterName(data.inviterName);
          setExistingUser(data.existingUser);
        } else {
          setTokenValid(false);
          setTokenError(
            data.reason === 'expired' ? 'This invite has expired. Ask your friend to resend it.'
            : data.reason === 'already_used' ? 'This invite has already been used. Try signing in instead.'
            : 'Invalid invite link.'
          );
        }
      } else {
        // ── Mode B: Profile completion for logged-in user ──
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = '/login';
          return;
        }
        setIsProfileMode(true);
        setEmail(user.email || '');
        if (user.user_metadata?.name) setName(user.user_metadata.name);
      }

      setPageReady(true);
    }
    init();
  }, []);

  // ── Mode A: Submit signup via invite token (NEW user) ──
  async function handleTokenSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!birthday) { setError('Please enter your birthday.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);

    const res = await fetch('/api/register-invited-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, name: name.trim(), birthday, password }),
    });
    const data = await res.json();

    if (data.error) {
      setError(data.error);
      setLoading(false);
      return;
    }

    // Auto-sign in with the new credentials
    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: data.email,
      password,
    });

    if (signInErr) {
      setError('Account created! But auto-sign-in failed. Please go to the sign-in page.');
      setLoading(false);
      return;
    }

    window.location.href = '/';
  }

  // ── Mode A2: Submit sign-in via invite token (EXISTING user) ──
  async function handleExistingSignIn(e) {
    e.preventDefault();
    setError('');

    if (!password) { setError('Please enter your password.'); return; }

    setLoading(true);
    const supabase = createClient();

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInErr) {
      setError('Invalid password. Try again or reset your password.');
      setLoading(false);
      return;
    }

    // Accept pending invites (including the one from this token)
    await fetch('/api/accept-invite', { method: 'POST' }).catch(() => {});

    window.location.href = '/';
  }

  // ── Mode B: Submit profile completion ──
  async function handleProfileSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!birthday) { setError('Please enter your birthday.'); return; }

    setLoading(true);
    const supabase = createClient();

    // Update auth user metadata
    const { error: updateErr } = await supabase.auth.updateUser({
      data: { name: name.trim(), completed_profile: true },
    });
    if (updateErr) { setError(updateErr.message); setLoading(false); return; }

    // Update profile row
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').upsert({
        id: user.id,
        name: name.trim(),
        email: user.email,
        birthday,
        completed_profile: true,
      });
    }

    // Accept any pending invites
    await fetch('/api/accept-invite', { method: 'POST' }).catch(() => {});

    window.location.href = '/';
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
  };

  // ── Loading state ──
  if (!pageReady) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 60%, #FCE7F3 100%)',
      }}>
        <div style={{ textAlign: 'center', color: '#7C3AED', fontSize: 15, fontWeight: 600 }}>Loading...</div>
      </div>
    );
  }

  // ── Invalid token ──
  if (token && tokenValid === false) {
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
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>Invite link issue</h2>
          <p style={{ fontSize: 13.5, color: '#6B7280', marginBottom: 20 }}>{tokenError}</p>
          <a href="/login" style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #7C3AED, #9F67E4)',
            color: 'white', borderRadius: 12,
            padding: '10px 24px', fontSize: 14, fontWeight: 700,
            textDecoration: 'none',
          }}>Go to sign in</a>
        </div>
      </div>
    );
  }

  // ── Determine mode ──
  const isTokenMode = token && tokenValid;
  const isExistingUserMode = isTokenMode && existingUser;
  const isNewUserMode = isTokenMode && !existingUser;

  const handleSubmit = isExistingUserMode
    ? handleExistingSignIn
    : isNewUserMode
      ? handleTokenSubmit
      : handleProfileSubmit;

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
          {isTokenMode ? "You're invited!" : 'Complete your profile'}
        </h2>
        <p style={{ fontSize: 13.5, color: '#6B7280', marginBottom: 24 }}>
          {isExistingUserMode
            ? `${inviterName} wants to stay connected with you. Sign in to accept.`
            : isNewUserMode
              ? `${inviterName} wants to stay connected with you.`
              : 'Fill in your details to get started.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Email — always shown, always read-only */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Email</label>
            <input type="email" value={email} readOnly
              style={{ ...inputStyle, background: '#F9FAFB', color: '#6B7280' }} />
          </div>

          {/* Mode A2: Existing user — just password */}
          {isExistingUserMode && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Your existing password" required autoFocus style={inputStyle} />
            </div>
          )}

          {/* Mode A: New user — name, birthday, password, confirm */}
          {isNewUserMode && (
            <>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Your name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="What should friends call you?" required autoFocus style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Birthday</label>
                <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)}
                  required style={inputStyle} />
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
            </>
          )}

          {/* Mode B: Profile completion — name, birthday */}
          {isProfileMode && (
            <>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Your name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="What should friends call you?" required autoFocus style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Birthday</label>
                <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)}
                  required style={inputStyle} />
              </div>
            </>
          )}

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
            {loading ? 'Setting up...'
              : isExistingUserMode ? 'Sign in & accept invite'
              : isNewUserMode ? 'Accept invite & create account'
              : 'Save profile'}
          </button>

          {isExistingUserMode && (
            <p style={{ fontSize: 12.5, color: '#9CA3AF', textAlign: 'center', margin: '4px 0 0' }}>
              <a href="/login" style={{ color: '#7C3AED', fontWeight: 600 }}>Forgot password?</a>
            </p>
          )}

          {isNewUserMode && (
            <p style={{ fontSize: 12.5, color: '#9CA3AF', textAlign: 'center', margin: '4px 0 0' }}>
              Already have an account? <a href="/login" style={{ color: '#7C3AED', fontWeight: 600 }}>Sign in</a>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
