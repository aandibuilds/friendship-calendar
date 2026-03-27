'use client';
import { useState } from 'react';
import { useToast } from '../lib/toast';

export default function QuietHoursModal({ quiet, onClose, onSave }) {
  const showToast = useToast();
  const [start, setStart] = useState(quiet.start);
  const [end, setEnd] = useState(quiet.end);
  const [enabled, setEnabled] = useState(quiet.enabled);

  function save() {
    onSave({ start, end, enabled });
    onClose();
    showToast(enabled ? 'Quiet hours on' : 'Quiet hours off');
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
        <div className="modal-header" style={{ justifyContent: 'space-between' }}>
          <div className="modal-title">Quiet hours</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--ink-muted)' }}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 16 }}>Suppress reminder notifications during these hours.</p>
          <div className="form-group">
            <label className="form-label">Quiet window</label>
            <div className="time-row">
              <input type="time" className="input-full" value={start} onChange={e => setStart(e.target.value)} style={{ flex: 1 }} />
              <span>to</span>
              <input type="time" className="input-full" value={end} onChange={e => setEnd(e.target.value)} style={{ flex: 1 }} />
            </div>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--primary)' }} />
              Enable quiet hours
            </label>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
