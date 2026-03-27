'use client';
import { useState, useEffect } from 'react';
import BarChart from './BarChart';
import { getHealthScore, getHealthColor, getHealthLabel, getDaysSince, getStreak, fmtDate, cadLbl, callClaude, parseAIList } from '../lib/data';
import { useToast } from '../lib/toast';

export default function FriendDetailModal({ friend: f, profile, onClose, onUpdate, onDelete }) {
  const showToast = useToast();
  const [hangoutDate, setHangoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [hangoutActivity, setHangoutActivity] = useState('');
  const [aiPanel, setAiPanel] = useState(null); // null | 'loading-convo' | 'loading-ideas' | {type, items}
  const [convoUsed, setConvoUsed] = useState(false);
  const [ideasUsed, setIdeasUsed] = useState(false);

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
    showToast('Hangout logged! 🎉');
  }

  async function loadConvoStarters() {
    setConvoUsed(true); setAiPanel({ type: 'loading', label: `Conversation starters for ${f.name}` });
    const hist = (f.hangouts || []).slice(-5).map(h => h.activity).join(', ');
    const prompt = `You are a warm, thoughtful friend coach. Based on this profile, generate 4 specific, genuine conversation starters to use when catching up with ${f.name}.\n\nFriend info:\n- Tags: ${(f.tags || []).join(', ') || 'none'}\n- Notes: ${f.notes || 'none'}\n- Recent hangouts: ${hist || 'none yet'}\n- Cadence: every ${f.cadence} days\n\nReturn ONLY a numbered list of 4 conversation starters (one per line). Each should be specific, warm, and based on the info provided. No preamble or explanation.`;
    try {
      const text = await callClaude(prompt);
      const items = parseAIList(text);
      setAiPanel({ type: 'convo', label: `Conversation starters for ${f.name}`, items });
    } catch { setAiPanel({ type: 'error' }); setConvoUsed(false); }
  }

  async function loadHangoutIdeas() {
    setIdeasUsed(true); setAiPanel({ type: 'loading', label: `Hangout ideas for you & ${f.name}` });
    const recent = (f.hangouts || []).slice(-5).map(h => h.activity).join(', ');
    const prompt = `You are a creative social planner. Suggest 4 specific hangout ideas for two people.\n\nFriend (${f.name}):\n- Tags: ${(f.tags || []).join(', ') || 'none'}\n- Notes: ${f.notes || 'none'}\n- Recent hangouts: ${recent || 'none yet'}\n\nUser:\n- Hobbies: ${(profile?.hobbies || []).join(', ') || 'not specified'}\n- Preferred hangout types: ${(profile?.hangtypes || []).join(', ') || 'not specified'}\n\nGenerate 4 fresh, specific hangout ideas they haven't done recently. Be creative and concrete. Return ONLY a numbered list, one idea per line, no preamble.`;
    try {
      const text = await callClaude(prompt);
      const items = parseAIList(text);
      setAiPanel({ type: 'ideas', label: `Hangout ideas for you & ${f.name}`, items });
    } catch { setAiPanel({ type: 'error' }); setIdeasUsed(false); }
  }

  const convoIcons = ['💭','🎯','🌟','❓','💬','🤔'];
  const ideaIcons  = ['🎯','🌿','🍜','🎨','🎬','🏃','☕','🎲'];

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
                <span style={{ fontSize: 20 }}>🔥</span>
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
              <button className="btn-ai" disabled={convoUsed && aiPanel?.type === 'loading'} onClick={loadConvoStarters}>💬 Conversation starters</button>
              <button className="btn-ai" disabled={ideasUsed && aiPanel?.type === 'loading'} onClick={loadHangoutIdeas}>🎯 Hangout ideas</button>
            </div>
            {aiPanel && (
              <div className="ai-panel">
                {aiPanel.type === 'loading' && (
                  <>
                    <div className="ai-panel-header"><span className="ai-chip">AI</span> {aiPanel.label}</div>
                    <div className="ai-loading">Thinking<span className="ai-loading-dots" /></div>
                  </>
                )}
                {aiPanel.type === 'error' && <div style={{ fontSize: 13, color: 'var(--terra)' }}>Couldn't load suggestions. Check your connection.</div>}
                {(aiPanel.type === 'convo' || aiPanel.type === 'ideas') && (
                  <>
                    <div className="ai-panel-header"><span className="ai-chip">AI</span> {aiPanel.label}</div>
                    {(aiPanel.items || []).map((item, i) => (
                      <div key={i} className="ai-result-item"
                        onClick={() => {
                          if (aiPanel.type === 'convo') { navigator.clipboard.writeText(item); showToast('Copied to clipboard! 📋'); }
                          else { setHangoutActivity(item.length > 60 ? item.slice(0, 57) + '…' : item); showToast('Added to hangout log ✓'); }
                        }}>
                        <span className="item-icon">{aiPanel.type === 'convo' ? convoIcons[i % convoIcons.length] : ideaIcons[i % ideaIcons.length]}</span>
                        <span>{item}</span>
                      </div>
                    ))}
                    <div style={{ fontSize: 11, color: 'var(--plum)', marginTop: 8, opacity: 0.7 }}>
                      {aiPanel.type === 'convo' ? 'Click any to copy · Refresh for new ideas' : 'Click any to add to hangout log'}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* NOTES */}
          {f.notes && (
            <div className="modal-section">
              <div className="modal-section-title">Notes</div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', fontStyle: 'italic', background: 'var(--parchment)', padding: '10px 12px', borderRadius: 'var(--radius-xs)', lineHeight: 1.5 }}>
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

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => { if (confirm('Remove this friend?')) { onDelete(f.id); onClose(); } }}>Remove</button>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
