'use client';
import { useState, useMemo } from 'react';
import { fmtDT } from '../lib/data';

export default function Calendar({ friends, events }) {
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(null); // { type: 'hangout'|'event', data }

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

    const hmap = {};
    friends.forEach(f => (f.hangouts || []).forEach(h => {
      const d = new Date(h.date + 'T12:00:00');
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const k = d.getDate();
        if (!hmap[k]) hmap[k] = [];
        hmap[k].push({ type: 'hangout', friend: f, activity: h.activity, date: h.date });
      }
    }));
    events.forEach(ev => {
      (ev.dates || []).forEach(dt => {
        const d = new Date(dt);
        if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
          const k = d.getDate();
          if (!hmap[k]) hmap[k] = [];
          hmap[k].push({ type: 'event', event: ev, dt });
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

  function fmtDate(dateStr) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
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
                <div
                  key={j}
                  className="cal-event"
                  style={{ background: e.type === 'event' ? 'var(--plum)' : e.friend?.color, cursor: 'pointer' }}
                  onClick={() => setSelected(e)}
                >
                  {e.type === 'event' ? `${e.event.emoji || '•'} ${e.event.name}` : e.friend?.name?.split(' ')[0]}
                </div>
              ))}
              {(cell.events || []).length > 2 && (
                <div
                  style={{ fontSize: '9.5px', color: 'var(--ink-muted)', cursor: 'pointer' }}
                  onClick={() => setSelected({ type: 'overflow', items: cell.events, day: cell.day })}
                >
                  +{cell.events.length - 2} more
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="section-header"><div className="section-title">Export</div></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost" onClick={exportICS}>Export .ics (Apple / Outlook)</button>
          <button type="button" className="btn btn-ghost" onClick={exportGCal}>Open in Google Calendar</button>
        </div>
        <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: 7 }}>Exports all logged hangouts as calendar events.</div>
      </div>

      {/* DETAIL SHEET */}
      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
          onClick={() => setSelected(null)}
        >
          {/* Backdrop */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(12,12,15,0.45)', backdropFilter: 'blur(4px)' }} />

          {/* Sheet */}
          <div
            style={{
              position: 'relative',
              background: 'var(--warm-white)',
              borderRadius: '20px 20px 0 0',
              padding: '20px 20px 36px',
              boxShadow: 'var(--shadow-lg)',
              maxHeight: '70vh',
              overflowY: 'auto',
              animation: 'slideUp 0.22s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--border-strong)', margin: '0 auto 18px' }} />

            {/* HANGOUT DETAIL */}
            {selected.type === 'hangout' && (() => {
              const { friend: f, activity, date } = selected;
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 600, color: 'white', flexShrink: 0 }}>
                      {f.name[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>{f.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>{fmtDate(date)}</div>
                    </div>
                  </div>
                  <div style={{ background: 'var(--plum-pale)', borderRadius: 12, padding: '12px 16px', marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--plum)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Activity</div>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>{activity}</div>
                  </div>
                  {f.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {f.tags.map(t => (
                        <span key={t} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: f.color + '22', color: f.color }}>{t}</span>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}

            {/* EVENT DETAIL */}
            {selected.type === 'event' && (() => {
              const { event: ev, dt } = selected;
              const invitees = (ev.invitees || []).map(id => friends.find(f => f.id === id)).filter(Boolean);
              const yes = Object.values(ev.rsvps || {}).filter(r => r === 'yes').length;
              const maybe = Object.values(ev.rsvps || {}).filter(r => r === 'maybe').length;
              const no = Object.values(ev.rsvps || {}).filter(r => r === 'no').length;
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--plum-pale)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      {ev.emoji || '•'}
                    </div>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>{ev.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>{fmtDT(dt)}</div>
                    </div>
                  </div>
                  {ev.desc && (
                    <div style={{ background: 'var(--plum-pale)', borderRadius: 12, padding: '12px 16px', marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--plum)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Details</div>
                      <div style={{ fontSize: 14, lineHeight: 1.5 }}>{ev.desc}</div>
                    </div>
                  )}
                  {invitees.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Attending</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {invitees.map(f => (
                          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>{f.name[0]}</div>
                            <span style={{ fontSize: 12, fontWeight: 500 }}>{f.name.split(' ')[0]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(yes + maybe + no) > 0 && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {yes > 0 && <div className="rsvp-chip">Yes {yes}</div>}
                      {maybe > 0 && <div className="rsvp-chip">Maybe {maybe}</div>}
                      {no > 0 && <div className="rsvp-chip">No {no}</div>}
                    </div>
                  )}
                </>
              );
            })()}

            {/* OVERFLOW: multiple items on a day */}
            {selected.type === 'overflow' && (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
                  {new Date(calYear, calMonth, selected.day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selected.items.map((e, i) => (
                    <div
                      key={i}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: 'var(--plum-pale)', cursor: 'pointer' }}
                      onClick={() => setSelected(e)}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: e.type === 'event' ? 'var(--plum)' : e.friend?.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: e.type === 'event' ? 16 : 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                        {e.type === 'event' ? (e.event.emoji || '•') : e.friend?.name[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{e.type === 'event' ? e.event.name : e.friend?.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{e.type === 'event' ? 'Event' : e.activity}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={() => setSelected(null)}
              style={{ position: 'absolute', top: 18, right: 18, background: 'var(--border)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 13, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
