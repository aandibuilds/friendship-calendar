'use client';
import { useState } from 'react';
import EventModal from './EventModal';
import ProposeModal from './ProposeModal';
import { fmtDT, fmtTime, buildProposeShareLink, categoryEmoji } from '../lib/data';
import { useToast } from '../lib/toast';

export default function Events({ friends, events, proposed, onUpdateAll }) {
  const showToast = useToast();
  const [showEventModal, setShowEventModal] = useState(false);
  const [showProposeModal, setShowProposeModal] = useState(false);

  function handleEventSave({ type, event, friendUpdates }) {
    let newEvents = events, newFriends = friends;
    if (type === 'event') newEvents = [...events, event];
    if (friendUpdates?.length) {
      newFriends = friends.map(f => {
        const upd = friendUpdates.find(u => u.id === f.id);
        return upd || f;
      });
    }
    onUpdateAll({ events: newEvents, friends: newFriends });
  }

  function handleProposeSave({ proposed: newProp, friendUpdates }) {
    const newProposed = [...proposed, newProp];
    const newFriends = friends.map(f => { const u = friendUpdates?.find(x => x.id === f.id); return u || f; });
    onUpdateAll({ proposed: newProposed, friends: newFriends });
  }

  function deleteEvent(id) {
    if (!confirm('Remove this event?')) return;
    onUpdateAll({ events: events.filter(e => e.id !== id) });
  }

  function deleteProposed(id) {
    onUpdateAll({ proposed: proposed.filter(e => e.id !== id) });
    showToast('Removed.');
  }

  function clearPastProposed() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    onUpdateAll({ proposed: proposed.filter(ev => !ev.date || new Date(ev.date + 'T12:00:00') >= today) });
    showToast('Past proposals cleared.');
  }

  function convertToEvent(id) {
    const ev = proposed.find(e => e.id === id); if (!ev) return;
    const dt = ev.date + (ev.time ? 'T' + ev.time : 'T12:00');
    const newEvent = { id: Date.now(), type: 'group', name: ev.name, desc: [ev.location, ev.desc].filter(Boolean).join(' · '), emoji: categoryEmoji(ev.category), dates: [dt], invitees: ev.proposedTo || [], rsvps: {}, votes: [[]], confirmed: null };
    const friendUpdates = (ev.proposedTo || []).map(fid => {
      const f = friends.find(x => x.id === fid); if (!f) return null;
      return { ...f, invites: [...(f.invites || []), { eventId: newEvent.id, eventName: newEvent.name, date: dt, status: 'pending' }] };
    }).filter(Boolean);
    const newFriends = friends.map(f => { const u = friendUpdates.find(x => x.id === f.id); return u || f; });
    onUpdateAll({ events: [...events, newEvent], proposed: proposed.filter(e => e.id !== id), friends: newFriends });
    showToast(`"${ev.name}" added to Events! 🎉`);
  }

  function rsvp(id, status) {
    const updated = events.map(e => e.id !== id ? e : { ...e, rsvps: { ...(e.rsvps || {}), me: status } });
    onUpdateAll({ events: updated });
    showToast({ yes: "You're in! 🎉", maybe: 'Marked maybe 🤔', no: "RSVP'd no ❌" }[status]);
  }

  function voteDate(evId, idx) {
    const updated = events.map(e => {
      if (e.id !== evId) return e;
      const votes = (e.votes || e.dates.map(() => [])).map((v, i) => i !== idx ? v : v.includes('me') ? v.filter(x => x !== 'me') : [...v, 'me']);
      return { ...e, votes };
    });
    onUpdateAll({ events: updated });
  }

  function respondInvite(friendId, eventId, status) {
    const f = friends.find(x => x.id === friendId); if (!f) return;
    const updatedF = { ...f, invites: (f.invites || []).map(i => i.eventId === eventId ? { ...i, status } : i) };
    const updatedE = events.map(e => e.id !== eventId ? e : { ...e, rsvps: { ...(e.rsvps || {}), [String(friendId)]: status === 'accepted' ? 'yes' : 'no' } });
    onUpdateAll({ friends: friends.map(f2 => f2.id === friendId ? updatedF : f2), events: updatedE });
    showToast(status === 'accepted' ? 'Accepted! 🎉' : 'Declined.');
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const activeProposed = proposed.filter(ev => !ev.date || new Date(ev.date + 'T12:00:00') >= today);
  const allPending = [];
  friends.forEach(f => (f.invites || []).filter(i => i.status === 'pending').forEach(inv => allPending.push({ ...inv, friend: f })));

  return (
    <div className="view">
      <div className="page-title">Events</div>
      <div className="page-sub">Group hangouts, 1-on-1 plans, and pending invites.</div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => setShowEventModal(true)}>＋ Create event</button>
        <button className="btn" onClick={() => setShowProposeModal(true)}
          style={{ background: 'var(--plum-pale)', color: 'var(--plum)', border: '1px solid #D8CFF0', fontWeight: 600, borderRadius: 99, fontSize: '12.5px', padding: '8px 16px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
          🔍 Propose event
        </button>
      </div>

      {/* PROPOSED EVENTS */}
      {activeProposed.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div className="section-header">
            <div className="section-title">🔍 Proposed <span style={{ fontSize: 13, color: 'var(--ink-muted)', fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}>({activeProposed.length})</span></div>
            <span className="section-link" onClick={clearPastProposed}>Clear past</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeProposed.map(ev => {
              const evDate = ev.date ? new Date(ev.date + 'T12:00:00') : null;
              const daysUntil = evDate ? Math.ceil((evDate - today) / 86400000) : null;
              const countdownClass = daysUntil === null ? '' : daysUntil <= 1 ? 'soon' : daysUntil <= 7 ? 'soon' : daysUntil <= 21 ? 'upcoming' : 'plenty';
              const countdownText = daysUntil === null ? '' : daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d away${daysUntil <= 7 ? ' ⚡' : ''}`;
              const proposedFriends = (ev.proposedTo || []).map(id => friends.find(f => f.id === id)).filter(Boolean);
              const shareLink = buildProposeShareLink(ev);
              const dateStr = ev.date ? new Date(ev.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
              return (
                <div key={ev.id} className="propose-card">
                  <div style={{ paddingLeft: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span className="propose-badge">✦ PROPOSED</span>
                          {ev.category && <span style={{ fontSize: 10, background: 'var(--parchment)', border: '1px solid var(--border)', color: 'var(--ink-muted)', padding: '2px 8px', borderRadius: 99, fontWeight: 500 }}>{ev.category}</span>}
                          {countdownText && <span className={`countdown-pill ${countdownClass}`}>{countdownText}</span>}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 2 }}>{ev.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {dateStr && <span>📅 {dateStr}{ev.time ? ' · ' + fmtTime(ev.time) : ''}</span>}
                          {ev.location && <span>📍 {ev.location}</span>}
                        </div>
                        {ev.desc && <div style={{ fontSize: '12.5px', color: 'var(--ink-soft)', marginTop: 6, lineHeight: 1.5 }}>{ev.desc}</div>}
                      </div>
                      <button onClick={() => deleteProposed(ev.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--ink-muted)', padding: 2, flexShrink: 0 }}>✕</button>
                    </div>
                    {proposedFriends.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>Proposed to:</span>
                        {proposedFriends.map(f => (
                          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500 }}>
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white', fontWeight: 700 }}>{f.name[0]}</div>
                            {f.name.split(' ')[0]}
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {ev.sourceUrl && <a href={ev.sourceUrl} target="_blank" rel="noreferrer" className="propose-source-chip">🔗 View source</a>}
                      <button className="btn-copy" onClick={() => { navigator.clipboard.writeText(shareLink); showToast('Link copied! 🔗'); }}>📋 Copy invite link</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => convertToEvent(ev.id)} style={{ fontSize: '11.5px' }}>＋ Add to events</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PENDING INVITES */}
      {allPending.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div className="section-header"><div className="section-title">📬 Pending invites ({allPending.length})</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allPending.map((inv, i) => (
              <div key={i} className="reminder-item moderate" style={{ borderLeft: '3px solid var(--sage)' }}>
                <div className="reminder-avatar" style={{ background: inv.friend.color }}>{inv.friend.name[0]}</div>
                <div className="reminder-info">
                  <div className="reminder-name">{inv.friend.name}</div>
                  <div className="reminder-msg">Invited to: <strong>{inv.eventName}</strong>{inv.date ? ' · ' + fmtDT(inv.date) : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => respondInvite(inv.friend.id, inv.eventId, 'accepted')}>✅</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => respondInvite(inv.friend.id, inv.eventId, 'declined')}>❌</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EVENTS LIST */}
      {events.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🎉</div><div className="empty-title">No events yet</div><div className="empty-sub">Hit "+ Create event" to get planning.</div></div>
      ) : (
        events.map(ev => {
          const isGroup = ev.type !== '1on1';
          const invNames = (ev.invitees || []).map(id => { const f = friends.find(x => x.id === id); return f ? f.name.split(' ')[0] : '?'; });
          const yes = Object.values(ev.rsvps || {}).filter(r => r === 'yes').length;
          const maybe = Object.values(ev.rsvps || {}).filter(r => r === 'maybe').length;
          const no = Object.values(ev.rsvps || {}).filter(r => r === 'no').length;
          const myRsvp = (ev.rsvps || {}).me || null;
          return (
            <div key={ev.id} className="event-card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--parchment)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{ev.emoji || '🎉'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <div className="event-name">{ev.name}</div>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: isGroup ? '#EFF6FF' : 'var(--sage-pale)', color: isGroup ? '#1D4ED8' : 'var(--sage)', fontWeight: 600 }}>{isGroup ? 'Group' : '1-on-1'}</span>
                  </div>
                  <div className="event-meta">{ev.desc || ''}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => deleteEvent(ev.id)} style={{ fontSize: 11, padding: '4px 9px' }}>✕</button>
              </div>

              {(ev.invitees || []).length > 0 && (
                <div style={{ display: 'flex', gap: 5, marginTop: 9, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>With:</span>
                  {(ev.invitees || []).map(id => { const f = friends.find(x => x.id === id); return f ? <div key={id} style={{ width: 24, height: 24, borderRadius: '50%', background: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces, serif', fontSize: 10, fontWeight: 600, color: 'white' }} title={f.name}>{f.name[0]}</div> : null; })}
                  <span style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>{invNames.join(', ')}</span>
                </div>
              )}

              {isGroup && (ev.dates || []).length > 1 && (
                <>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-muted)', fontWeight: 600, margin: '12px 0 8px' }}>📊 Availability poll</div>
                  {(ev.dates || []).map((d, i) => {
                    const vc = ((ev.votes && ev.votes[i]) || []).length;
                    const mx = Math.max((ev.invitees || []).length, 1);
                    const pct = Math.round(vc / mx * 100);
                    const voted = ((ev.votes && ev.votes[i]) || []).includes('me');
                    return (
                      <div key={i} className={`avail-option ${voted ? 'voted' : ''}`} onClick={() => voteDate(ev.id, i)}>
                        <span style={{ fontSize: '12.5px' }}>{fmtDT(d)}</span>
                        <span className="avail-votes">{vc} vote{vc !== 1 ? 's' : ''}</span>
                        <div style={{ width: '100%' }}><div className="avail-bar-wrap"><div className="avail-bar" style={{ width: `${pct}%` }} /></div></div>
                      </div>
                    );
                  })}
                </>
              )}
              {isGroup && (ev.dates || []).length === 1 && ev.dates[0] && (
                <div style={{ fontSize: '12.5px', color: 'var(--ink-muted)', margin: '8px 0' }}>📅 {fmtDT(ev.dates[0])}</div>
              )}

              {isGroup && (
                <>
                  <div className="rsvp-row">
                    <div className="rsvp-chip">✅ {yes}</div>
                    <div className="rsvp-chip">🤔 {maybe}</div>
                    <div className="rsvp-chip">❌ {no}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
                    {[['yes', "✅ I'm in"], ['maybe', '🤔 Maybe'], ['no', "❌ Can't"]].map(([s, label]) => (
                      <button key={s} className={`btn btn-sm ${myRsvp === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => rsvp(ev.id, s)}>{label}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })
      )}

      {showEventModal && <EventModal friends={friends} onClose={() => setShowEventModal(false)} onSave={handleEventSave} />}
      {showProposeModal && <ProposeModal friends={friends} onClose={() => setShowProposeModal(false)} onSave={handleProposeSave} />}
    </div>
  );
}
