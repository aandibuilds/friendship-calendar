'use client';
import { useState, useMemo } from 'react';

export default function Calendar({ friends, events }) {
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  function changeMonth(dir) {
    let m = calMonth + dir, y = calYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setCalMonth(m); setCalYear(y);
  }

  const { cells, monthLabel } = useMemo(() => {
    const label = new Date(calYear, calMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const fd = new Date(calYear, calMonth, 1).getDay();
    const dim = new Date(calYear, calMonth + 1, 0).getDate();
    const dip = new Date(calYear, calMonth, 0).getDate();
    const today = new Date();

    // Build hangout map for this month
    const hmap = {};
    friends.forEach(f => (f.hangouts || []).forEach(h => {
      const d = new Date(h.date + 'T12:00:00');
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const k = d.getDate();
        if (!hmap[k]) hmap[k] = [];
        hmap[k].push({ friend: f, activity: h.activity });
      }
    }));
    // Also overlay upcoming events from the events list
    events.forEach(ev => {
      (ev.dates || []).forEach(dt => {
        const d = new Date(dt);
        if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
          const k = d.getDate();
          if (!hmap[k]) hmap[k] = [];
          hmap[k].push({ isEvent: true, name: ev.name, emoji: ev.emoji, color: '#7A5A8C' });
        }
      });
    });

    const cells = [];
    for (let i = fd - 1; i >= 0; i--) cells.push({ day: dip - i, otherMonth: true });
    for (let d = 1; d <= dim; d++) {
      const isToday = today.getDate() === d && today.getMonth() === calMonth && today.getFullYear() === calYear;
      cells.push({ day: d, isToday, events: hmap[d] || [] });
    }
    const rem = (fd + dim) % 7;
    for (let d = 1; d <= (rem ? 7 - rem : 0); d++) cells.push({ day: d, otherMonth: true });
    return { cells, monthLabel: label };
  }, [calYear, calMonth, friends, events]);

  function exportICS() {
    const evs = [];
    friends.forEach(f => (f.hangouts || []).forEach(h => {
      const d = h.date.replace(/-/g, '');
      evs.push(`BEGIN:VEVENT\nDTSTART;VALUE=DATE:${d}\nDTEND;VALUE=DATE:${d}\nSUMMARY:${h.activity} (with ${f.name})\nEND:VEVENT`);
    }));
    if (!evs.length) { alert('No hangouts to export'); return; }
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//FriendshipCalendar//\n${evs.join('\n')}\nEND:VCALENDAR`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'friendships.ics'; a.click();
  }

  function exportGCal() {
    const f = friends.find(x => x.hangouts?.length);
    if (!f) { alert('No hangouts to export'); return; }
    const h = [...f.hangouts].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const d = h.date.replace(/-/g, '');
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(h.activity + ' with ' + f.name)}&dates=${d}/${d}`, '_blank');
  }

  return (
    <div className="view">
      <div className="page-title">Calendar</div>
      <div className="page-sub">Your hangouts, past and planned.</div>

      <div className="calendar-grid">
        <div className="calendar-nav">
          <button className="cal-nav-btn" onClick={() => changeMonth(-1)}>← Prev</button>
          <div className="cal-month">{monthLabel}</div>
          <button className="cal-nav-btn" onClick={() => changeMonth(1)}>Next →</button>
        </div>
        <div className="cal-days-header">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="cal-day-name">{d}</div>
          ))}
        </div>
        <div className="cal-days">
          {cells.map((cell, i) => (
            <div key={i} className={`cal-day${cell.isToday ? ' today' : ''}${cell.otherMonth ? ' other-month' : ''}`}>
              <div className="cal-day-num">{cell.day}</div>
              {(cell.events || []).slice(0, 2).map((e, j) => (
                <div key={j} className="cal-event" style={{ background: e.color || e.friend?.color }}>
                  {e.isEvent ? `${e.emoji} ${e.name}` : e.friend?.name?.split(' ')[0]}
                </div>
              ))}
              {(cell.events || []).length > 2 && (
                <div style={{ fontSize: '9.5px', color: 'var(--ink-muted)' }}>+{cell.events.length - 2}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="section-header"><div className="section-title">Export</div></div>
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={exportICS}>📅 Export .ics (Apple / Outlook)</button>
          <button className="btn btn-ghost" onClick={exportGCal}>🗓 Open in Google Calendar</button>
        </div>
        <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: 7 }}>Exports all logged hangouts as calendar events.</div>
      </div>
    </div>
  );
}
