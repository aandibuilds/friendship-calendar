'use client';

// ─── STORAGE ────────────────────────────────────────────────
export function loadData() {
  if (typeof window === 'undefined') return { friends: [], events: [], proposed: [], quiet: defaultQuiet(), profile: defaultProfile() };
  return {
    friends:  JSON.parse(localStorage.getItem('fc2_friends')   || '[]'),
    events:   JSON.parse(localStorage.getItem('fc2_events')    || '[]'),
    proposed: JSON.parse(localStorage.getItem('fc2_proposed')  || '[]'),
    quiet:    JSON.parse(localStorage.getItem('fc2_quiet')     || JSON.stringify(defaultQuiet())),
    profile:  JSON.parse(localStorage.getItem('fc2_profile')   || JSON.stringify(defaultProfile())),
  };
}

export function saveData({ friends, events, proposed, quiet, profile }) {
  if (typeof window === 'undefined') return;
  if (friends  !== undefined) localStorage.setItem('fc2_friends',  JSON.stringify(friends));
  if (events   !== undefined) localStorage.setItem('fc2_events',   JSON.stringify(events));
  if (proposed !== undefined) localStorage.setItem('fc2_proposed', JSON.stringify(proposed));
  if (quiet    !== undefined) localStorage.setItem('fc2_quiet',    JSON.stringify(quiet));
  if (profile  !== undefined) localStorage.setItem('fc2_profile',  JSON.stringify(profile));
}

function defaultQuiet() { return { enabled: false, start: '22:00', end: '08:00' }; }
function defaultProfile() {
  return { name: '', color: '#C05A3A', location: '', birthday: '', bio: '', hobbies: [], times: [], hangtypes: [], social: '', vibe: '' };
}

// ─── SAMPLE DATA ─────────────────────────────────────────────
export function initSample(friends, events) {
  if (friends.length) return null;
  const ago = d => { const x = new Date(); x.setDate(x.getDate() - d); return x.toISOString().split('T')[0]; };
  const sampleFriends = [
    { id: 1, name: 'Maya Patel',      color: '#C05A3A', tags: ['College'],          cadence: 30, notes: 'Loves Thai food. Cat named Miso. Big fan of Studio Ghibli films. Usually free on weekends.', hangouts: [{ date: ago(65), activity: 'Coffee at Blue Bottle' }, { date: ago(120), activity: 'Hiking' }, { date: ago(180), activity: 'Dinner at Rintaro' }, { date: ago(35), activity: 'Movie night' }] },
    { id: 2, name: 'James Liu',       color: '#5A8C6A', tags: ['Work', 'College'],  cadence: 30, notes: 'Into photography. Matcha obsessed. Goes to the farmers market every Sunday. Loves ramen.', hangouts: [{ date: ago(10), activity: 'Ramen lunch' }, { date: ago(42), activity: 'Basketball' }, { date: ago(73), activity: 'Gallery opening' }, { date: ago(104), activity: 'Bike ride' }] },
    { id: 3, name: 'Rosa Fernández',  color: '#7A5A8C', tags: ['Neighbors'],        cadence: 14, notes: 'Next door neighbor. Incredible cook, especially Mexican food. Loves gardening and yoga.', hangouts: [{ date: ago(20), activity: 'Dinner at her place' }, { date: ago(50), activity: 'Farmers market' }, { date: ago(68), activity: 'Coffee' }] },
    { id: 4, name: 'Tom Brennan',     color: '#7B8FA1', tags: ['Childhood'],        cadence: 90, notes: 'Back in Boston. Celtics fan. Works in finance. Loves craft beer and hiking.', hangouts: [{ date: ago(110), activity: 'Video call' }, { date: ago(200), activity: 'Visited Boston' }] },
    { id: 5, name: 'Keiko Tanaka',    color: '#B85C6E', tags: ['Work'],             cadence: 30, notes: 'Met at conference. Loves ceramics and pottery. Always up for trying new restaurants.', hangouts: [{ date: ago(5), activity: 'Coffee catch-up' }, { date: ago(37), activity: 'Museum visit' }, { date: ago(68), activity: 'Lunch' }] },
  ];
  const sampleEvents = [{
    id: 1, name: 'Rooftop Hangout', desc: 'My rooftop, BYO drinks', type: 'group',
    emoji: '🎉', dates: ['2026-04-12T18:00', '2026-04-19T18:00', '2026-04-26T18:00'],
    invitees: [1, 2, 3], rsvps: {}, votes: [[], [], []], confirmed: null,
  }];
  return { friends: sampleFriends, events: sampleEvents };
}

