'use client';
import { useState, useMemo } from 'react';
import { getStreak } from '../lib/data';
import ActivityChart from './ActivityChart';

export default function Review({ friends }) {
  const [range, setRange] = useState(6);
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

  const trendData = useMemo(() => {
    const labels = [], data = [];
    const now = new Date();
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      labels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
      let c = 0;
      friends.forEach(f => (f.hangouts || []).forEach(h => { if (h.date.startsWith(key)) c++; }));
      data.push(c);
    }
    return { labels, data };
  }, [friends, range]);

  return (
    <div className="view">
      <div className="page-title">Year in review</div>
      <div className="page-sub">A look back at your social year.</div>

      <div className="review-grid">
        <div className="review-card"><div className="review-val">{total}</div><div className="review-lbl">Total hangouts in {yr}</div></div>
        <div className="review-card"><div className="review-val">{months.size}</div><div className="review-lbl">Active months</div></div>
        <div className="review-card"><div className="review-val">{bestStreak}</div><div className="review-lbl">Longest streak</div></div>
      </div>

      {/* HANGOUTS OVER TIME */}
      <div className="trend-wrap">
        <div className="section-header" style={{ marginBottom: 8 }}>
          <div className="section-title">Hangouts over time</div>
          <select
            className="input"
            value={range}
            onChange={e => setRange(+e.target.value)}
            style={{ width: 'auto', padding: '4px 10px', fontSize: 12, borderRadius: 99 }}
          >
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
          </select>
        </div>
        <ActivityChart labels={trendData.labels} data={trendData.data} />
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
