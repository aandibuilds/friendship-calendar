'use client';
import { useState, useEffect } from 'react';
import BarChart from './BarChart';
import { getHealthScore, getHealthColor, getHealthLabel, getDaysSince, getStreak, fmtDate, cadLbl } from '../lib/data';
import { getConvoStarters, getHangoutIdeas } from '../lib/suggestions';
import { useToast } from '../lib/toast';

export default function FriendDetailModal({ friend: f, profile, onClose, onUpdate, onDelete }) {
  const showToast = useToast();
  const [hangoutDate, setHangoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [hangoutActivity, setHangoutActivity] = useState('');
  const [aiPanel, setAiPanel] = useState(null); // null | 'loading-convo' | 'loading-ideas' | {type, items}
  const [convoUsed, setConvoUsed] = useState(false);
  const [ideasUsed, setIdeasUsed] = useState(false);
  const [inviteEmail, setInviteEmail] = useState(f.email || '');
  const [inviteState, setInviteState] = useState(''); // '' | 'sending' | 'sent' | 'error'

  useEffect(() => {
    setHangoutDate(new Date().toISOString().split('T')[0]);
    setHangoutActivity('');
    setAiPanel(null);
    setConvoUsed(false);
    setIdeasUsed(false);
  }, [f?.id]);

  if (!f) return null;

  const sc = getHealthScore(f);
  const days = getDaysSince(f);
  const streak = getStreak(f);
  const sorted = [...(f.hangouts || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Trend data (last 6 months)
  const trendData = (() => {
    const labels = [], data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
      data.push((f.hangouts || []).filter(h => h.date.startsWith(key)).length);
    }
    return { labels, data };
  })();

  function logHangout() {
    if (!hangoutDate) { showToast('Please pick a date'); return; }
    const act = hangoutActivity.trim() || 'Hung out';
    const updated = { ...f, hangouts: [...(f.hangouts || []), { date: hangoutDate, activity: act }] };
    onUpdate(updated); setHangoutActivity('');
    showToast('Hangout logged.');
  }

  function loadConvoStarters() {
    setConvoUsed(true);
    const items = getConvoStarters(f);
    setAiPanel({ type: 'convo', label: `Conversation starters for ${f.name}`, items });
  }

  function loadHangoutIdeas() {
    setIdeasUsed(true);
    const items = getHangoutIdeas(f, profile);
    setAiPanel({ type: 'ideas', label: `Hangout ideas for you & ${f.name}`, items });
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {/* HEADER */}
        <div className="modal-header">
          <div className="modal-avatar" style={{ background: f.color }}>{f.name[0]}</div>
          <div style={{ flex: 1 }}>
            <div className="modal-name">{f.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{cadLbl(f.cadence)} hangout goal</div>
            <div className="modal-tags">{(f.tags || []).map(t => <span key={t} className="tag">{t}</span>)}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--ink-muted)', marginLeft: 'auto', padding: 4 }}>✕</button>
        </div>

        <div className="modal-body">
          {/* HEALTH */}
          <div className="modal-section">
            <div className="modal-section-title">Friendship Health</div>
            <div className="health-score-big">
              <div className="score-circle" style={{ background: getHealthColor(sc) }}>{sc}</div>
              <div>
                <div className="score-label">{getHealthLabel(sc)}</div>
                <div className="score-sub">
                  {days === null ? 'No hangouts logged yet' : `Last hangout ${days} day${days !== 1 ? 's' : ''} ago · Goal: every ${f.cadence} days`}
                </div>
              </div>
            </div>
          </div>

          {/* STREAK */}
          {streak > 0 && (
            <div className="modal-section">
              <div className="modal-section-title">Streak</div>
              <div className="streak-row">
                <span style={{ width: 4, height: 28, borderRadius: 3, background: 'var(--primary)', flexShrink: 0 }} aria-hidden />
                <div>
                  <div className="streak-val">{streak} month{streak !== 1 ? 's' : ''}</div>
                  <div className="streak-lbl">consecutive months with a hangout</div>
                </div>
              </div>
            </div>
          )}

          {/* TREND */}
          <div className="modal-section">
            <div className="modal-section-title">Hangout trend (last 6 months)</div>
            <BarChart labels={trendData.labels} data={trendData.data} color={f.color} />
          </div>

          {/* AI SECTION */}
          <div className="modal-section">
            <div className="modal-section-title">AI Suggestions</div>
            <div className="ai-actions">
              <button type="button" className="btn-ai" disabled={convoUsed && aiPanel?.type === 'loading'} onClick={loadConvoStarters}>Conversation starters</button>
              <button type="button" className="btn-ai" disabled={ideasUsed && aiPanel?.type === 'loading'} onClick={loadHangoutIdeas}>Hangout ideas</button>
            </div>
            {aiPanel && (
              <div className="ai-panel">
                <div className="ai-panel-header"><span className="ai-chip">✦</span> {aiPanel.label}</div>
                {(aiPanel.items || []).map((item, i) => (
                  <div key={i} className="ai-result-item"
                    onClick={() => {
                      if (aiPanel.type === 'convo') { navigator.clipboard.writeText(item); showToast('Copied to clipboard.'); }
                      else { setHangoutActivity(item.length > 60 ? item.slice(0, 57) + '…' : item); showToast('Added to hangout log.'); }
                    }}>
                    <span className="item-icon">{i + 1}</span>
                    <span>{item}</span>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: 'var(--plum)', marginTop: 8, opacity: 0.7 }}>
                  {aiPanel.type === 'convo' ? 'Tap any to copy' : 'Tap any to add to hangout log'}
                </div>
              </div>
            )}
          </div>

          {/* NOTES */}
          {f.notes && (
            <div className="modal-section">
              <div className="modal-section-title">Notes</div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', fontStyle: 'italic', background: 'var(--plum-pale)', padding: '10px 12px', borderRadius: 'var(--radius-xs)', lineHeight: 1.5 }}>
                {f.notes}
              </div>
            </div>
          )}

          {/* LOG HANGOUT */}
          <div className="modal-section">
            <div className="modal-section-title">Log a hangout</div>
            <div className="log-hangout-form">
              <div className="form-row">
                <input type="date" className="input" value={hangoutDate} onChange={e => setHangoutDate(e.target.value)} />
                <input type="text" className="input" placeholder="What did you do?" value={hangoutActivity} onChange={e => setHangoutActivity(e.target.value)} onKeyDown={e => e.key === 'Enter' && logHangout()} />
              </div>
              <button className="btn btn-primary" onClick={logHangout} style={{ width: '100%', borderRadius: 'var(--radius-xs)' }}>Log hangout ✓</button>
            </div>
          </div>

          {/* HISTORY */}
          <div className="modal-section">
            <div className="modal-section-title">History</div>
            <div className="hangouts-timeline">
              {sorted.length
                ? sorted.map((h, i) => (
                    <div key={i} className="hangout-entry">
                      <div className="hangout-date">{fmtDate(h.date)}</div>
                      <div className="hangout-activity">{h.activity || '—'}</div>
                    </div>
                  ))
                : <div style={{ color: 'var(--ink-muted)', fontSize: '12.5px', padding: '4px 0' }}>No hangouts logged yet.</div>
              }
            </div>
          </div>
        </div>

        {/* INVITE TO APP */}
        {!f.linkedUserId && (
          <div style={{ margin: '16px 0 4px', padding: '14px 16px', background: 'var(--plum-pale)', borderRadius: 12, border: '1px solid rgba(124,58,237,0.15)' }}>
            <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 6 }}>
              {inviteState === 'sent' ? '✓ Invite sent!' : `Invite ${f.name} to the app`}
            </div>
            {inviteState !== 'sent' && (
              <>
                <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginBottom: 10 }}>
                  They'll get a link to join and will be connected to your friend list.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input-full"
                    type="email"
                    placeholder="their@email.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    style={{ flex: 1, fontSize: 13 }}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={inviteState === 'sending' || !inviteEmail.trim()}
                    onClick={async () => {
                      setInviteState('sending');
                      try {
                        const res = await fetch('/api/invite-friend', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: inviteEmail.trim(), friendId: f.id, friendName: f.name }),
                        });
                        const data = await res.json();
                        if (data.error) throw new Error(data.error);
                        if (data.alreadyExists) {
                          showToast(`${f.name} already has an account — they can sign in directly.`);
                        }
                        setInviteState('sent');
                        if (inviteEmail !== f.email) onUpdate({ ...f, email: inviteEmail.trim() });
                      } catch (err) {
                        showToast('Failed to send invite — try again.');
                        setInviteState('error');
                      }
                    }}
                  >
                    {inviteState === 'sending' ? '…' : 'Send'}
                  </button>
                </div>
              </>
            )}
            {inviteState === 'sent' && (
              <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
                An email was sent to {inviteEmail}. Once they sign up, they'll be connected here.
              </div>
            )}
          </div>
        )}
        {f.linkedUserId && (
          <div style={{ margin: '16px 0 4px', padding: '10px 14px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0', fontSize: 13, color: '#16A34A', fontWeight: 600 }}>
            ✓ {f.name} is on Friendship Calendar
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => { if (confirm('Remove this friend?')) { onDelete(f.id); onClose(); } }}>Remove</button>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
