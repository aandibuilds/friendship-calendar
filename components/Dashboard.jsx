'use client';
import { useState, useMemo } from 'react';
import FriendCard from './FriendCard';
import BarChart from './BarChart';
import { getHealthScore, getDaysSince, getStreak, fmtDate } from '../lib/data';

export default function Dashboard({ friends, onOpenFriend, onShowView }) {
  const [range, setRange] = useState(6);
  const hr = new Date().getHours();
  const greeting = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';

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
      <div className="page-sub">
        The state of your{' '}
        <span className="text-gradient" style={{ fontWeight: 700 }}>
          friendships
        </span>
        {' '}
        — clear, current, and kind.
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-emoji" style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
            People
          </div>
          <div className="stat-value stat-accent-primary">{friends.length}</div>
          <div className="stat-label">Friends tracked</div>
        </div>
        <div className="stat-card">
          <div className="stat-emoji" style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
            Hangouts
          </div>
          <div className="stat-value stat-accent-teal">{stats.mH}</div>
          <div className="stat-label">This month</div>
        </div>
        <div className="stat-card">
          <div className="stat-emoji" style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
            Overdue
          </div>
          <div className="stat-value stat-accent-violet">{stats.ov}</div>
          <div className="stat-label">Check-ins</div>
        </div>
        <div className="stat-card">
          <div className="stat-emoji" style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
            Streaks
          </div>
          <div className="stat-value stat-accent-plum">{stats.st}</div>
          <div className="stat-label">Active</div>
        </div>
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
          <BarChart labels={trendData.labels} data={trendData.data} color="#5B4FFF" />
        </div>
      </div>

      <div className="section-header">
        <div className="section-title">Needs your attention</div>
        <span className="section-link" onClick={() => onShowView('reminders')}>See all →</span>
      </div>
      <div className="friends-grid">
        {overdueList.length
          ? overdueList.map(f => <FriendCard key={f.id} friend={f} onClick={onOpenFriend} />)
          : (
            <div className="empty-state">
              <div className="empty-icon" style={{ fontSize: 24 }}>∙</div>
              <div className="empty-title">All caught up</div>
              <div className="empty-sub">You&apos;re in a great place with your people.</div>
            </div>
          )
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
