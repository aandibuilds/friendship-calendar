'use client';
import { useState } from 'react';
import { useToast } from '../lib/toast';

const COLORS = ['#C05A3A','#5A8C6A','#7B8FA1','#7A5A8C','#B8820A','#B85C6E','#6B8E8E','#8B7355'];
const ALL_TAGS = ['College','Work','Family','Neighbors','Travel','Childhood'];

export default function AddFriendModal({ onClose, onSave, prefill }) {
  const showToast = useToast();
  const [name, setName] = useState(prefill?.name || '');
  const [notes, setNotes] = useState(prefill?.notes || '');
  const [cadence, setCadence] = useState(30);
  const [color, setColor] = useState(prefill?.color || '#C05A3A');
  const [tags, setTags] = useState([]);

  function toggleTag(t) { setTags(ts => ts.includes(t) ? ts.filter(x => x !== t) : [...ts, t]); }

  function save() {
    if (!name.trim()) { showToast('Please enter a name'); return; }
    onSave({ id: Date.now(), name: name.trim(), color, tags, cadence, notes: notes.trim(), hangouts: [] });
    onClose();
    showToast(`${name.trim()} added! 💚`);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>Add a friend 💚</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--ink-muted)' }}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="input-full" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sarah Chen" autoFocus onKeyDown={e => e.key === 'Enter' && save()} />
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
