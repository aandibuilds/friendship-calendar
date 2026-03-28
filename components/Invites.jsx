'use client';
import { fmtDT } from '../lib/data';
import { useToast } from '../lib/toast';

export default function Invites({ friends, events, onUpdateAll }) {
  const showToast = useToast();

  // Only show events where the current user hasn't responded yet
  // (excludes events you created, which auto-set rsvps.me = 'yes')
  const pendingForMe = events.filter(ev => !ev.rsvps?.me);

  function respond(eventId, status) {
    const updated = events.map(e =>
      e.id !== eventId ? e : { ...e, rsvps: { ...(e.rsvps || {}), me: status } }
    );
    onUpdateAll({ events: updated });
    showToast(status === 'yes' ? "You're in." : status === 'maybe' ? 'Marked maybe.' : "RSVP'd no.");
  }

  return (
    <div className="view">
      <div className="page-title">Invites</div>
      <div className="page-sub">Events waiting on your response.</div>

      {pendingForMe.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">No pending invites</div>
          <div className="empty-sub">You&apos;re all caught up — nothing waiting on you.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pendingForMe.map(ev => {
            const inviterFriends = (ev.invitees || [])
              .map(id => friends.find(f => f.id === id))
              .filter(Boolean);
            return (
              <div
                key={ev.id}
                className="reminder-item moderate"
                style={{ borderLeft: '3px solid var(--primary)', flexDirection: 'column', alignItems: 'stretch', gap: 10 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--plum-pale)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {ev.emoji || '•'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="reminder-name">{ev.name}</div>
                    <div className="reminder-msg">
                      {ev.dates?.[0] ? fmtDT(ev.dates[0]) : 'Date TBD'}
                      {inviterFriends.length > 0 && (
                        <> · with {inviterFriends.map(f => f.name.split(' ')[0]).join(', ')}</>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => respond(ev.id, 'yes')}>I&apos;m in</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => respond(ev.id, 'maybe')}>Maybe</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => respond(ev.id, 'no')}>Can&apos;t</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
