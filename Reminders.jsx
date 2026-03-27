'use client';
import { useState } from 'react';
import { getDaysSince, isQuietNow } from '../lib/data';
import { useToast } from '../lib/toast';

export default function Reminders({ friends, quiet, onOpenFriend, onUpdateFriends }) {
  const showToast = useToast();
  const [snoozeMenu, setSnoozeMenu] = useState(null);

  if (isQuietNow(quiet)) {
    return (
      <div className="view">
        <div className="page-title">Reminders</div>
        <div className="page-sub">Friends you haven't caught up with lately.</div>
        <div className="reminders-list">
          <div className="reminder-item moderate">
            <div className="reminder-avatar" style={{ background: 'var(--ink-muted)' }}>🌙</div>
            <div className="reminder-info">
              <div className="reminder-name">Quiet hours active</div>
              <div className="reminder-msg">Reminders suppressed until {quiet.end}.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const list = friends.map(f => {
    const d = getDaysSince(f);
    return { ...f, d, ov: d === null ? 999 : d - (f.cadence || 30) };
  }).filter(f => f.ov > -7).sort((a, b) => b.ov - a.ov);

  function snooze(id, days) {
    setSnoozeMenu(null);
    const updated = friends.map(f => {
      if (f.id !== id) return f;
      const d = new Date();
      d.setDate(d.getDate() - (days === 999 ? (f.cadence || 30) - 1 : (f.cadence - (days + 1))));
      return { ...f, hangouts: [...(f.hangouts || []), { date: d.toISOString().split('T')[0], activity: `Snoozed (${days === 999 ? 'not needed' : days + 'd'})` }] };
    });
    onUpdateFriends(updated);
    showToast(days === 999 ? 'Marked as not needed 👍' : `Snoozed for ${days} day${days !== 1 ? 's' : ''} 😴`);
  }

  return (
    <div className="view">
      <div className="page-title">Reminders</div>
      <div className="page-sub">Friends you haven't caught up with lately.</div>
      <div className="reminders-list">
        {list.length ? list.map(f => {
          const urgent = f.ov > (f.cadence || 30);
          const msg = f.d === null ? "You've never logged a hangout"
            : f.ov > 0 ? `${f.ov} days overdue — goal: every ${f.cadence} days`
            : `Due soon — last seen ${f.d} days ago`;
          return (
            <div key={f.id} className={`reminder-item ${urgent ? 'urgent' : 'moderate'}`} style={{ position: 'relative' }}>
              <div className="reminder-avatar" style={{ background: f.color }}>{f.name[0]}</div>
              <div className="reminder-info">
                <div className="reminder-name">{f.name}</div>
                <div className="reminder-msg">{msg}</div>
              </div>
              <div className="reminder-actions">
                <button className="btn btn-primary btn-sm" onClick={() => onOpenFriend(f.id)}>Log</button>
                <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setSnoozeMenu(snoozeMenu === f.id ? null : f.id); }}>Snooze ▾</button>
              </div>
              {snoozeMenu === f.id && (
                <div className="snooze-menu" style={{ position: 'absolute', right: 14, top: '100%', zIndex: 50 }}>
                  {[['1 day', 1], ['1 week', 7], ['Not needed now', 999]].map(([l, d]) => (
                    <div key={l} className="snooze-opt" onClick={() => snooze(f.id, d)}>{l}</div>
                  ))}
                </div>
              )}
            </div>
          );
        }) : (
          <div className="empty-state">
            <div className="empty-icon">🎉</div>
            <div className="empty-title">All caught up!</div>
            <div className="empty-sub">You're keeping up with everyone.</div>
          </div>
        )}
      </div>
    </div>
  );
}
