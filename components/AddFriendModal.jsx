'use client';
import { useState } from 'react';
import { useToast } from '../lib/toast';

const COLORS = ['#5B4FFF', '#7C3AED', '#D946EF', '#FB7185', '#F472B6', '#14B8A6', '#06B6D4', '#A78BFA'];
const ALL_TAGS = ['College','Work','Family','Neighbors','Travel','Childhood'];

export default function AddFriendModal({ onClose, onSave, prefill }) {
  const showToast = useToast();
  const [name, setName] = useState(prefill?.name || '');
  const [email, setEmail] = useState(prefill?.email || '');
  const [notes, setNotes] = useState(prefill?.notes || '');
  const [cadence, setCadence] = useState(30);
  const [color, setColor] = useState(prefill?.color || '#5B4FFF');
  const [tags, setTags] = useState([]);

  function toggleTag(t) { setTags(ts => ts.includes(t) ? ts.filter(x => x !== t) : [...ts, t]); }

  function save() {
    if (!name.trim()) { showToast('Please enter a name'); return; }
    onSave({ id: `f-${Date.now()}`, name: name.trim(), email: email.trim(), color, tags, cadence, notes: notes.trim(), inviteDates: [] });
    onClose();
    if (!email.trim()) {
      showToast(`${name.trim()} added.`);
    }
    // When email is provided, the parent (addFriend) shows the invite-specific toast
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ justifyContent: 'space-between' }}>
          <div className="modal-title">Add a friend</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--ink-muted)' }}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="input-full" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sarah Chen" autoFocus onKeyDown={e => e.key === 'Enter' && save()} />
          </div>
          <div className="form-group">
            <label className="form-label">Email <span style={{ fontWeight: 400, color: 'var(--ink-muted)' }}>(optional — to invite them to the app)</span></label>
            <input className="input-full" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="friend@example.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Tags</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ALL_TAGS.map(t => (
                <div key={t} className={`filter-tag ${tags.includes(t) ? 'active' : ''}`} onClick={() => toggleTag(t)}>{t}</div>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Hangout cadence</label>
            <select className="input-full" value={cadence} onChange={e => setCadence(+e.target.value)}>
              <option value={7}>Weekly</option>
              <option value={30}>Monthly</option>
              <option value={90}>Quarterly</option>
              <option value={180}>Every 6 months</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="input-full" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Shared interests, inside jokes, things they love…" />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div className="color-picker">
              {COLORS.map(c => (
                <div key={c} className={`color-swatch ${color === c ? 'selected' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Add friend →</button>
        </div>
      </div>
    </div>
  );
}
