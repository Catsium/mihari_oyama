/* Views: WeekGrid, DayList, Bento */

// ── shared block styling helpers ──
function blockStyle(person, entry) {
  const fg = person?.colour || '#1a1a1a';
  const bg = person?.background_colour || '#f0f0f0';
  return { '--bl-bg': bg, '--bl-ink': fg };
}

function matchesQuery(entry, q) {
  if (!q) return true;
  const s = q.toLowerCase();
  return (
    (entry.name || '').toLowerCase().includes(s) ||
    (entry.code_name || '').toLowerCase().includes(s) ||
    (entry.classroom || '').toLowerCase().includes(s)
  );
}

// ── WeekGrid ──
function WeekGrid({ person, entries, query, onBlockClick, onMoveEntry, density }) {
  const HOUR = density === 'compact' ? 46 : 60; // px per hour
  const DAY_START = 8 * 60;
  const DAY_END   = 19 * 60;
  const hours = [];
  for (let h = DAY_START; h <= DAY_END; h += 60) hours.push(h);
  const total = DAY_END - DAY_START;
  const today = todayIdx();

  const [draggingId, setDraggingId] = React.useState(null);
  const [dropHint, setDropHint] = React.useState(null); // {day, mins}
  const [nowState, setNowState] = React.useState(nowMins());

  React.useEffect(() => {
    const id = setInterval(() => setNowState(nowMins()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  // Group entries by day
  const byDay = [[], [], [], [], []];
  (entries || []).forEach((e, i) => {
    if (!e.day || e.day < 1 || e.day > 5) return;
    byDay[e.day - 1].push({ ...e, _i: i });
  });

  const mkPos = (e) => {
    const s = parseTime(e.start);
    const en = parseTime(e.end);
    const top = ((s - DAY_START) / 60) * HOUR;
    const h = ((en - s) / 60) * HOUR;
    return { top, h };
  };

  // Now line position
  const nowTop = ((nowState - DAY_START) / 60) * HOUR;
  const nowVisible = today >= 0 && nowState >= DAY_START && nowState <= DAY_END;

  const handleDragOver = (e, dayIdx) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const mins = DAY_START + Math.round((y / HOUR) * 2) * 30; // snap to 30
    setDropHint({ day: dayIdx + 1, mins });
  };
  const handleDrop = (e, dayIdx) => {
    e.preventDefault();
    const id = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (Number.isNaN(id) || !dropHint) return;
    onMoveEntry?.(id, dropHint.day, dropHint.mins);
    setDraggingId(null);
    setDropHint(null);
  };

  return (
    <div className={`wk ${draggingId != null ? 'is-dragging' : ''}`} style={{ '--hour': `${HOUR}px` }}>
      {/* Header row */}
      <div className="wk-cell wk-corner" />
      {DAY_NAMES.map((d, i) => {
        const date = new Date();
        const diff = i - (date.getDay() === 0 ? -1 : date.getDay() - 1);
        const dayDate = new Date(date); dayDate.setDate(date.getDate() + diff);
        return (
          <div key={d} className={`wk-cell wk-header ${today === i ? 'is-today' : ''}`}>
            <div className="day-name">{DAY_FULL[i]}</div>
            <div className="day-num">{dayDate.getDate()}</div>
          </div>
        );
      })}

      {/* Time labels column */}
      <div className="wk-cell" style={{ position: 'relative', minHeight: total / 60 * HOUR }}>
        {hours.map(h => (
          <div key={h} className="wk-time-label" style={{ position: 'absolute', right: 0, left: 0, top: ((h - DAY_START) / 60) * HOUR - 8 }}>
            {fmtTime(h)}
          </div>
        ))}
      </div>

      {/* Day tracks */}
      {DAY_NAMES.map((_, dayIdx) => (
        <div
          key={dayIdx}
          className="wk-cell wk-grid"
          style={{ minHeight: total / 60 * HOUR, position: 'relative' }}
          onDragOver={(e) => handleDragOver(e, dayIdx)}
          onDragLeave={() => setDropHint(null)}
          onDrop={(e) => handleDrop(e, dayIdx)}
        >
          {byDay[dayIdx].map((e) => {
            const pos = mkPos(e);
            const hidden = !matchesQuery(e, query);
            const micro = pos.h < 32;
            const short = pos.h < 64;
            return (
              <div
                key={e._i}
                className={[
                  'wk-block',
                  e.break ? 'is-break' : '',
                  e.online ? 'is-online' : '',
                  hidden ? 'dim' : '',
                  draggingId === e._i ? 'dragging' : '',
                  micro ? 'micro' : short ? 'short' : '',
                ].join(' ')}
                style={{ ...blockStyle(person, e), top: pos.top, height: pos.h - 2 }}
                draggable={!e.break}
                onDragStart={(ev) => {
                  ev.dataTransfer.setData('text/plain', String(e._i));
                  ev.dataTransfer.effectAllowed = 'move';
                  setDraggingId(e._i);
                }}
                onDragEnd={() => { setDraggingId(null); setDropHint(null); }}
                onClick={() => onBlockClick?.(e._i)}
                title={`${e.name || ''} · ${e.start}–${e.end}${e.classroom ? ' · ' + e.classroom : ''}`}
              >
                {e.code_name && !micro && <div className="bl-code">{e.code_name}</div>}
                <div className="bl-name">{e.name || (e.break ? 'Break' : 'Untitled')}</div>
                {!short && (
                  <div className="bl-meta mono">
                    <span>{e.start}–{e.end}</span>
                    {e.classroom && <><span className="dot" /><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.classroom}</span></>}
                    {e.online && <span className="bl-tag"><Icon name="online" /> Online</span>}
                  </div>
                )}
                {short && !micro && e.classroom && (
                  <div className="bl-meta mono" style={{ marginTop: 1 }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.classroom}</span>
                    {e.online && <span className="bl-tag"><Icon name="online" /></span>}
                  </div>
                )}
              </div>
            );
          })}

          {dropHint && dropHint.day === dayIdx + 1 && (
            <div className="drop-indicator" style={{ top: ((dropHint.mins - DAY_START) / 60) * HOUR }} />
          )}

          {today === dayIdx && nowVisible && (
            <div className="now-line" style={{ top: nowTop }}>
              <span className="now-label mono">{fmtTime(nowState)}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── DayList ──
function DayList({ person, entries, query, onBlockClick }) {
  const today = todayIdx();
  const byDay = [[], [], [], [], []];
  (entries || []).forEach((e, i) => {
    if (e.day >= 1 && e.day <= 5) byDay[e.day - 1].push({ ...e, _i: i });
  });
  byDay.forEach(arr => arr.sort((a, b) => parseTime(a.start) - parseTime(b.start)));

  const [nowState] = [nowMins()];

  return (
    <div className="dl">
      {DAY_NAMES.map((d, i) => {
        const rows = byDay[i];
        const dayMins = rows.filter(r => !r.break).reduce((acc, r) => acc + (parseTime(r.end) - parseTime(r.start)), 0);
        return (
          <div key={d} className={`dl-day ${today === i ? 'is-today' : ''}`}>
            <div className="dl-day-head">
              <div className="dl-day-name">
                {DAY_FULL[i]}
                {today === i && <span className="today-pill">Today</span>}
              </div>
              <div className="dl-day-meta mono">
                {rows.filter(r => !r.break).length} classes · {(dayMins / 60).toFixed(1)}h
              </div>
            </div>
            <div className="dl-rows">
              {!rows.length && <div className="dl-empty">Free day — go touch grass 🌿</div>}
              {rows.map(e => {
                const s = parseTime(e.start), en = parseTime(e.end);
                const isNow = today === i && nowState >= s && nowState < en;
                const dim = !matchesQuery(e, query);
                return (
                  <div
                    key={e._i}
                    className={`dl-row ${e.break ? 'is-break' : ''} ${isNow ? 'is-now' : ''}`}
                    onClick={() => onBlockClick?.(e._i)}
                    style={{ opacity: dim ? 0.3 : 1 }}
                  >
                    <div className="dl-row-time">
                      <span>{e.start}</span>
                      <span className="end">{e.end}</span>
                    </div>
                    <div className="dl-row-block" style={blockStyle(person, e)}>
                      {e.code_name && <div className="bl-code">{e.code_name}</div>}
                      <div className="bl-name">{e.name || (e.break ? 'Break' : 'Untitled')}</div>
                      <div className="bl-meta mono">
                        {e.classroom && <><Icon name="pin" style={{ width: 11, height: 11 }} /> {e.classroom}</>}
                        {e.online && <span className="bl-tag"><Icon name="online" /> Online</span>}
                        {isNow && <span className="bl-tag" style={{ background: 'var(--accent)', color: 'white' }}>● Live now</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Bento dashboard ──
function Bento({ person, entries, query, events, onBlockClick }) {
  const today = todayIdx();
  const n = nowMins();
  const sortedToday = (entries || [])
    .filter(e => e.day === today + 1)
    .map((e, i) => ({ ...e, _i: (entries || []).indexOf(e) }))
    .sort((a, b) => parseTime(a.start) - parseTime(b.start));

  const current = sortedToday.find(e => {
    const s = parseTime(e.start), en = parseTime(e.end);
    return n >= s && n < en;
  });
  const upcoming = sortedToday.filter(e => parseTime(e.start) > n);
  const next = upcoming[0];

  // Stats
  const classes = (entries || []).filter(e => !e.break);
  const totalHours = classes.reduce((acc, e) => acc + (parseTime(e.end) - parseTime(e.start)), 0) / 60;
  const onlineCount = classes.filter(e => e.online).length;
  const uniqueRooms = new Set(classes.map(e => e.classroom).filter(Boolean)).size;
  const uniqueSubjects = new Set(classes.map(e => e.code_name).filter(Boolean)).size;

  // Bars
  const perDay = [0, 0, 0, 0, 0];
  classes.forEach(e => {
    if (e.day >= 1 && e.day <= 5) perDay[e.day - 1] += (parseTime(e.end) - parseTime(e.start)) / 60;
  });
  const maxH = Math.max(...perDay, 1);

  // Current block progress
  const progress = current ? ((n - parseTime(current.start)) / (parseTime(current.end) - parseTime(current.start))) * 100 : 0;

  return (
    <div className="bento">
      <div className="bento-row">
        {/* Now */}
        <div className="bento-card bento-now">
          <div className="bento-card-title"><Icon name="play" /> Right now</div>
          {current ? (
            <div className="bn-now-block" style={blockStyle(person, current)} onClick={() => onBlockClick?.(current._i)}>
              <div className="code mono">{current.code_name}</div>
              <div className="name">{current.name || 'Break'}</div>
              <div className="row mono">
                <span>{current.start}–{current.end}</span>
                {current.classroom && <span>· {current.classroom}</span>}
                {current.online && <span>· Online</span>}
              </div>
              <div className="bn-progress"><i style={{ width: progress + '%' }} /></div>
              <div className="bn-progress-meta">
                <span>{fmtTime(n)} now</span>
                <span>{Math.max(0, parseTime(current.end) - n)} min left</span>
              </div>
            </div>
          ) : (
            <>
              <div className="bn-big">{today < 0 ? 'Weekend' : 'Nothing right now'}</div>
              <div className="bn-sub">{today < 0 ? 'Enjoy the rest. 🌅' : next ? `Up next at ${next.start}` : 'No more classes today.'}</div>
            </>
          )}
        </div>

        <div className="bento-col">
          {/* Up next */}
          <div className="bento-card bento-next">
            <div className="bento-card-title"><Icon name="clock" /> Up next today</div>
            {upcoming.length ? (
              <div className="bn-list">
                {upcoming.slice(0, 4).map(e => (
                  <div key={e._i} className="bn-list-item" onClick={() => onBlockClick?.(e._i)}>
                    <div className="swatch" style={{ background: person?.colour }} />
                    <div className="body">
                      <div className="nm">{e.name || 'Break'}</div>
                      <div className="mt">{e.start}–{e.end}{e.classroom ? ` · ${e.classroom}` : ''}</div>
                    </div>
                    {e.online && <span className="bl-tag" style={{ background: 'var(--paper-3)', color: 'var(--ink-3)' }}><Icon name="online" /></span>}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 12, color: 'var(--ink-3)', fontSize: 13 }}>
                {today < 0 ? 'See you Monday.' : 'No more classes today 🎉'}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="bento-card bento-stats">
            <div className="bento-card-title"><Icon name="chart" /> Week at a glance</div>
            <div className="bn-stats-grid">
              <div className="bn-stat"><div className="num">{totalHours.toFixed(1)}<span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}> h</span></div><div className="lbl">Contact hours</div></div>
              <div className="bn-stat"><div className="num">{uniqueSubjects}</div><div className="lbl">Subjects</div></div>
              <div className="bn-stat"><div className="num">{uniqueRooms}</div><div className="lbl">Rooms</div></div>
              <div className="bn-stat"><div className="num">{onlineCount}</div><div className="lbl">Online</div></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bento-row">
        {/* Today's full schedule */}
        <div className="bento-card bento-today">
          <div className="bento-card-title"><Icon name="calendar" /> {today < 0 ? 'Monday plan' : "Today's full plan"}</div>
          <div className="bn-list" style={{ overflow: 'auto', maxHeight: 320 }}>
            {(today < 0 ? (entries || []).filter(e => e.day === 1) : sortedToday).map((e, idx) => {
              const isNow = current && current._i === e._i;
              return (
                <div key={idx} className="bn-list-item" onClick={() => onBlockClick?.(e._i)} style={isNow ? { background: 'var(--accent-soft)' } : {}}>
                  <div className="swatch" style={{ background: e.break ? 'var(--ink-4)' : person?.colour }} />
                  <div className="body">
                    <div className="nm">{e.name || 'Break'}</div>
                    <div className="mt">{e.start}–{e.end}{e.classroom ? ` · ${e.classroom}` : ''}</div>
                  </div>
                  {isNow && <span className="bl-tag" style={{ background: 'var(--accent)', color: 'white' }}>Now</span>}
                </div>
              );
            })}
            {!sortedToday.length && today >= 0 && <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Free day. 🌿</div>}
          </div>
        </div>

        {/* Weekly hours bar chart */}
        <div className="bento-card bento-week">
          <div className="bento-card-title"><Icon name="chart" /> Hours by day</div>
          <div className="bn-bars" style={{ marginTop: 18 }}>
            {perDay.map((h, i) => (
              <div key={i} className={`bn-bar ${today === i ? 'is-today' : ''}`}>
                <div className="bn-bar-track">
                  <div className="bn-bar-fill" data-h={h.toFixed(1) + 'h'} style={{
                    height: `${maxH > 0 ? (h / maxH) * 100 : 0}%`,
                    minHeight: h > 0 ? 4 : 0,
                    background: today === i ? person?.colour : person?.background_colour,
                    opacity: h === 0 ? 0.3 : 1,
                  }} />
                </div>
                <div className="bn-bar-label">{DAY_NAMES[i]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Events */}
      <div className="bento-card bento-events">
        <div className="bento-card-title"><Icon name="sparkle" /> Upcoming events</div>
        {events && events.length ? (
          <div className="bn-list">
            {[...events].sort((a,b)=>(a.date||'').localeCompare(b.date||'')).slice(0, 4).map((ev, i) => (
              <div key={i} className="bn-list-item">
                <div className="swatch" style={{ background: ev.colour }} />
                <div className="body">
                  <div className="nm">{ev.title}</div>
                  <div className="mt">{ev.date ? new Date(ev.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}{ev.time ? ` · ${ev.time}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 12, color: 'var(--ink-3)', fontSize: 13 }}>No events yet. Click <strong>+ Event</strong> to add one.</div>
        )}
      </div>
    </div>
  );
}

// ── Comparison view ──
function CompareView({ people, query, density }) {
  const HOUR = density === 'compact' ? 46 : 60;
  const DAY_START = 8 * 60;
  const DAY_END   = 19 * 60;
  const hours = [];
  for (let h = DAY_START; h <= DAY_END; h += 60) hours.push(h);
  const total = DAY_END - DAY_START;
  const today = todayIdx();
  const [nowState, setNowState] = React.useState(nowMins());
  React.useEffect(() => {
    const id = setInterval(() => setNowState(nowMins()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const N = people.length;
  const ROW = HOUR;          // height of one person's lane within an hour
  const HBR = ROW * N;       // total height of one hour bracket
  const totalH = (total / 60) * HBR;
  const nowHourIdx = Math.floor((nowState - DAY_START) / 60);
  const nowOffsetInHour = ((nowState - DAY_START) % 60) / 60 * ROW;
  const nowTop = nowHourIdx * HBR + nowOffsetInHour;
  const nowVisible = today >= 0 && nowState >= DAY_START && nowState <= DAY_END;

  // Split an entry into per-hour segments so each chunk sits in its person's lane
  const segmentEntry = (e, pi) => {
    const sMin = parseTime(e.start);
    const eMin = parseTime(e.end);
    const segs = [];
    let cur = sMin;
    while (cur < eMin) {
      const hourIdx = Math.floor((cur - DAY_START) / 60);
      const hourBoundary = DAY_START + (hourIdx + 1) * 60;
      const segEnd = Math.min(eMin, hourBoundary);
      const offsetInHour = ((cur - DAY_START) - hourIdx * 60) / 60 * ROW;
      const top = hourIdx * HBR + pi * ROW + offsetInHour;
      const height = ((segEnd - cur) / 60) * ROW;
      segs.push({
        top, height,
        isFirst: cur === sMin,
        isLast: segEnd === eMin,
      });
      cur = segEnd;
    }
    return segs;
  };

  return (
    <div className="wk cmp" style={{ '--hour': `${HBR}px`, '--row': `${ROW}px` }}>
      <div className="wk-cell wk-corner" />
      {DAY_NAMES.map((d, i) => {
        const date = new Date();
        const diff = i - (date.getDay() === 0 ? -1 : date.getDay() - 1);
        const dayDate = new Date(date); dayDate.setDate(date.getDate() + diff);
        return (
          <div key={d} className={`wk-cell wk-header ${today === i ? 'is-today' : ''}`}>
            <div className="day-name">{DAY_FULL[i]}</div>
            <div className="day-num">{dayDate.getDate()}</div>
            <div className="cmp-headers">
              {people.map(([name, p]) => (
                <div key={name} className="cmp-head-chip" title={name}
                     style={{ background: p.background_colour, color: p.colour }}>
                  {initials(name)}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Single time column — hour labels at each hour bracket, person row labels on the right */}
      <div className="wk-cell cmp-time-col" style={{ position: 'relative', minHeight: totalH, padding: 0 }}>
        {hours.map(h => {
          const hi = Math.floor((h - DAY_START) / 60);
          return (
            <div key={h} className="wk-time-label cmp-hour-label" style={{ position: 'absolute', right: 0, left: 0, top: hi * HBR - 8 }}>
              {fmtTime(h)}
            </div>
          );
        })}
      </div>

      {/* Day tracks — each hour stretched to N × ROW; blocks stack vertically within each hour bracket */}
      {DAY_NAMES.map((_, dayIdx) => (
        <div key={dayIdx} className="wk-cell wk-grid cmp-grid" style={{ minHeight: totalH, position: 'relative', padding: 0 }}>
          {/* Person-row dividers inside each hour bracket */}
          {hours.slice(0, -1).flatMap((h, hi) =>
            people.slice(1).map((_, sub) => (
              <div key={`d-${hi}-${sub}`} className="cmp-sub-divider" style={{ position: 'absolute', left: 0, right: 0, top: hi * HBR + (sub + 1) * ROW, height: 1 }} />
            ))
          )}

          {people.map(([name, p], pi) => {
            const entries = (p.timetable || []).filter(e => e.day === dayIdx + 1);
            return entries.flatMap((e, ei) =>
              segmentEntry(e, pi).map((seg, si) => {
                const micro = seg.height < 32;
                const short = seg.height < 64;
                const hidden = !matchesQuery(e, query);
                return (
                  <div
                    key={pi + ':' + ei + ':' + si}
                    className={[
                      'wk-block cmp-block',
                      e.break ? 'is-break' : '',
                      e.online ? 'is-online' : '',
                      hidden ? 'dim' : '',
                      micro ? 'micro' : short ? 'short' : '',
                    ].join(' ')}
                    style={{
                      '--bl-bg': p.background_colour,
                      '--bl-ink': p.colour,
                      top: seg.top + 1, height: seg.height - 2,
                      left: 4, right: 4,
                      position: 'absolute',
                    }}
                    title={`${name} · ${e.name || ''} · ${e.start}–${e.end}${e.classroom ? ' · ' + e.classroom : ''}`}
                  >
                    {!micro && (
                      <div className="bl-code cmp-owner-line">
                        <span className="cmp-owner-name">{name}</span>
                        {e.code_name && <><span className="cmp-owner-sep"> · </span>{e.code_name}</>}
                      </div>
                    )}
                    <div className="bl-name">{e.name || (e.break ? 'Break' : 'Untitled')}</div>
                    {!short && e.classroom && (
                      <div className="bl-meta mono">
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.classroom}</span>
                        {e.online && <span className="bl-tag"><Icon name="online" /></span>}
                      </div>
                    )}
                  </div>
                );
              })
            );
          })}

          {today === dayIdx && nowVisible && (
            <div className="now-line" style={{ top: nowTop }}>
              <span className="now-label mono">{fmtTime(nowState)}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { WeekGrid, DayList, Bento, CompareView });
