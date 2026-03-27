'use client';
import { useState } from 'react';
import { useToast } from '../lib/toast';
import { callClaude, categoryEmoji, buildProposeShareLink } from '../lib/data';

const CATEGORIES = ['🎵 Music','🍕 Food & drink','🎨 Art','🎭 Performance','🏃 Fitness','🌿 Outdoors','🎮 Gaming','🍸 Nightlife','🎓 Learning'];

export default function ProposeModal({ friends, onClose, onSave }) {
  const showToast = useToast();
  const [step, setStep] = useState(1);
  const [source, setSource] = useState(null);
  const [url, setUrl] = useState('');
  const [fetchStatus, setFetchStatus] = useState('');
  const [fetchState, setFetchState] = useState(''); // '' | 'loading' | 'success' | 'error'
  const [imgBase64, setImgBase64] = useState(null);
  const [imgType, setImgType] = useState(null);
  const [imgFetchState, setImgFetchState] = useState('');
  const [imgPreview, setImgPreview] = useState(null);
  const [autofillMsg, setAutofillMsg] = useState('');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [desc, setDesc] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [category, setCategory] = useState('');
  const [selectedFriends, setSelectedFriends] = useState(new Set());

  const progress = step === 1 ? 33 : step === 2 ? 66 : 100;

  function toggleFriend(id) { setSelectedFriends(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  function autofill(data, msg) {
    if (data.name) setName(data.name);
    if (data.date) setDate(data.date);
    if (data.time) setTime(data.time);
    if (data.location) setLocation(data.location);
    if (data.description) setDesc(data.description);
    if (data.category) setCategory(data.category);
    if (data.sourceUrl) setSourceUrl(data.sourceUrl);
    setAutofillMsg(msg);
  }

  async function fetchFromUrl() {
    if (!url.trim()) { showToast('Please enter a URL'); return; }
    setFetchState('loading'); setFetchStatus('✦ Fetching event details…');
    const prompt = `You are a web scraping assistant. A user pasted this URL: "${url}"\n\nBased on the URL and domain info (Eventbrite, RA, Posh, Facebook Events, Meetup, etc.), extract or intelligently guess the likely event details.\n\nReturn ONLY a valid JSON object with these exact keys:\n{\n  "name": "event name",\n  "date": "YYYY-MM-DD or empty",\n  "time": "HH:MM (24h) or empty",\n  "location": "venue/city or empty",\n  "description": "1-2 sentence description or empty",\n  "category": "one of: Music, Food & drink, Art, Performance, Fitness, Outdoors, Gaming, Nightlife, Learning, or empty"\n}\nOnly return the JSON object, nothing else.`;
    try {
      const text = await callClaude(prompt);
      const data = JSON.parse(text.replace(/```json|```/g, '').trim());
      autofill({ ...data, sourceUrl: url }, `Details fetched from ${new URL(url).hostname}`);
      setFetchState('success'); setFetchStatus('✅ Event details loaded!');
    } catch {
      setFetchState('error'); setFetchStatus('⚠ Couldn\'t auto-fetch — fill in manually on the next step.');
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const b64 = ev.target.result.split(',')[1];
      setImgBase64(b64); setImgType(file.type); setImgPreview(ev.target.result);
      setImgFetchState('loading');
      const prompt = `Extract event details from this image (flyer, screenshot, poster, etc.).\nReturn ONLY a valid JSON object:\n{\n  "name": "event name",\n  "date": "YYYY-MM-DD or empty",\n  "time": "HH:MM (24h) or empty",\n  "location": "venue/city or empty",\n  "description": "1-2 sentence description or empty",\n  "category": "one of: Music, Food & drink, Art, Performance, Fitness, Outdoors, Gaming, Nightlife, Learning, or empty"\n}\nOnly return the JSON, nothing else.`;
      try {
        const text = await callClaude(prompt, { type: file.type, data: b64 });
        const data = JSON.parse(text.replace(/```json|```/g, '').trim());
        autofill(data, 'Details extracted from your screenshot');
        setImgFetchState('success');
      } catch { setImgFetchState('error'); }
    };
    reader.readAsDataURL(file);
  }

  function nextStep() {
    if (step === 1) {
      if (!source) { showToast('Please choose a source'); return; }
      setStep(2);
    } else if (step === 2) {
      if (!name.trim()) { showToast('Please enter an event name'); return; }
      if (!date) { showToast('Please pick a date'); return; }
      setStep(3);
    } else {
      save();
    }
  }

  function save() {
    const ids = [...selectedFriends];
    const proposed = {
      id: Date.now(), type: 'proposed',
      name: name.trim(), date, time, location: location.trim(), desc: desc.trim(),
      sourceUrl: sourceUrl.trim(), category, proposedTo: ids, proposedAt: new Date().toISOString(),
    };
    const friendUpdates = ids.map(id => {
      const f = friends.find(x => x.id === id);
      return { ...f, invites: [...(f.invites || []), { eventId: proposed.id, eventName: proposed.name, date: date + (time ? 'T' + time : ''), status: 'pending', type: 'proposed' }] };
    });
    onSave({ proposed, friendUpdates });
    showToast(`"${proposed.name}" proposed to ${ids.length} friend${ids.length !== 1 ? 's' : ''}! 🔍`);
    // Show share toast after
    setTimeout(() => {
      const link = buildProposeShareLink(proposed);
      showToast(`Share link ready — click events tab to copy 🔗`);
    }, 600);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>
              {['Propose an event','Event details','Loop in friends'][step - 1]}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: 3 }}>
              {['Step 1 of 3 — Source','Step 2 of 3 — Details','Step 3 of 3 — Friends'][step - 1]}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--ink-muted)' }}>✕</button>
        </div>
        <div style={{ height: 3, background: 'var(--border)' }}>
          <div style={{ height: 3, background: 'linear-gradient(90deg,var(--plum),#B07ACC)', width: `${progress}%`, transition: 'width 0.3s', borderRadius: '0 99px 99px 0' }} />
        </div>

        <div className="modal-body">
          {/* STEP 1 — SOURCE */}
          {step === 1 && (
            <>
              <p style={{ fontSize: '13.5px', color: 'var(--ink-muted)', marginBottom: 18, lineHeight: 1.6 }}>Saw something on Instagram, Eventbrite, or anywhere else? Capture it here before you forget.</p>
              {[['url','🔗','Paste a URL','Drop in an Eventbrite, RA, Posh, Facebook Events, or any link — AI will pull the details'],
                ['image','📸','Upload a screenshot','Screenshot from Instagram, a flyer, or anything visual — AI reads the details'],
                ['manual','✏️','Enter manually','Type in the event name, date, and location yourself']
              ].map(([t, icon, label, sub]) => (
                <div key={t} className={`source-option ${source === t ? 'selected' : ''}`} onClick={() => setSource(t)}>
                  <div className="source-icon">{icon}</div>
                  <div><div className="source-label">{label}</div><div className="source-sub">{sub}</div></div>
                  <div className={`event-type-check ${source === t ? '' : 'hidden'}`}>✓</div>
                </div>
              ))}

              {source === 'url' && (
                <div style={{ marginTop: 14 }}>
                  <label className="form-label">Event URL</label>
                  <div className="fetch-bar">
                    <input type="url" className="input-full" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.eventbrite.com/e/..." style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && fetchFromUrl()} />
                    <button className="btn btn-primary btn-sm" onClick={fetchFromUrl} style={{ flexShrink: 0, borderRadius: 'var(--radius-xs)' }}>Fetch ✦</button>
                  </div>
                  {fetchStatus && <div className={`fetch-status ${fetchState}`}>{fetchStatus}</div>}
                </div>
              )}

              {source === 'image' && (
                <div style={{ marginTop: 14 }}>
                  <label className="form-label">Screenshot or flyer</label>
                  {!imgPreview ? (
                    <div className="drop-zone">
                      <input type="file" accept="image/*" onChange={handleImageUpload} />
                      <div className="drop-zone-icon">🖼️</div>
                      <div className="drop-zone-label">Click to upload or drag & drop</div>
                      <div className="drop-zone-sub">PNG, JPG, WEBP — AI will read the event details</div>
                    </div>
                  ) : (
                    <img src={imgPreview} className="image-preview" alt="preview" />
                  )}
                  {imgFetchState && (
                    <div className={`fetch-status ${imgFetchState}`} style={{ marginTop: 6 }}>
                      {imgFetchState === 'loading' ? '✦ Reading event details from image…' : imgFetchState === 'success' ? '✅ Event details extracted!' : '⚠ Couldn\'t read image — fill in manually on the next step.'}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* STEP 2 — DETAILS */}
          {step === 2 && (
            <>
              {autofillMsg && (
                <div style={{ background: 'var(--plum-pale)', border: '1px solid #D8CFF0', borderRadius: 'var(--radius-xs)', padding: '9px 12px', marginBottom: 14, fontSize: '12.5px', color: 'var(--plum)', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span>✦</span><span>{autofillMsg} — check and edit as needed.</span>
                </div>
              )}
              <div className="form-group"><label className="form-label">Event name *</label><input className="input-full" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Peggy Gou at Printworks" autoFocus /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}><label className="form-label">Date *</label><input type="date" className="input-full" value={date} onChange={e => setDate(e.target.value)} /></div>
                <div className="form-group" style={{ margin: 0 }}><label className="form-label">Time</label><input type="time" className="input-full" value={time} onChange={e => setTime(e.target.value)} /></div>
              </div>
              <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Location</label><input className="input-full" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Printworks London, or TBD" /></div>
              <div className="form-group"><label className="form-label">Description <span style={{ fontWeight: 400, color: 'var(--ink-muted)' }}>(optional)</span></label><textarea className="input-full" rows={2} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Anything else worth knowing…" /></div>
              <div className="form-group"><label className="form-label">Source URL <span style={{ fontWeight: 400, color: 'var(--ink-muted)' }}>(included in share link)</span></label><input type="url" className="input-full" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://…" /></div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {CATEGORIES.map(c => {
                    const cat = c.replace(/^[^\s]+\s/, '');
                    return <div key={c} className={`filter-tag ${category === cat ? 'active' : ''}`} onClick={() => setCategory(cat)}>{c}</div>;
                  })}
                </div>
              </div>
            </>
          )}

          {/* STEP 3 — FRIENDS */}
          {step === 3 && (
            <>
              <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 16, lineHeight: 1.5 }}>Who should know about this? They'll get a proposal card in the Events tab.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: 300, overflowY: 'auto', marginBottom: 14 }}>
                {friends.map(f => (
                  <div key={f.id} className={`invitee-card ${selectedFriends.has(f.id) ? 'selected' : ''}`} onClick={() => toggleFriend(f.id)}>
                    <div className="inv-avatar" style={{ background: f.color }}>{f.name[0]}</div>
                    <div style={{ flex: 1 }}><div className="inv-name">{f.name}</div><div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{(f.tags || [])[0] || ''}</div></div>
                    <div className="inv-check">{selectedFriends.has(f.id) ? '✓' : ''}</div>
                  </div>
                ))}
              </div>
              {selectedFriends.size > 0 && (
                <div style={{ padding: '10px 12px', background: 'var(--plum-pale)', border: '1px solid #D8CFF0', borderRadius: 'var(--radius-xs)', fontSize: 13, color: 'var(--plum)' }}>
                  ✦ Proposing to: {[...selectedFriends].map(id => friends.find(f => f.id === id)?.name || '?').join(', ')}
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          {step > 1 ? <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>← Back</button> : <span />}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn" onClick={nextStep}
              style={{ background: 'var(--plum)', color: 'white', borderRadius: 99, fontSize: '12.5px', padding: '8px 18px', cursor: 'pointer', border: 'none', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
              {step === 3 ? 'Propose & share ✦' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
