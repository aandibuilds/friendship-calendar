'use client';
import { useState, useMemo } from 'react';
import FriendCard from './FriendCard';
import BarChart from './BarChart';
import { getHealthScore, getDaysSince, getStreak, fmtDate } from '../lib/data';

export default function Dashboard({ friends, onOpenFriend, onShowView }) {
  const [range, setRange] = useState(6);
  const hr = new Date().getHours();
  const greeting = hr < 12 ? 'Good morning ☀️' : hr < 17 ? 'Good afternoon ⛅' : 'Good evening 🌙';

  const mStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const stats = useMemo(() => {
    let mH = 0, ov = 0, st = 0;
    friends.forEach(f => {
      (f.hangouts || []).forEach(h => { if (new Date(h.date) >= mStart) mH++; });
      const d = getDaysSince(f); if (d === null || d > (f.cadence || 30)) ov++;
      if (getStreak(f) >= 2) st++;
    });
    return { mH, ov, st };
  }, [friends]);

  const overdueList = useMemo(() =>
    [...friends].filter(f => { const d = getDaysSince(f); return d === null || d > (f.cadence || 30); })
      .sort((a, b) => getHealthScore(a) - getHealthScore(b)).slice(0, 4),
    [friends]);

  const recentActivity = useMemo(() => {
    const all = [];
    friends.forEach(f => (f.hangouts || []).forEach(h => all.push({ ...h, friend: f })));
    return all.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  }, [friends]);

  const trendData = useMemo(() => {
    const labels = [], data = [];
    const now = new Date();
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      labels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
      let c = 0; friends.forEach(f => (f.hangouts || []).forEach(h => { if (h.date.startsWith(key)) c++; }));
      data.push(c);
    }
    return { labels, data };
  }, [friends, range]);

  return (
    <div className="view">
      <div className="page-title">{greeting}</div>
      <div className="page-sub">Here's the state of your friendships.</div>

      <div className="stats-row">
        <div className="stat-card"><div className="stat-emoji">👥</div><div className="stat-value" style={{ color: 'var(--terra)' }}>{friends.length}</div><div className="stat-label">Friends tracked</div></div>
        <div className="stat-card"><div className="stat-emoji">🎉</div><div className="stat-value" style={{ color: 'var(--sage)' }}>{stats.mH}</div><div className="stat-label">Hangouts this month</div></div>
        <div className="stat-card"><div className="stat-emoji">⏰</div><div className="stat-value" style={{ color: 'var(--amber)' }}>{stats.ov}</div><div className="stat-label">Overdue check-ins</div></div>
        <div className="stat-card"><div className="stat-emoji">🔥</div><div className="stat-value" style={{ color: 'var(--plum)' }}>{stats.st}</div><div className="stat-label">Active streaks</div></div>
      </div>

      <div className="trend-wrap">
        <div className="section-header" style={{ marginBottom: 0 }}>
          <div className="section-title">Hangouts over time</div>
          <select className="input" value={range} onChange={e => setRange(+e.target.value)}
            style={{ width: 'auto', padding: '4px 10px', fontSize: 12, borderRadius: 99 }}>
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
          </select>
        </div>
        <div className="trend-canvas-wrap">
          <BarChart labels={trendData.labels} data={trendData.data} color="#C05A3A" />
        </div>
      </div>

      <div className="section-header">
        <div className="section-title">Needs your attention</div>
        <span className="section-link" onClick={() => onShowView('reminders')}>See all →</span>
      </div>
      <div className="friends-grid">
        {overdueList.length
          ? overdueList.map(f => <FriendCard key={f.id} friend={f} onClick={onOpenFriend} />)
          : <div className="empty-state"><div className="empty-icon">✨</div><div className="empty-title">All caught up!</div><div className="empty-sub">You're doing great.</div></div>
        }
      </div>

      <div className="section-header"><div className="section-title">Recent hangouts</div></div>
      <div className="reminders-list">
        {recentActivity.length
          ? recentActivity.map((h, i) => (
              <div key={i} className="reminder-item" style={{ borderLeft: `3px solid ${h.friend.color}` }}>
                <div className="reminder-avatar" style={{ background: h.friend.color }}>{h.friend.name[0]}</div>
                <div className="reminder-info">
                  <div className="reminder-name">{h.friend.name}</div>
                  <div className="reminder-msg">{h.activity} · {fmtDate(h.date)}</div>
                </div>
              </div>
            ))
          : <div style={{ color: 'var(--ink-muted)', fontSize: 13, padding: '8px 0' }}>No hangouts logged yet.</div>
        }
      </div>
    </div>
  );
}
