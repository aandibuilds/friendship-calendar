'use client';
import { useState, useEffect } from 'react';
import { ToastProvider, useToast } from '../lib/toast';
import { loadData, saveData, initSample, getDaysSince, parseSharedProfile, parseSharedEvent } from '../lib/data';
import Dashboard from '../components/Dashboard';
import Friends from '../components/Friends';
import Calendar from '../components/Calendar';
import Invites from '../components/Invites';
import Events from '../components/Events';
import Review from '../components/Review';
import Profile from '../components/Profile';
import FriendDetailModal from '../components/FriendDetailModal';
import AddFriendModal from '../components/AddFriendModal';
import QuietHoursModal from '../components/QuietHoursModal';
import { NavIcon } from '../components/NavIcons';

const VIEWS = ['dashboard','friends','calendar','invites','events','review','profile'];
const NAV = [
  { id: 'dashboard', label: 'Home' },
  { id: 'friends', label: 'Friends' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'invites', label: 'Invites' },
  { id: 'events', label: 'Events' },
  { id: 'review', label: 'Review' },
  { id: 'profile', label: 'Profile' },
];

function AppInner() {
  const showToast = useToast();
  const [view, setView] = useState('dashboard');
  const [friends, setFriends] = useState([]);
  const [events, setEvents] = useState([]);
  const [proposed, setProposed] = useState([]);
  const [quiet, setQuiet] = useState({ enabled: false, start: '22:00', end: '08:00' });
  const [profile, setProfile] = useState({ name: '', color: '#5B4FFF', location: '', birthday: '', bio: '', hobbies: [], times: [], hangtypes: [], social: '', vibe: '' });
  const [loaded, setLoaded] = useState(false);
  const [openFriendId, setOpenFriendId] = useState(null);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addFriendPrefill, setAddFriendPrefill] = useState(null);
  const [showQuiet, setShowQuiet] = useState(false);
  const [sharedProfile, setSharedProfile] = useState(null);
  const [sharedEvent, setSharedEvent] = useState(null);

  // Load from localStorage on mount (always leave loading state — corrupted storage / blocked localStorage must not strand the UI)
  useEffect(() => {
    try {
      const data = loadData();
      const sample = initSample(data.friends, data.events);
      if (sample) {
        data.friends = sample.friends;
        data.events = sample.events;
        saveData({ friends: sample.friends, events: sample.events });
      }
      // Migrate old earthy-tone colors from v2 to the current purple scheme
      const COLOR_MIGRATION = {
        '#C05A3A': '#5B4FFF',
        '#5A8C6A': '#14B8A6',
        '#7A5A8C': '#D946EF',
        '#7B8FA1': '#7C3AED',
        '#B85C6E': '#FB7185',
      };
      const migratedFriends = (Array.isArray(data.friends) ? data.friends : []).map(f => ({
        ...f,
        color: COLOR_MIGRATION[f.color] || f.color,
      }));
      setFriends(migratedFriends);
      setEvents(Array.isArray(data.events) ? data.events : []);
      setProposed(Array.isArray(data.proposed) ? data.proposed : []);
      setQuiet(data.quiet && typeof data.quiet === 'object' ? data.quiet : { enabled: false, start: '22:00', end: '08:00' });
      setProfile(data.profile && typeof data.profile === 'object' ? data.profile : { name: '', color: '#5B4FFF', location: '', birthday: '', bio: '', hobbies: [], times: [], hangtypes: [], social: '', vibe: '' });

      const sp = parseSharedProfile();
      if (sp?.name) {
        setSharedProfile(sp);
        history.replaceState({}, '', location.pathname);
      }
      const se = parseSharedEvent();
      if (se?.name) {
        setSharedEvent(se);
        history.replaceState({}, '', location.pathname);
      }
    } catch (e) {
      console.error('Friendship Calendar: failed to load saved data', e);
    } finally {
      setLoaded(true);
    }
  }, []);

  // Persist whenever state changes
  useEffect(() => {
    if (!loaded) return;
    saveData({ friends, events, proposed, quiet, profile });
  }, [friends, events, proposed, quiet, profile, loaded]);

  const overdueCount = friends.filter(f => { const d = getDaysSince(f); return d === null || d > (f.cadence || 30); }).length;
  const pendingCount = events.filter(ev => !ev.rsvps?.me).length;
  const openFriend = friends.find(f => f.id === openFriendId) || null;

  function updateFriends(newFriends) { setFriends(newFriends); }
  function updateProfile(p) { setProfile(p); }

  function handleEventsUpdate({ events: ne, friends: nf, proposed: np }) {
    if (ne !== undefined) setEvents(ne);
    if (nf !== undefined) setFriends(nf);
    if (np !== undefined) setProposed(np);
  }

  function addFriend(f) { setFriends(prev => [...prev, f]); }
  function deleteFriend(id) { setFriends(prev => prev.filter(f => f.id !== id)); }
  function updateFriend(updated) { setFriends(prev => prev.map(f => f.id === updated.id ? updated : f)); }

  function acceptSharedProfile() {
    setAddFriendPrefill(sharedProfile);
    setShowAddFriend(true);
    setSharedProfile(null);
  }
  function acceptSharedEvent() {
    const ev = sharedEvent;
    setProposed(prev => [...prev, { id: Date.now(), type: 'proposed', name: ev.name, date: ev.date, time: ev.time, location: ev.location, desc: ev.desc, sourceUrl: ev.sourceUrl, category: ev.category, proposedTo: [], proposedAt: new Date().toISOString() }]);
    setSharedEvent(null);
    setView('events');
    showToast(`"${ev.name}" saved to your Events!`);
  }

  if (!loaded) {
    return (
      <div
        className="app-loading"
        style={{
          height: '100dvh',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 24,
          boxSizing: 'border-box',
          background: 'var(--cream, #F4F4F8)',
          fontFamily: 'var(--font-display), Georgia, "Times New Roman", serif',
          color: 'var(--ink-muted, #767686)',
          fontSize: 20,
          letterSpacing: '-0.03em',
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--ink, #0C0C0F)' }}>Friendship Calendar</span>
        <span style={{ fontSize: 13, fontFamily: 'var(--font-sans), system-ui, sans-serif', fontWeight: 500, opacity: 0.85 }}>
          Loading…
        </span>
      </div>
    );
  }

  return (
    <div className="app">
      {/* INCOMING SHARED PROFILE BANNER */}
      {sharedProfile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'var(--warm-white)', borderBottom: '1px solid var(--border)', padding: '14px 20px', zIndex: 500, display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-md)', animation: 'slideUp 0.25s ease' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: sharedProfile.color || 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display), Georgia, serif', fontSize: 16, fontWeight: 600, color: 'white', flexShrink: 0 }}>{sharedProfile.name[0]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{sharedProfile.name} shared their profile with you</div>
            <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
              {sharedProfile.bio || ''}
              {sharedProfile.location ? ' · ' + sharedProfile.location : ''}
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={acceptSharedProfile}>Add as friend</button>
          <button onClick={() => setSharedProfile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--ink-muted)' }}>✕</button>
        </div>
      )}

      {/* INCOMING SHARED EVENT BANNER */}
      {sharedEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'var(--warm-white)', borderBottom: '1px solid var(--border)', padding: '14px 20px', zIndex: 500, display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-md)', animation: 'slideUp 0.25s ease' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'var(--plum-pale)',
              border: '1px solid #D8CFF0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              flexShrink: 0,
              color: 'var(--plum)',
            }}
          >
            {(sharedEvent.category || '?').slice(0, 3)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{sharedEvent.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
              {sharedEvent.date
                ? new Date(sharedEvent.date + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })
                : ''}
              {sharedEvent.location ? ' · ' + sharedEvent.location : ''}
            </div>
          </div>
          <button className="btn btn-sm btn-primary" onClick={acceptSharedEvent} style={{ flexShrink: 0 }}>Save event</button>
          <button onClick={() => setSharedEvent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--ink-muted)', flexShrink: 0 }}>✕</button>
        </div>
      )}

      {/* TOP BAR */}
      <header className="topbar">
        <div className="logo">
          <div className="logo-icon">FC</div>
          <span>Friendship</span>
        </div>
        <div className="topbar-right">
          <div className={`topbar-pill ${quiet.enabled ? 'active' : ''}`} onClick={() => setShowQuiet(true)}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '999px',
                background: quiet.enabled ? 'var(--primary)' : 'var(--border-strong)',
                display: 'inline-block',
                marginRight: 6,
              }}
            />
            <span>{quiet.enabled ? `${quiet.start}–${quiet.end}` : 'Quiet hours'}</span>
          </div>
          <button className="add-btn" onClick={() => { setAddFriendPrefill(null); setShowAddFriend(true); }}>＋ Add friend</button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="main" style={{ paddingTop: (sharedProfile || sharedEvent) ? 'calc(72px + 22px)' : undefined }}>
        {view === 'dashboard'  && <Dashboard friends={friends} onOpenFriend={setOpenFriendId} onShowView={setView} />}
        {view === 'friends'    && <Friends friends={friends} onOpenFriend={setOpenFriendId} />}
        {view === 'calendar'   && <Calendar friends={friends} events={events} />}
        {view === 'invites'    && <Invites friends={friends} events={events} onUpdateAll={handleEventsUpdate} />}
        {view === 'events'     && <Events friends={friends} events={events} proposed={proposed} onUpdateAll={handleEventsUpdate} />}
        {view === 'review'     && <Review friends={friends} />}
        {view === 'profile'    && <Profile profile={profile} onUpdateProfile={updateProfile} friends={friends} />}
      </main>

      {/* BOTTOM NAV */}
      <nav className="bottom-nav" aria-label="Main">
        {NAV.map(n => (
          <button
            key={n.id}
            type="button"
            className={`nav-item ${view === n.id ? 'active' : ''}`}
            onClick={() => setView(n.id)}
            aria-label={n.label}
            aria-current={view === n.id ? 'page' : undefined}
          >
            <span
              className="nav-icon"
              data-badge={n.id === 'invites' && pendingCount > 0 ? String(pendingCount > 9 ? '9+' : pendingCount) : undefined}
            >
              {n.id === 'profile' && profile.name ? (
                <span className="nav-icon-initial">{profile.name[0].toUpperCase()}</span>
              ) : (
                <NavIcon id={n.id} />
              )}
            </span>
            <span className="nav-label">{n.label}</span>
          </button>
        ))}
      </nav>

      {/* MODALS */}
      {openFriend && (
        <FriendDetailModal
          friend={openFriend}
          profile={profile}
          onClose={() => setOpenFriendId(null)}
          onUpdate={updateFriend}
          onDelete={(id) => { deleteFriend(id); setOpenFriendId(null); showToast('Friend removed.'); }}
        />
      )}
      {showAddFriend && (
        <AddFriendModal
          prefill={addFriendPrefill}
          onClose={() => { setShowAddFriend(false); setAddFriendPrefill(null); }}
          onSave={addFriend}
        />
      )}
      {showQuiet && (
        <QuietHoursModal
          quiet={quiet}
          onClose={() => setShowQuiet(false)}
          onSave={q => { setQuiet(q); }}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
