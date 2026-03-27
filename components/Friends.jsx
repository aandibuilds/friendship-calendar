'use client';
import { useState } from 'react';
import FriendCard from './FriendCard';
import { getHealthScore } from '../lib/data';

const ALL_TAGS = ['College', 'Work', 'Family', 'Neighbors', 'Travel', 'Childhood'];

export default function Friends({ friends, onOpenFriend }) {
  const [filter, setFilter] = useState('all');
  const list = filter === 'all' ? friends : friends.filter(f => (f.tags || []).includes(filter));
  const sorted = [...list].sort((a, b) => getHealthScore(a) - getHealthScore(b));

  return (
    <div className="view">
      <div className="page-title">Your Friends</div>
      <div className="page-sub">Everyone you're being intentional about.</div>
      <div className="friends-filters">
        <div className={`filter-tag ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</div>
        {ALL_TAGS.map(tag => (
          <div key={tag} className={`filter-tag ${filter === tag ? 'active' : ''}`} onClick={() => setFilter(tag)}>{tag}</div>
        ))}
      </div>
      <div className="friends-grid">
        {sorted.length
          ? sorted.map(f => <FriendCard key={f.id} friend={f} onClick={onOpenFriend} />)
          : <div className="empty-state"><div className="empty-title">No friends yet</div><div className="empty-sub">Use Add friend to start.</div></div>
        }
      </div>
    </div>
  );
}
