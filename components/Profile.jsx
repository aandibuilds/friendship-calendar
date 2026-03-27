'use client';
import { useState, useMemo } from 'react';
import { getStreak, buildShareProfileLink } from '../lib/data';
import { useToast } from '../lib/toast';

const COLORS = ['#5B4FFF', '#7C3AED', '#D946EF', '#FB7185', '#F472B6', '#14B8A6', '#06B6D4', '#A78BFA'];
const HOBBIES = ['Hiking', 'Cooking', 'Reading', 'Gaming', 'Art', 'Music', 'Fitness', 'Travel', 'Photography', 'Gardening'];
const TIMES = ['Weekend mornings', 'Weekday evenings', 'Weekend nights', 'Weekday lunches', 'Any time'];
const HANGTYPES = ['Coffee catch-ups', 'Dinner out', 'House parties', 'Movies', 'Outdoor activities', 'Game nights', 'Live music', 'Active outings'];

export default function Profile({ profile, onUpdateProfile, friends }) {
  const [editing, setEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [draft, setDraft] = useState(profile);
  const showToast = useToast();

  const yr = new Date().getFullYear();
  const { thisYear, bestStreak } = useMemo(() => ({
    thisYear: friends.reduce((s, f) => s + (f.hangouts || []).filter(h => h.date.startsWith(yr)).length, 0),
    bestStreak: Math.max(0, ...friends.map(getStreak)),
  }), [friends]);

  function startEdit() { setDraft({ ...profile }); setEditing(true); }
  function cancelEdit() { setEditing(false); setShowColorPicker(false); }
  function saveProfile() {
    onUpdateProfile(draft); setEditing(false); setShowColorPicker(false);
    showToast('Profile saved.');
  }
  function toggleTag(arr, val) {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
  }
  function setColor(c) {
    onUpdateProfile({ ...profile, color: c }); showToast('Color updated!');
  }

  const initial = profile.name ? profile.name[0].toUpperCase() : '?';
  const heroSub = profile.location || profile.birthday
    ? [profile.location ? profile.location : '', profile.birthday ? `${Math.floor((Date.now() - new Date(profile.birthday)) / (365.25 * 86400000))} yrs` : ''].filter(Boolean).join('  ·  ')
    : profile.bio ? profile.bio.slice(0, 50) + (profile.bio.length > 50 ? '…' : '')
    : 'Edit your profile →';

  return (
    <div className="view">
      {/* HERO */}
      <div className="profile-hero">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar" style={{ background: profile.color || 'var(--primary)' }}>{initial}</div>
          <button type="button" className="profile-avatar-edit" onClick={() => setShowColorPicker(v => !v)} title="Change color" aria-label="Change profile color">Hue</button>
        </div>
        <div className="profile-hero-info">
          <div className="profile-hero-name">{profile.name || 'Your Name'}</div>
          <div className="profile-hero-sub">{heroSub}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 7, alignSelf: 'flex-start' }}>
          <button className="btn btn-primary btn-sm" onClick={() => { if (!profile.name) { showToast('Add your name first!'); return; } setShowShareModal(true); }}>Share</button>
          <button className="btn btn-ghost btn-sm" onClick={editing ? cancelEdit : startEdit}>{editing ? 'Cancel' : 'Edit'}</button>
        </div>
      </div>

      {/* COLOR PICKER */}
      {showColorPicker && (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 14 }}>
          <div className="form-label" style={{ marginBottom: 10 }}>Pick your color</div>
          <div className="color-picker">
            {COLORS.map(c => (
              <div key={c} className={`color-swatch ${profile.color === c ? 'selected' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>
      )}

      {/* VIEW MODE */}
      {!editing && (
        <>
          <div className="profile-section-grid">
            <div className="profile-info-card"><div className="profile-info-label">Location</div><div className="profile-info-val">{profile.location || '—'}</div></div>
            <div className="profile-info-card"><div className="profile-info-label">Birthday</div><div className="profile-info-val">{profile.birthday ? new Date(profile.birthday + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : '—'}</div></div>
            <div className="profile-info-card" style={{ gridColumn: '1/-1' }}><div className="profile-info-label">Bio</div><div className="profile-info-val" style={{ fontStyle: 'italic', color: 'var(--ink-soft)' }}>{profile.bio || '—'}</div></div>
            <div className="profile-info-card" style={{ gridColumn: '1/-1' }}>
              <div className="profile-info-label">Hobbies & interests</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {(profile.hobbies || []).length ? (profile.hobbies).map(t => <span key={t} className="profile-tag">{t}</span>) : <span style={{ color: 'var(--ink-muted)', fontSize: 13 }}>—</span>}
              </div>
            </div>
            <div className="profile-info-card" style={{ gridColumn: '1/-1' }}>
              <div className="profile-info-label">Preferred hangout times</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {(profile.times || []).length ? (profile.times).map(t => <span key={t} className="profile-tag">{t}</span>) : <span style={{ color: 'var(--ink-muted)', fontSize: 13 }}>—</span>}
              </div>
            </div>
            <div className="profile-info-card" style={{ gridColumn: '1/-1' }}>
              <div className="profile-info-label">Favourite hangout types</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {(profile.hangtypes || []).length ? (profile.hangtypes).map(t => <span key={t} className="profile-tag">{t}</span>) : <span style={{ color: 'var(--ink-muted)', fontSize: 13 }}>—</span>}
              </div>
            </div>
            <div className="profile-info-card"><div className="profile-info-label">Social / contact</div><div className="profile-info-val">{profile.social || '—'}</div></div>
            <div className="profile-info-card"><div className="profile-info-label">Vibe</div><div className="profile-info-val">{profile.vibe || '—'}</div></div>
          </div>
          <div className="section-header" style={{ marginTop: 12 }}><div className="section-title">Your social stats</div></div>
          <div className="stats-row" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <div className="stat-card"><div className="stat-value stat-accent-primary">{friends.length}</div><div className="stat-label">Friends tracked</div></div>
            <div className="stat-card"><div className="stat-value stat-accent-teal">{thisYear}</div><div className="stat-label">Hangouts in {yr}</div></div>
            <div className="stat-card"><div className="stat-value stat-accent-plum">{bestStreak}</div><div className="stat-label">Best streak</div></div>
          </div>
        </>
      )}

      {/* EDIT MODE */}
      {editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group"><label className="form-label">Display name *</label><input className="input-full" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Your name" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}><label className="form-label">Location</label><input className="input-full" value={draft.location} onChange={e => setDraft(d => ({ ...d, location: e.target.value }))} placeholder="e.g. San Francisco" /></div>
            <div className="form-group" style={{ margin: 0 }}><label className="form-label">Birthday</label><input type="date" className="input-full" value={draft.birthday} onChange={e => setDraft(d => ({ ...d, birthday: e.target.value }))} /></div>
          </div>
          <div className="form-group"><label className="form-label">Bio</label><textarea className="input-full" rows={2} value={draft.bio} onChange={e => setDraft(d => ({ ...d, bio: e.target.value }))} placeholder="e.g. Outdoors lover, amateur chef…" /></div>

          {[['hobbies', 'Hobbies & interests', HOBBIES], ['times', 'Preferred hangout times', TIMES], ['hangtypes', 'Favourite hangout types', HANGTYPES]].map(([key, label, opts]) => (
            <div key={key} className="form-group">
              <label className="form-label">{label}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {opts.map(t => (
                  <div key={t} className={`filter-tag ${(draft[key] || []).includes(t) ? 'active' : ''}`}
                    onClick={() => setDraft(d => ({ ...d, [key]: toggleTag(d[key] || [], t) }))}>
                    {t}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}><label className="form-label">Social / contact</label><input className="input-full" value={draft.social} onChange={e => setDraft(d => ({ ...d, social: e.target.value }))} placeholder="@username or phone" /></div>
            <div className="form-group" style={{ margin: 0 }}><label className="form-label">Your vibe in one word</label><input className="input-full" value={draft.vibe} onChange={e => setDraft(d => ({ ...d, vibe: e.target.value }))} placeholder="e.g. Adventurous" /></div>
          </div>
          <div style={{ display: 'flex', gap: 9, paddingTop: 4 }}>
            <button className="btn btn-ghost" onClick={cancelEdit} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-primary" onClick={saveProfile} style={{ flex: 2 }}>Save profile</button>
          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {showShareModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowShareModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header" style={{ justifyContent: 'space-between' }}>
              <div className="modal-title">Share your profile</div>
              <button onClick={() => setShowShareModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--ink-muted)' }}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 16, lineHeight: 1.5 }}>Send this card to a friend so they know what you're into and when you like to hang out.</p>
              <div className="share-card">
                <div className="share-avatar-big" style={{ background: profile.color || 'var(--primary)' }}>{profile.name[0].toUpperCase()}</div>
                <div className="share-name">{profile.name}</div>
                {profile.bio && <div className="share-bio">{profile.bio}</div>}
                <div className="share-tags">
                  {[...(profile.hobbies || []).slice(0, 4), ...(profile.hangtypes || []).slice(0, 2)].map(t => <span key={t} className="share-tag">{t}</span>)}
                </div>
                {profile.location && <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>{profile.location}</div>}
                {profile.vibe && <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Vibe: {profile.vibe}</div>}
              </div>
              <div style={{ marginTop: 14 }}>
                <div className="form-label" style={{ marginBottom: 6 }}>Shareable link</div>
                <div className="share-url-box" onClick={() => { navigator.clipboard.writeText(buildShareProfileLink(profile)); showToast('Link copied.'); }}>
                  {buildShareProfileLink(profile)}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: 5 }}>Link encodes your profile — no account needed.</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowShareModal(false)}>Close</button>
              <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(buildShareProfileLink(profile)); showToast('Link copied.'); }}>Copy link</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
