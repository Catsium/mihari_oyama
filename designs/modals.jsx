/* Modals: BlockDetail, EditPerson (also add), Events */

function Modal({ title, onClose, children, wide, footer }) {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  return ReactDOM.createPortal(
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={`modal ${wide ? 'wide' : ''}`}>
        {title && (
          <div className="modal-head">
            <div className="modal-title">{title}</div>
            <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

// ── Block detail ──
function BlockDetail({ entry, person, onClose, onEdit, onDelete }) {
  if (!entry) return null;
  const s = parseTime(entry.start), en = parseTime(entry.end);
  const dur = en - s;
  const today = todayIdx();
  const isToday = today === entry.day - 1;
  return (
    <Modal onClose={onClose}>
      <div className="detail-hero" style={{ '--bl-bg': person.background_colour, '--bl-ink': person.colour, marginTop: -22, marginLeft: -22, marginRight: -22, marginBottom: 16, borderRadius: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div className="detail-code mono">{entry.code_name || (entry.break ? 'BREAK' : 'CLASS')}</div>
            <div className="detail-name">{entry.name || (entry.break ? 'Break' : 'Untitled')}</div>
          </div>
          <button className="icon-btn" style={{ color: 'inherit' }} onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="detail-row">
          <div className="detail-chip"><Icon name="calendar" /> {DAY_FULL[entry.day - 1]}{isToday ? ' · Today' : ''}</div>
          <div className="detail-chip"><Icon name="clock" /> {fmtTime12(s)} – {fmtTime12(en)}</div>
          <div className="detail-chip">{(dur / 60).toFixed(1)} h</div>
          {entry.classroom && <div className="detail-chip"><Icon name="pin" /> {entry.classroom}</div>}
          {entry.online && <div className="detail-chip"><Icon name="online" /> Online</div>}
          {entry.break && <div className="detail-chip"><Icon name="coffee" /> Break</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="bn-stat"><div className="num">{(dur / 60).toFixed(1)}<span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}> h</span></div><div className="lbl">Duration</div></div>
        <div className="bn-stat"><div className="num">{entry.start}</div><div className="lbl">Starts at</div></div>
      </div>

      <div style={{ marginTop: 18, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
        {entry.break
          ? 'Take a break, grab a coffee or lunch. 🍽'
          : entry.online
            ? `This class is delivered online via e-learning. Connect from anywhere with a stable connection.`
            : `${person.code || 'Class'} at ${entry.classroom || 'TBA'}. Remember to bring your laptop and charger.`}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 22, justifyContent: 'flex-end' }}>
        {onDelete && <button className="tb-btn" onClick={onDelete} style={{ color: 'oklch(0.55 0.18 25)' }}><Icon name="trash" /> Delete</button>}
        <button className="tb-btn" onClick={onEdit}><Icon name="edit" /> Edit person</button>
        <button className="tb-btn primary" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

// ── Edit / Add person ──

// Curated palette of paired colours (foreground / background)
const COLOR_PRESETS = [
  { fg: '#10579D', bg: '#F7DBE5', name: 'Catsium' },
  { fg: '#351E04', bg: '#D3A2F5', name: 'Dom' },
  { fg: '#0E4B3F', bg: '#A8E6CF', name: 'Mint' },
  { fg: '#5A1F1F', bg: '#FFB3B3', name: 'Coral' },
  { fg: '#3A1F5C', bg: '#C8B6FF', name: 'Lilac' },
  { fg: '#4A3000', bg: '#FFD79B', name: 'Amber' },
  { fg: '#003B5C', bg: '#A5D8FF', name: 'Sky' },
  { fg: '#5C1B45', bg: '#FFB3D9', name: 'Rose' },
  { fg: '#1A1A1A', bg: '#E8E8E8', name: 'Stone' },
  { fg: '#2D5016', bg: '#C7E59E', name: 'Olive' },
];

function ColorPicker({ fg, bg, onChange }) {
  const [showCustom, setShowCustom] = React.useState(false);
  const matchedPreset = COLOR_PRESETS.findIndex(p => p.fg.toLowerCase() === fg.toLowerCase() && p.bg.toLowerCase() === bg.toLowerCase());
  return (
    <div className="color-picker">
      <div className="color-swatches">
        {COLOR_PRESETS.map((p, i) => (
          <button
            key={i}
            type="button"
            className={`color-swatch ${matchedPreset === i ? 'is-active' : ''}`}
            onClick={() => onChange(p.fg, p.bg)}
            style={{ background: p.bg, color: p.fg }}
            title={p.name}
          >
            <span className="color-swatch-glyph">Aa</span>
          </button>
        ))}
        <button
          type="button"
          className={`color-swatch color-swatch-custom ${matchedPreset === -1 ? 'is-active' : ''}`}
          onClick={() => setShowCustom(s => !s)}
          title="Custom colours"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>
        </button>
      </div>
      {(showCustom || matchedPreset === -1) && (
        <div className="color-custom">
          <label className="color-custom-row">
            <span>Text</span>
            <input type="color" value={fg} onChange={(e) => onChange(e.target.value, bg)} />
            <code className="mono">{fg.toUpperCase()}</code>
          </label>
          <label className="color-custom-row">
            <span>Background</span>
            <input type="color" value={bg} onChange={(e) => onChange(fg, e.target.value)} />
            <code className="mono">{bg.toUpperCase()}</code>
          </label>
        </div>
      )}
    </div>
  );
}

function DayPicker({ value, onChange }) {
  return (
    <div className="day-picker">
      {DAY_NAMES.map((d, i) => (
        <button
          key={d}
          type="button"
          className={`day-pill ${value === i + 1 ? 'is-active' : ''}`}
          onClick={() => onChange(i + 1)}
        >
          {d.slice(0, 1)}
        </button>
      ))}
    </div>
  );
}

function EditPerson({ mode, originalName, person, allUsernames, onClose, onSave, onDelete, onSwitchPerson }) {
  const [name, setName] = React.useState(originalName || '');
  const [code, setCode] = React.useState(person?.code || '');
  const [fg, setFg]     = React.useState(person?.colour || '#0C447C');
  const [bg, setBg]     = React.useState(person?.background_colour || '#E6F1FB');
  const [entries, setEntries] = React.useState(person?.timetable || []);
  const [err, setErr]   = React.useState('');

  const update = (i, field, value) => {
    setEntries(prev => {
      const next = [...prev];
      if (field === 'break' || field === 'online') {
        if (value) next[i] = { ...next[i], [field]: true };
        else { const c = { ...next[i] }; delete c[field]; next[i] = c; }
      } else {
        next[i] = { ...next[i], [field]: value };
      }
      return next;
    });
  };

  const [editingIdx, setEditingIdx] = React.useState(null);

  const addToDay = (day) => {
    setEntries(prev => {
      const next = [...prev, { day, start: '9.00', end: '10.00', code_name: '', name: '', classroom: '' }];
      // Open the editor for the freshly-added entry
      Promise.resolve().then(() => setEditingIdx(next.length - 1));
      return next;
    });
  };
  const delRow = (i) => {
    setEntries(prev => prev.filter((_, k) => k !== i));
    setEditingIdx(curr => (curr === i ? null : curr != null && curr > i ? curr - 1 : curr));
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) { setErr('Name is required'); return; }
    if (mode === 'add' && allUsernames.includes(trimmed)) { setErr('That name already exists'); return; }
    if (mode === 'edit' && trimmed !== originalName && allUsernames.includes(trimmed)) { setErr('That name already exists'); return; }
    onSave({
      originalName,
      newName: trimmed,
      person: { colour: fg, background_colour: bg, code, timetable: entries },
    });
  };

  // Group entries by day for the visual list
  const entriesByDay = React.useMemo(() => {
    const groups = [[], [], [], [], []];
    entries.forEach((e, idx) => {
      if (e.day >= 1 && e.day <= 5) groups[e.day - 1].push({ ...e, _idx: idx });
    });
    groups.forEach(g => g.sort((a, b) => parseTime(a.start) - parseTime(b.start)));
    return groups;
  }, [entries]);

  const title = mode === 'add' ? (<><Icon name="plus" /> New person</>) : (<><Icon name="edit" /> Edit schedule</>);
  const initialsForPreview = (name || 'A').trim().split(/\s+/).map(s => s[0] || '').join('').slice(0, 2).toUpperCase() || 'A';

  return (
    <Modal title={title} onClose={onClose} wide
      footer={
        <>
          {mode === 'edit' && onDelete && (
            <button className="tb-btn ghost-danger" onClick={onDelete}>
              <Icon name="trash" /> Remove person
            </button>
          )}
          {err && <span className="form-err">{err}</span>}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="tb-btn" onClick={onClose}>Cancel</button>
            <button className="tb-btn primary" onClick={submit}>Save changes</button>
          </div>
        </>
      }
    >
      <div className="edit-person-grid">
        {/* Identity card */}
        <section className="ep-card ep-identity">
          {mode === 'edit' && allUsernames.length > 1 && (
            <div className="ep-switcher">
              <span className="ep-switcher-label">Editing</span>
              <select className="ep-switcher-select" value={originalName} onChange={(e) => onSwitchPerson?.(e.target.value)}>
                {allUsernames.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}

          <div className="ep-preview" style={{ '--bl-bg': bg, '--bl-ink': fg }}>
            <div className="ep-preview-avatar">{initialsForPreview}</div>
            <div>
              <div className="ep-preview-name">{name || 'Untitled person'}</div>
              <div className="ep-preview-code">{code || 'No course set'}</div>
            </div>
            <div className="ep-preview-block">
              <div className="bl-code mono">SAMPLE</div>
              <div className="bl-name">Example class block</div>
              <div className="bl-meta mono">9.00–10.00 · R.101</div>
            </div>
          </div>

          <div className="ep-field">
            <label className="ep-field-label">Display name</label>
            <input className="field-input" value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} placeholder="e.g. Alex Chen" />
          </div>

          <div className="ep-field">
            <label className="ep-field-label">Course / programme</label>
            <input className="field-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. AI And Data" />
          </div>

          <div className="ep-field">
            <label className="ep-field-label">Colour</label>
            <ColorPicker fg={fg} bg={bg} onChange={(newFg, newBg) => { setFg(newFg); setBg(newBg); }} />
          </div>
        </section>

        {/* Entries panel */}
        <section className="ep-card ep-entries">
          <header className="ep-entries-head">
            <div>
              <div className="ep-entries-title">Schedule</div>
              <div className="ep-entries-sub">{entries.length} {entries.length === 1 ? 'entry' : 'entries'} across the week</div>
            </div>
          </header>

          <div className="ep-day-cols">
            {DAY_NAMES.map((d, di) => (
              <div key={d} className="ep-day-col">
                <div className="ep-day-col-head">
                  <span className="ep-day-name">{DAY_FULL[di]}</span>
                  <span className="ep-day-count mono">{entriesByDay[di].length}</span>
                </div>
                <div className="ep-day-list">
                  {entriesByDay[di].map(e => (
                    <EntryCard
                      key={e._idx}
                      entry={e}
                      fg={fg}
                      bg={bg}
                      onClick={() => setEditingIdx(e._idx)}
                    />
                  ))}
                  <button
                    type="button"
                    className="ep-add-to-day"
                    onClick={() => addToDay(di + 1)}
                    aria-label={`Add to ${DAY_FULL[di]}`}
                  >
                    <Icon name="plus" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {editingIdx != null && entries[editingIdx] && (
            <EntryEditor
              entry={entries[editingIdx]}
              idx={editingIdx}
              fg={fg}
              bg={bg}
              onUpdate={update}
              onDelete={() => delRow(editingIdx)}
              onClose={() => setEditingIdx(null)}
            />
          )}
        </section>
      </div>
    </Modal>
  );
}

function EntryCard({ entry: e, fg, bg, onClick }) {
  const breakStyle = e.break;
  return (
    <button
      type="button"
      className={`ep-entry-card ${breakStyle ? 'is-break' : ''} ${e.online ? 'is-online' : ''}`}
      style={breakStyle ? {} : { '--bl-bg': bg, '--bl-ink': fg }}
      onClick={onClick}
      title={e.name || e.code_name || (breakStyle ? 'Break' : 'Untitled')}
    >
      <div className="ep-entry-code mono">
        {e.code_name || (breakStyle ? 'BREAK' : '—')}
      </div>
      <div className="ep-entry-times mono">
        <span>{e.start || '—'}</span>
        <span className="dash" aria-hidden="true">→</span>
        <span>{e.end || '—'}</span>
      </div>
    </button>
  );
}

function EntryEditor({ entry: e, idx, fg, bg, onUpdate, onDelete, onClose }) {
  React.useEffect(() => {
    const onKey = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const breakStyle = e.break;
  return (
    <div
      className="ep-editor-backdrop"
      onClick={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}
    >
      <div
        className={`ep-editor-panel ${breakStyle ? 'is-break' : ''}`}
        style={breakStyle ? {} : { '--bl-bg': bg, '--bl-ink': fg }}
        role="dialog"
        aria-label="Edit class"
      >
        <div className="ep-editor-head">
          <div className="ep-editor-head-meta">
            <div className="ep-editor-code mono">{e.code_name || (breakStyle ? 'BREAK' : 'NEW')}</div>
            <div className="ep-editor-title">{e.name || (breakStyle ? 'Break' : 'Untitled class')}</div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close editor">
            <Icon name="x" />
          </button>
        </div>
        <div className="ep-editor-body">
          <label className="ep-detail-field">
            <span>Subject</span>
            <input
              className="field-input"
              autoFocus
              value={e.name || ''}
              onChange={(ev) => onUpdate(idx, 'name', ev.target.value)}
              placeholder="e.g. Applied Machine Learning"
            />
          </label>
          <div className="ep-detail-row two-col">
            <label className="ep-detail-field">
              <span>Code</span>
              <input className="field-input mono" value={e.code_name || ''} onChange={(ev) => onUpdate(idx, 'code_name', ev.target.value)} placeholder="AML" />
            </label>
            <label className="ep-detail-field">
              <span>Room</span>
              <input className="field-input" value={e.classroom || ''} onChange={(ev) => onUpdate(idx, 'classroom', ev.target.value)} placeholder="S.310 SEG" />
            </label>
          </div>
          <div className="ep-detail-row two-col">
            <label className="ep-detail-field">
              <span>Start</span>
              <input className="field-input mono" value={e.start || ''} onChange={(ev) => onUpdate(idx, 'start', ev.target.value)} placeholder="9.00" />
            </label>
            <label className="ep-detail-field">
              <span>End</span>
              <input className="field-input mono" value={e.end || ''} onChange={(ev) => onUpdate(idx, 'end', ev.target.value)} placeholder="10.00" />
            </label>
          </div>
          <div className="ep-detail-row">
            <span className="ep-detail-field-label">Day</span>
            <DayPicker value={e.day} onChange={(v) => onUpdate(idx, 'day', v)} />
          </div>
          <div className="ep-detail-row ep-detail-flags">
            <label className="ep-flag-toggle">
              <input type="checkbox" checked={!!e.break} onChange={(ev) => onUpdate(idx, 'break', ev.target.checked)} />
              <span><Icon name="coffee" /> Break / lunch</span>
            </label>
            <label className="ep-flag-toggle">
              <input type="checkbox" checked={!!e.online} onChange={(ev) => onUpdate(idx, 'online', ev.target.checked)} />
              <span><Icon name="online" /> Online</span>
            </label>
          </div>
        </div>
        <div className="ep-editor-foot">
          <button type="button" className="ep-entry-delete" onClick={() => { onDelete(); onClose(); }}>
            <Icon name="trash" /> Delete
          </button>
          <button type="button" className="tb-btn primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ── Events modal ──
function EventsModal({ events, onClose, onAdd, onDelete }) {
  const [title, setTitle]   = React.useState('');
  const [date, setDate]     = React.useState('');
  const [time, setTime]     = React.useState('');
  const [colour, setColour] = React.useState('#3b82f6');
  const [note, setNote]     = React.useState('');

  const submit = () => {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), date, time, colour, note: note.trim() });
    setTitle(''); setDate(''); setTime(''); setNote('');
  };

  const sorted = [...(events || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const grouped = React.useMemo(() => {
    const today0 = new Date(); today0.setHours(0,0,0,0);
    const upcoming = [];
    const past = [];
    sorted.forEach(ev => {
      const d = ev.date ? new Date(ev.date + 'T00:00:00') : null;
      if (!d || d >= today0) upcoming.push(ev);
      else past.push(ev);
    });
    return { upcoming, past };
  }, [sorted]);

  const PRESET_COLOURS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6b7280'];

  return (
    <Modal title={<><Icon name="sparkle" /> Events</>} onClose={onClose} wide
      footer={
        <>
          <span className="events-count">{(events || []).length} total · {grouped.upcoming.length} upcoming</span>
          <button className="tb-btn primary" style={{ marginLeft: 'auto' }} onClick={onClose}>Done</button>
        </>
      }
    >
      <div className="events-layout">
        {/* Add form */}
        <section className="events-add">
          <div className="events-add-head">
            <Icon name="plus" />
            <span>New event</span>
          </div>
          <div className="events-add-body">
            <input
              className="events-add-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) submit(); }}
              placeholder="What's happening?" />
            <div className="events-add-meta">
              <label className="events-add-field">
                <Icon name="calendar" />
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className="events-add-field">
                <Icon name="clock" />
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} placeholder="time" />
              </label>
            </div>
            <input className="events-add-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (optional)…" />
            <div className="events-add-colours">
              <span className="events-add-colour-label">Tag</span>
              <div className="events-add-colour-swatches">
                {PRESET_COLOURS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`events-colour-dot ${colour === c ? 'is-active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setColour(c)}
                    aria-label={c}
                  />
                ))}
              </div>
              <button className="tb-btn primary events-add-submit" onClick={submit} disabled={!title.trim()}>
                <Icon name="plus" /> Add
              </button>
            </div>
          </div>
        </section>

        {/* List */}
        <section className="events-list">
          {sorted.length === 0 && (
            <div className="events-empty">
              <Icon name="sparkle" />
              <div>No events yet. Add your first above.</div>
            </div>
          )}
          {grouped.upcoming.length > 0 && (
            <>
              <h4 className="events-section-label">Upcoming</h4>
              {grouped.upcoming.map((ev, i) => (
                <EventCard key={'u' + i} event={ev} onDelete={() => onDelete((events || []).indexOf(ev))} />
              ))}
            </>
          )}
          {grouped.past.length > 0 && (
            <>
              <h4 className="events-section-label">Past</h4>
              {grouped.past.map((ev, i) => (
                <EventCard key={'p' + i} event={ev} faded onDelete={() => onDelete((events || []).indexOf(ev))} />
              ))}
            </>
          )}
        </section>
      </div>
    </Modal>
  );
}

function EventCard({ event: ev, faded, onDelete }) {
  const dt = ev.date ? new Date(ev.date + 'T00:00:00') : null;
  const day = dt ? dt.getDate() : '—';
  const monthShort = dt ? dt.toLocaleDateString('en-GB', { month: 'short' }) : '';
  const weekday = dt ? dt.toLocaleDateString('en-GB', { weekday: 'short' }) : '';
  return (
    <div className={`ev-card ${faded ? 'is-faded' : ''}`} style={{ '--ev-c': ev.colour }}>
      <div className="ev-date">
        <div className="ev-date-month mono">{monthShort.toUpperCase()}</div>
        <div className="ev-date-day">{day}</div>
        <div className="ev-date-weekday mono">{weekday}</div>
      </div>
      <div className="ev-body">
        <div className="ev-title">{ev.title}</div>
        <div className="ev-meta mono">
          {dt ? dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No date'}
          {ev.time && <> · {ev.time}</>}
        </div>
        {ev.note && <div className="ev-note">{ev.note}</div>}
      </div>
      <button className="ev-delete" onClick={onDelete} aria-label="Delete event"><Icon name="trash" /></button>
    </div>
  );
}

Object.assign(window, { Modal, BlockDetail, EditPerson, EventsModal });
