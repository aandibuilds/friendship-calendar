'use client';
import { useState, useEffect, useCallback } from 'react';
import { ToastProvider, useToast } from '../lib/toast';
import { loadData, saveData, initSample, getDaysSince, parseSharedProfile, parseSharedEvent, categoryEmoji } from '../lib/data';
import Dashboard from '../components/Dashboard';
import Friends from '../components/Friends';
import Calendar from '../components/Calendar';
import Reminders from '../components/Reminders';
import Events from '../components/Events';
import Review from '../components/Review';
import Profile from '../components/Profile';
import FriendDetailModal from '../components/FriendDetailModal';
import AddFriendModal from '../components/AddFriendModal';
import QuietHoursModal from '../components/QuietHoursModal';

const VIEWS = ['dashboard','friends','calendar','reminders','events','review','profile'];
const NAV = [
  { id: 'dashboard', icon: '🏠', label: 'Home' },
  { id: 'friends',   icon: '👥', label: 'Friends' },
  { id: 'calendar',  icon: '📅', label: 'Calendar' },
  { id: 'reminders', icon: '🔔', label: 'Reminders' },
  { id: 'events',    icon: '🎉', label: 'Events' },
  { id: 'review',    icon: '⭐', label: 'Review' },
  { id: 'profile',   icon: '👤', label: 'Profile' },
];

function AppInner() {
  const showToast = useToast();
  const [view, setView] = useState('dashboard');
  const [friends, setFriends] = useState([]);
  const [events, setEvents] = useState([]);
  const [proposed, setProposed] = useState([]);
  const [quiet, setQuiet] = useState({ enabled: false, start: '22:00', end: '08:00' });
  const [profile, setProfile] = useState({ name: '', color: '#C05A3A', location: '', birthday: '', bio: '', hobbies: [], times: [], hangtypes: [], social: '', vibe: '' });
  const [loaded, setLoaded] = useState(false);
  const [openFriendId, setOpenFriendId] = useState(null);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addFriendPrefill, setAddFriendPrefill] = useState(null);
  const [showQuiet, setShowQuiet] = useState(false);
  const [sharedProfile, setSharedProfile] = useState(null);
  const [sharedEvent, setSharedEvent] = useState(null);

  // Load from localStorage on mount
  useEffect(() => {
    const data = loadData();
    const sample = initSample(data.friends, data.events);
    if (sample) {
      data.friends = sample.friends;
      data.events = sample.events;
      saveData({ friends: sample.friends, events: sample.events });
    }
    setFriends(data.friends);
    setEvents(data.events);
    setProposed(data.proposed);
    setQuiet(data.quiet);
    setProfile(data.profile);
    setLoaded(true);

    // Check for incoming shared links
    const sp = parseSharedProfile();
    if (sp?.name) { setSharedProfile(sp); history.replaceState({}, '', location.pathname); }
    const se = parseSharedEvent();
    if (se?.name) { setSharedEvent(se); history.replaceState({}, '', location.pathname); }
  }, []);

  // Persist whenever state changes
  useEffect(() => {
    if (!loaded) return;
    saveData({ friends, events, proposed, quiet, profile });
  }, [friends, events, proposed, quiet, profile, loaded]);

  const overdueCount = friends.filter(f => { const d = getDaysSince(f); return d === null || d > (f.cadence || 30); }).length;
  const pendingCount = friends.reduce((s, f) => s + (f.invites || []).filter(i => i.status === 'pending').length, 0);
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
    showToast(`"${ev.name}" saved to your Events! ✦`);
  }

  if (!loaded) return <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', fontFamily: 'Fraunces, serif', color: 'var(--ink-muted)', fontSize: 18 }}>✦</div>;

  return (
    <div className="app">
      {/* INCOMING SHARED PROFILE BANNER */}
      {sharedProfile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'var(--warm-white)', borderBottom: '1px solid var(--border)', padding: '14px 20px', zIndex: 500, display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-md)', animation: 'slideUp 0.25s ease' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: sharedProfile.color || '#C05A3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 600, color: 'white', flexShrink: 0 }}>{sharedProfile.name[0]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{sharedProfile.name} shared their profile with you</div>
            <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{sharedProfile.bio || ''}{sharedProfile.location ? ' · 📍 ' + sharedProfile.location : ''}</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={acceptSharedProfile}>Add as friend</button>
          <button onClick={() => setSharedProfile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--ink-muted)' }}>✕</button>
        </div>
      )}

      {/* INCOMING SHARED EVENT BANNER */}
      {sharedEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'var(--warm-white)', borderBottom: '1px solid var(--border)', padding: '14px 20px', zIndex: 500, display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-md)', animation: 'slideUp 0.25s ease' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--plum-pale)', border: '1px solid #D8CFF0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{categoryEmoji(sharedEvent.category)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{sharedEvent.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{sharedEvent.date ? new Date(sharedEvent.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''}{sharedEvent.location ? ' · 📍 ' + sharedEvent.location : ''}</div>
          </div>
          <button className="btn btn-sm" onClick={acceptSharedEvent} style={{ background: 'var(--plum)', color: 'white', border: 'none', borderRadius: 99, padding: '6px 14px', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Save event</button>
          <button onClick={() => setSharedEvent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--ink-muted)', flexShrink: 0 }}>✕</button>
        </div>
      )}

      {/* TOP BAR */}
      <header className="topbar">
        <div className="logo">
          <div className="logo-icon">🗓</div>
          <span>Friendship</span>
        </div>
        <div className="topbar-right">
          <div className={`topbar-pill ${quiet.enabled ? 'active' : ''}`} onClick={() => setShowQuiet(true)}>
            🌙 <span>{quiet.enabled ? `${quiet.start}–${quiet.end}` : 'Quiet hours'}</span>
          </div>
          <div className="inbox-btn" onClick={() => setView('events')} title="Pending invites">
            📬
            <div className="inbox-dot" style={{ display: pendingCount > 0 ? 'block' : 'none' }} />
          </div>
          <button className="add-btn" onClick={() => { setAddFriendPrefill(null); setShowAddFriend(true); }}>＋ Add friend</button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="main" style={{ paddingTop: (sharedProfile || sharedEvent) ? 'calc(72px + 22px)' : undefined }}>
        {view === 'dashboard'  && <Dashboard friends={friends} onOpenFriend={setOpenFriendId} onShowView={setView} />}
        {view === 'friends'    && <Friends friends={friends} onOpenFriend={setOpenFriendId} />}
        {view === 'calendar'   && <Calendar friends={friends} events={events} />}
        {view === 'reminders'  && <Reminders friends={friends} quiet={quiet} onOpenFriend={setOpenFriendId} onUpdateFriends={updateFriends} />}
        {view === 'events'     && <Events friends={friends} events={events} proposed={proposed} onUpdateAll={handleEventsUpdate} />}
        {view === 'review'     && <Review friends={friends} />}
        {view === 'profile'    && <Profile profile={profile} onUpdateProfile={updateProfile} friends={friends} />}
      </main>

      {/* BOTTOM NAV */}
      <nav className="bottom-nav">
        {NAV.map(n => (
          <div key={n.id} className={`nav-item ${view === n.id ? 'active' : ''}`} onClick={() => setView(n.id)}>
            <span className="nav-icon" data-badge={n.id === 'reminders' ? overdueCount : undefined}>
              {n.id === 'profile' && profile.name ? profile.name[0].toUpperCase() : n.icon}
            </span>
            <span>{n.label}</span>
          </div>
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
