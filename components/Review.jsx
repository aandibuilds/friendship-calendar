'use client';
import { useMemo } from 'react';
import { getStreak } from '../lib/data';

export default function Review({ friends }) {
  const yr = new Date().getFullYear();
  const { total, months, bestStreak, topFriends } = useMemo(() => {
    let total = 0; const months = new Set();
    friends.forEach(f => {
      const yh = (f.hangouts || []).filter(h => h.date.startsWith(yr));
      total += yh.length;
      yh.forEach(h => months.add(h.date.slice(0, 7)));
    });
    const bestStreak = Math.max(0, ...friends.map(getStreak));
    const topFriends = [...friends]
      .map(f => ({ f, cnt: (f.hangouts || []).filter(h => h.date.startsWith(yr)).length }))
      .filter(x => x.cnt > 0).sort((a, b) => b.cnt - a.cnt).slice(0, 5);
    return { total, months, bestStreak, topFriends };
  }, [friends]);

  return (
    <div className="view">
      <div className="page-title">Year in review</div>
      <div className="page-sub">A look back at your social year.</div>
      <div className="review-grid">
        <div className="review-card"><div className="review-val">{total}</div><div className="review-lbl">Total hangouts in {yr}</div></div>
        <div className="review-card"><div className="review-val">{months.size}</div><div className="review-lbl">Active months</div></div>
        <div className="review-card"><div className="review-val">{bestStreak}</div><div className="review-lbl">Longest streak</div></div>
      </div>
      <div className="section-header"><div className="section-title">Top friends this year</div></div>
      <div className="reminders-list">
        {topFriends.length
          ? topFriends.map(({ f, cnt }) => (
              <div key={f.id} className="reminder-item" style={{ borderLeft: `3px solid ${f.color}` }}>
                <div className="reminder-avatar" style={{ background: f.color }}>{f.name[0]}</div>
                <div className="reminder-info">
                  <div className="reminder-name">{f.name}</div>
                  <div className="reminder-msg">{cnt} hangout{cnt !== 1 ? 's' : ''} in {yr}</div>
                </div>
                {getStreak(f) >= 2 && <div className="streak-pill">{getStreak(f)} mo streak</div>}
              </div>
            ))
          : <div style={{ color: 'var(--ink-muted)', fontSize: 13, padding: '8px 0' }}>No hangouts this year yet.</div>
        }
      </div>
    </div>
  );
}