// ─── HEALTH & STREAKS ─────────────────────────────────────────
export function getHealthScore(f) {
  if (!f.hangouts?.length) return 0;
  const sorted = [...f.hangouts].sort((a, b) => new Date(b.date) - new Date(a.date));
  const daysSince = Math.floor((Date.now() - new Date(sorted[0].date)) / 86400000);
  return Math.max(0, Math.min(100, Math.round(100 - (daysSince / (f.cadence || 30)) * 40)));
}
export function getHealthColor(s) { return s >= 70 ? 'var(--sage)' : s >= 40 ? 'var(--amber)' : 'var(--terra)'; }
export function getHealthLabel(s) { return s >= 70 ? 'Thriving' : s >= 40 ? 'Drifting' : 'Overdue'; }
export function getHealthChipClass(s) { return s >= 70 ? 'chip-thriving' : s >= 40 ? 'chip-drifting' : 'chip-overdue'; }
export function getDaysSince(f) {
  if (!f.hangouts?.length) return null;
  const sorted = [...f.hangouts].sort((a, b) => new Date(b.date) - new Date(a.date));
  return Math.floor((Date.now() - new Date(sorted[0].date)) / 86400000);
}
export function getStreak(f) {
  if (!f.hangouts?.length) return 0;
  const months = new Set(f.hangouts.map(h => h.date.slice(0, 7)));
  let streak = 0, d = new Date();
  while (true) {
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    if (months.has(key)) { streak++; d.setMonth(d.getMonth() - 1); } else break;
  }
  return streak;
}

// ─── UTILS ───────────────────────────────────────────────────
export function fmtDate(s) {
  return new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
export function fmtDT(s) {
  if (!s) return '';
  const d = new Date(s);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
export function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
export function cadLbl(d) {
  return d <= 7 ? 'Weekly' : d <= 30 ? 'Monthly' : d <= 90 ? 'Quarterly' : 'Every 6 months';
}
export function categoryEmoji(cat) {
  const map = { 'Music': '🎵', 'Food & drink': '🍕', 'Art': '🎨', 'Performance': '🎭', 'Fitness': '🏃', 'Outdoors': '🌿', 'Gaming': '🎮', 'Nightlife': '🍸', 'Learning': '🎓' };
  return map[cat] || '🎉';
}
export function isQuietNow(quiet) {
  if (!quiet.enabled) return false;
  const now = new Date(), cur = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = quiet.start.split(':').map(Number);
  const [eh, em] = quiet.end.split(':').map(Number);
  const s = sh * 60 + sm, e = eh * 60 + em;
  return s > e ? (cur >= s || cur < e) : (cur >= s && cur < e);
}

// ─── AI ──────────────────────────────────────────────────────
export async function callClaude(prompt, imagePayload = null) {
  const content = imagePayload
    ? [{ type: 'image', source: { type: 'base64', media_type: imagePayload.type, data: imagePayload.data } }, { type: 'text', text: prompt }]
    : prompt;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content }] }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || '';
}
export function parseAIList(text) {
  return text.split('\n').map(l => l.replace(/^[\d\.\-\*\•]+\s*/, '').trim()).filter(l => l.length > 10);
}

// ─── SHARE ───────────────────────────────────────────────────
export function buildShareProfileLink(profile) {
  const shareData = { name: profile.name, bio: profile.bio, color: profile.color, hobbies: (profile.hobbies || []).slice(0, 6), hangtypes: (profile.hangtypes || []).slice(0, 4), times: (profile.times || []).slice(0, 3), location: profile.location, vibe: profile.vibe, social: profile.social };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(shareData))));
  return `${window.location.href.split('?')[0]}?profile=${encoded}`;
}
export function buildProposeShareLink(ev) {
  const data = { name: ev.name, date: ev.date, time: ev.time, location: ev.location, desc: ev.desc, sourceUrl: ev.sourceUrl, category: ev.category };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  return `${window.location.href.split('?')[0]}?event=${encoded}`;
}
export function parseSharedProfile() {
  if (typeof window === 'undefined') return null;
  const p = new URLSearchParams(window.location.search).get('profile');
  if (!p) return null;
  try { return JSON.parse(decodeURIComponent(escape(atob(p)))); } catch { return null; }
}
export function parseSharedEvent() {
  if (typeof window === 'undefined') return null;
  const e = new URLSearchParams(window.location.search).get('event');
  if (!e) return null;
  try { return JSON.parse(decodeURIComponent(escape(atob(e)))); } catch { return null; }
}
