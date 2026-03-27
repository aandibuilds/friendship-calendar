'use client';
import { useState } from 'react';
import { useToast } from '../lib/toast';

const EMOJIS = ['◆', '○', '●', '◇', '△', '□', '☆', '♦'];

export default function EventModal({ friends, onClose, onSave }) {
  const showToast = useToast();
  const [step, setStep] = useState(1);
  const [type, setType] = useState(null);
  const [emoji, setEmoji] = useState('◆');
  const [evtName, setEvtName] = useState('');
  const [evtDesc, setEvtDesc] = useState('');
  const [dates, setDates] = useState(['', '', '']);
  const [soloActivity, setSoloActivity] = useState('');
  const [soloLocation, setSoloLocation] = useState('');
  const [soloDate, setSoloDate] = useState('');
  const [soloFriend, setSoloFriend] = useState(null);
  const [invitees, setInvitees] = useState(new Set());

  const total = type === 'group' ? 3 : 2;
  const progress = step === 1 ? 33 : step === 2 ? (type === 'group' ? 66 : 100) : 100;

  function toggleInvitee(id) { setInvitees(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  function next() {
    if (step === 1) {
      if (!type) { showToast('Please choose an event type'); return; }
      setStep(2);
    } else if (step === 2) {
      if (type === 'group') {
        if (!evtName.trim()) { showToast('Please enter an event name'); return; }
        setStep(3);
      } else {
        if (!soloActivity.trim()) { showToast('Please describe the activity'); return; }
        if (!soloDate) { showToast('Please pick a date'); return; }
        if (!soloFriend) { showToast('Please select a friend'); return; }
        saveSolo();
      }
    } else {
      saveGroup();
    }
  }

  function saveSolo() {
    const f = friends.find(x => x.id === soloFriend);
    const label = soloLocation ? `${soloActivity} @ ${soloLocation}` : soloActivity;
    const dateOnly = soloDate.split('T')[0];
    const isPlanned = new Date(soloDate) > new Date();
    if (isPlanned) {
      const ev = { id: Date.now(), type: '1on1', name: label, desc: soloLocation, emoji: '◆', dates: [soloDate], invitees: [f.id], rsvps: {}, votes: [[]], confirmed: soloDate };
      onSave({ type: 'event', event: ev, friendUpdates: [{ ...f, invites: [...(f.invites || []), { eventId: ev.id, eventName: label, date: soloDate, status: 'pending' }] }] });
      showToast(`Plan created with ${f.name}.`);
    } else {
      const updatedF = { ...f, hangouts: [...(f.hangouts || []), { date: dateOnly, activity: label }] };
      onSave({ type: 'hangout', friendUpdates: [updatedF] });
      showToast(`Hangout logged with ${f.name}! ✓`);
    }
    onClose();
  }

  function saveGroup() {
    const validDates = dates.filter(Boolean);
    const ids = [...invitees];
    const ev = { id: Date.now(), type: 'group', name: evtName.trim(), desc: evtDesc.trim(), emoji, dates: validDates, invitees: ids, rsvps: {}, votes: validDates.map(() => []), confirmed: null };
    const friendUpdates = ids.map(id => {
      const f = friends.find(x => x.id === id);
      return { ...f, invites: [...(f.invites || []), { eventId: ev.id, eventName: ev.name, date: validDates[0] || null, status: 'pending' }] };
    });
    onSave({ type: 'event', event: ev, friendUpdates });
    showToast(`"${evtName}" created; ${ids.length} invite${ids.length !== 1 ? 's' : ''} sent.`);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        {/* HEADER */}
        <div className="modal-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="modal-title">
              {step === 1 ? 'Create an event' : step === 2 ? (type === 'group' ? 'Group event details' : '1-on-1 hangout') : 'Invite your friends'}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: 3 }}>Step {step} of {total}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--ink-muted)' }}>✕</button>
        </div>
          <div style={{ height: 3, background: 'var(--border)' }}>
          <div style={{ height: 3, background: 'var(--primary-gradient)', width: `${progress}%`, transition: 'width 0.3s', borderRadius: '0 99px 99px 0' }} />
        </div>

        <div className="modal-body">
          {/* STEP 1 — type */}
          {step === 1 && (
            <>
              <p style={{ fontSize: '13.5px', color: 'var(--ink-muted)', marginBottom: 14 }}>What kind of event is this?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[['group', 'Grp', 'Group hangout', 'Invite multiple friends, run a poll for the best date, collect RSVPs'],
                  ['1on1',  '1:1', '1-on-1 hangout', 'Plan time with one specific friend and log it to their profile']
                ].map(([t, icon, label, sub]) => (
                  <div key={t} className={`event-type-card ${type === t ? 'selected' : ''}`} onClick={() => setType(t)}>
                    <div className="event-type-icon">{icon}</div>
                    <div><div className="event-type-label">{label}</div><div className="event-type-sub">{sub}</div></div>
                    <div className={`event-type-check ${type === t ? '' : 'hidden'}`}>✓</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* STEP 2 GROUP */}
          {step === 2 && type === 'group' && (
            <>
              <div className="form-group"><label className="form-label">Event name *</label><input className="input-full" value={evtName} onChange={e => setEvtName(e.target.value)} placeholder="e.g. Summer rooftop BBQ" autoFocus /></div>
              <div className="form-group"><label className="form-label">Description / location</label><input className="input-full" value={evtDesc} onChange={e => setEvtDesc(e.target.value)} placeholder="e.g. My rooftop, 123 Main St" /></div>
              <div className="form-group">
                <label className="form-label">Symbol</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {EMOJIS.map(e => <div key={e} className={`emoji-opt ${emoji === e ? 'active' : ''}`} onClick={() => setEmoji(e)}>{e}</div>)}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Propose date options <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>(leave blank to skip poll)</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {dates.map((d, i) => <input key={i} type="datetime-local" className="input-full" value={d} onChange={e => setDates(ds => ds.map((x, j) => j === i ? e.target.value : x))} />)}
                </div>
              </div>
            </>
          )}

          {/* STEP 2 SOLO */}
          {step === 2 && type === '1on1' && (
            <>
              <div className="form-group"><label className="form-label">What are you planning?</label><input className="input-full" value={soloActivity} onChange={e => setSoloActivity(e.target.value)} placeholder="e.g. Coffee, dinner, hike…" autoFocus /></div>
              <div className="form-group"><label className="form-label">Location <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>(optional)</span></label><input className="input-full" value={soloLocation} onChange={e => setSoloLocation(e.target.value)} placeholder="e.g. Blue Bottle on Mission" /></div>
              <div className="form-group"><label className="form-label">Date & time *</label><input type="datetime-local" className="input-full" value={soloDate} onChange={e => setSoloDate(e.target.value)} /></div>
              <div className="form-group">
                <label className="form-label">Who are you hanging out with?</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 220, overflowY: 'auto' }}>
                  {friends.map(f => (
                    <div key={f.id} className={`solo-friend-row ${soloFriend === f.id ? 'selected' : ''}`} onClick={() => setSoloFriend(f.id)}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display), Georgia, serif', fontSize: 13, fontWeight: 600, color: 'white', flexShrink: 0 }}>{f.name[0]}</div>
                      <div style={{ flex: 1 }}><div style={{ fontSize: '13.5px', fontWeight: 500 }}>{f.name}</div><div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>{(f.tags || []).join(', ') || 'No tags'}</div></div>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${soloFriend === f.id ? 'var(--primary)' : 'var(--border)'}`, background: soloFriend === f.id ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 700 }}>{soloFriend === f.id ? '✓' : ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* STEP 3 — invitees */}
          {step === 3 && (
            <>
              <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 16 }}>Select everyone you'd like to invite.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
                {friends.map(f => (
                  <div key={f.id} className={`invitee-card ${invitees.has(f.id) ? 'selected' : ''}`} onClick={() => toggleInvitee(f.id)}>
                    <div className="inv-avatar" style={{ background: f.color }}>{f.name[0]}</div>
                    <div style={{ flex: 1 }}><div className="inv-name">{f.name}</div><div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{(f.tags || [])[0] || ''}</div></div>
                    <div className="inv-check">{invitees.has(f.id) ? '✓' : ''}</div>
                  </div>
                ))}
              </div>
              {invitees.size > 0 && (
                <div style={{ marginTop: 14, padding: '12px', background: 'var(--plum-pale)', borderRadius: 'var(--radius-xs)', fontSize: 13, color: 'var(--ink-muted)', border: '1px solid rgba(124, 58, 237, 0.15)' }}>
                  Inviting: {[...invitees].map(id => friends.find(f => f.id === id)?.name || '?').join(', ')}
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          {step > 1 ? <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>← Back</button> : <span />}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={next}>
              {step === 1 ? 'Next →' : step === 2 && type === 'group' ? 'Choose invitees →' : step === 2 ? 'Create plan ✓' : 'Send invites & create ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
