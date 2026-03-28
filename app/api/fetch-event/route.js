import { NextResponse } from 'next/server';

// Parse a date string into YYYY-MM-DD
function toDateStr(raw) {
  if (!raw) return '';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch { return ''; }
}

// Parse a datetime string into HH:MM (24h)
function toTimeStr(raw) {
  if (!raw) return '';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    return d.toTimeString().slice(0, 5);
  } catch { return ''; }
}

// Map schema.org @type or keywords to app categories
function guessCategory(text = '') {
  const t = text.toLowerCase();
  if (/music|concert|gig|dj|festival|band/.test(t)) return 'Music';
  if (/food|drink|dinner|lunch|brunch|restaurant|bar|cocktail|wine|beer|tasting/.test(t)) return 'Food & drink';
  if (/art|gallery|exhibition|museum|design/.test(t)) return 'Art';
  if (/theatre|theater|comedy|show|performance|opera|dance|circus/.test(t)) return 'Performance';
  if (/fitness|gym|yoga|run|race|sport|workout|class/.test(t)) return 'Fitness';
  if (/hike|outdoor|park|nature|trail|camp/.test(t)) return 'Outdoors';
  if (/game|gaming|esport|board game/.test(t)) return 'Gaming';
  if (/nightlife|club|party|rave|warehouse/.test(t)) return 'Nightlife';
  if (/workshop|class|learn|seminar|conference|talk|lecture|course/.test(t)) return 'Learning';
  return '';
}

// Extract a meta tag value by property or name
function getMeta(doc, ...keys) {
  for (const key of keys) {
    const el = doc.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']`, 'i'))
      || doc.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["']`, 'i'));
    if (el?.[1]) return el[1].trim();
  }
  return '';
}

// Parse JSON-LD blocks for schema.org Event data
function parseJsonLd(html) {
  const results = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const obj = JSON.parse(m[1]);
      const items = Array.isArray(obj) ? obj : (obj['@graph'] || [obj]);
      for (const item of items) {
        if (/event/i.test(item['@type'] || '')) results.push(item);
      }
    } catch { /* skip malformed */ }
  }
  return results[0] || null;
}

// Extract a plain-text location string from schema.org location object
function extractLocation(loc) {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  const parts = [];
  if (loc.name) parts.push(loc.name);
  const addr = loc.address;
  if (addr) {
    if (typeof addr === 'string') parts.push(addr);
    else {
      if (addr.streetAddress) parts.push(addr.streetAddress);
      if (addr.addressLocality) parts.push(addr.addressLocality);
    }
  }
  return parts.join(', ');
}

export async function POST(req) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 });

  let html;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FriendshipCalendar/1.0)',
        'Accept': 'text/html,application/xhtml+xml,*/*',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to fetch URL' }, { status: 502 });
  }

  // --- Try JSON-LD first (most structured) ---
  const ld = parseJsonLd(html);
  let name = '', date = '', time = '', location = '', description = '', category = '';

  if (ld) {
    name = ld.name || '';
    const startDate = ld.startDate || '';
    date = toDateStr(startDate);
    time = startDate.includes('T') ? toTimeStr(startDate) : '';
    location = extractLocation(ld.location);
    description = typeof ld.description === 'string' ? ld.description.replace(/<[^>]+>/g, '').slice(0, 300) : '';
    category = guessCategory([name, description, ld['@type']].join(' '));
  }

  // --- Fall back to Open Graph / meta tags ---
  if (!name) name = getMeta(html, 'og:title', 'twitter:title') || '';
  if (!description) description = getMeta(html, 'og:description', 'twitter:description', 'description') || '';
  if (!date) {
    const rawDate = getMeta(html, 'event:start_time', 'article:published_time', 'og:updated_time');
    date = toDateStr(rawDate);
    if (rawDate?.includes('T') && !time) time = toTimeStr(rawDate);
  }
  if (!location) location = getMeta(html, 'og:locality', 'place:location:latitude') || '';

  // Try extracting location from page title patterns like "@ Venue" or "at Venue"
  if (!location && name) {
    const atMatch = name.match(/@\s*(.+)$/);
    if (atMatch) {
      location = atMatch[1].trim();
      name = name.slice(0, atMatch.index).trim();
    }
  }

  // Guess category from combined text if still empty
  if (!category) category = guessCategory([name, description].join(' '));

  // Strip HTML entities from text fields
  function decodeEntities(str) {
    return str
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
  }

  return NextResponse.json({
    name: decodeEntities(name).slice(0, 120),
    date,
    time,
    location: decodeEntities(location).slice(0, 120),
    description: decodeEntities(description).slice(0, 300),
    category,
    sourceUrl: url,
  });
}
