'use client';
import { getHealthScore, getHealthColor, getHealthLabel, getHealthChipClass, getDaysSince, getStreak } from '../lib/data';

export default function FriendCard({ friend: f, onClick }) {
  const sc = getHealthScore(f);
  const col = getHealthColor(sc);
  const lbl = getHealthLabel(sc);
  const days = getDaysSince(f);
  const ls = days === null ? 'Never hung out' : days === 0 ? 'Today' : `${days}d ago`;
  const isUrgent = days !== null && days > (f.cadence || 30) * 2;
  const isOv = days === null || days > (f.cadence || 30);
  const tag = (f.tags || [])[0] || '';
  const streak = getStreak(f);
  return (
    <div className="friend-card" onClick={() => onClick(f.id)} style={{ '--card-color': f.color }}>
      {isUrgent ? <div className="overdue-badge urgent">OVERDUE</div> : isOv ? <div className="overdue-badge warn">DUE</div> : null}
      <div className="friend-avatar" style={{ background: f.color }}>{f.name[0]}</div>
      <div className="friend-name">{f.name}</div>
      <div className="friend-last-seen">
        {tag && <><span style={{ color: f.color, fontWeight: 600 }}>●</span> {tag} · </>}{ls}
      </div>
      <div className="health-bar-wrap"><div className="health-bar-fill" style={{ width: `${sc}%`, background: col }} /></div>
      <div className="health-label">
        <span className={`health-chip ${getHealthChipClass(sc)}`}>{lbl}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: col }}>{sc}</span>
      </div>
      {streak >= 2 && <div className="streak-pill">{streak}-month streak</div>}
    </div>
  );
}
