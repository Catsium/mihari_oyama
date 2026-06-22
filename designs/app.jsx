/* Main App shell */

const VIEW_KEYS = ['week', 'day', 'bento'];
const VIEW_LABEL = { week: 'Week', day: 'Day', bento: 'Bento' };
const VIEW_ICON  = { week: 'grid', day: 'list', bento: 'bento' };

function App() {
  // Pull initial data once, copy so we can mutate
  const [users, setUsers]   = React.useState(() => JSON.parse(JSON.stringify(window.INITIAL_DATA.users)));
  const usernames           = Object.keys(users);
  const [selectedNames, setSelectedNames] = React.useState([usernames[0]]);
  const selected            = selectedNames[0];
  const person              = users[selected];
  const compareMode         = selectedNames.length > 1;
  const selectedPeople      = selectedNames.map(n => [n, users[n]]).filter(([, p]) => p);

  // Toggle a person — modifier adds/removes from selection set
  const togglePerson = (name, withModifier) => {
    setSelectedNames(prev => {
      if (!withModifier) return [name];
      if (prev.includes(name)) {
        const next = prev.filter(n => n !== name);
        return next.length ? next : [name];
      }
      return [...prev, name];
    });
  };
  const clearCompare = () => setSelectedNames([selected]);

  const [view, setView]         = React.useState('week');
  const [query, setQuery]       = React.useState('');
  const [dark, setDark]         = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [events, setEvents]     = React.useState([]);

  // Modals
  const [detailIdx, setDetailIdx] = React.useState(null);
  const [editing, setEditing]     = React.useState(null); // { mode: 'edit'|'add', name }
  const [eventsOpen, setEventsOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);

  // Tweaks
  const t = useTweaks(/*EDITMODE-BEGIN*/{
    "accentHue": 25,
    "density": "comfortable",
    "showFloatingNow": true,
    "blockStyle": "solid"
  }/*EDITMODE-END*/);

  // Apply theme + accent
  React.useEffect(() => {
    document.body.classList.toggle('dark', dark);
  }, [dark]);
  React.useEffect(() => {
    document.documentElement.style.setProperty('--accent', `oklch(0.62 0.18 ${t.accentHue})`);
    document.documentElement.style.setProperty('--accent-soft', `oklch(${dark ? 0.30 : 0.95} ${dark ? 0.06 : 0.04} ${t.accentHue})`);
  }, [t.accentHue, dark]);

  React.useEffect(() => {
    document.body.dataset.blockStyle = t.blockStyle;
    document.body.dataset.density    = t.density;
  }, [t.blockStyle, t.density]);

  // Sync view switch thumb position
  const switchRef = React.useRef(null);
  const [thumbStyle, setThumbStyle] = React.useState({});
  React.useEffect(() => {
    const el = switchRef.current?.querySelector('.view-switch-btn.active');
    if (el && switchRef.current) {
      setThumbStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [view]);

  // Search hotkey
  const searchRef = React.useRef(null);
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Update users helper (per-person mutations)
  const updateUserTimetable = (username, newTimetable) => {
    setUsers(prev => ({ ...prev, [username]: { ...prev[username], timetable: newTimetable } }));
  };

  // Drag-move handler from WeekGrid
  const onMoveEntry = (entryIdx, newDay, newStartMins) => {
    const tt = [...person.timetable];
    const e = { ...tt[entryIdx] };
    const dur = parseTime(e.end) - parseTime(e.start);
    e.day = newDay;
    e.start = fmtTime(newStartMins);
    e.end   = fmtTime(newStartMins + dur);
    tt[entryIdx] = e;
    updateUserTimetable(selected, tt);
  };

  // Edit / add person handlers
  const handleSavePerson = ({ originalName, newName, person: data }) => {
    setUsers(prev => {
      const next = { ...prev };
      if (originalName && originalName !== newName) delete next[originalName];
      next[newName] = { ...(prev[originalName] || {}), ...data };
      return next;
    });
    if (originalName === selected || !originalName) setSelectedNames([newName]);
    setEditing(null);
  };
  const handleDeletePerson = (username) => {
    if (Object.keys(users).length <= 1) { alert("Can't remove the last person."); return; }
    if (!confirm(`Remove ${username} from the timetable?`)) return;
    setUsers(prev => {
      const next = { ...prev };
      delete next[username];
      return next;
    });
    setSelectedNames([Object.keys(users).filter(u => u !== username)[0]]);
    setEditing(null);
  };

  // "Now" widget — scroll to current class
  const jumpToNow = () => {
    const today = todayIdx();
    const n = nowMins();
    const cur = person.timetable.find(e => {
      const s = parseTime(e.start), en = parseTime(e.end);
      return e.day === today + 1 && n >= s && n < en;
    });
    if (cur) setDetailIdx(person.timetable.indexOf(cur));
    else if (view !== 'bento') setView('bento');
  };

  // Current detail entry
  const detailEntry = detailIdx != null ? person.timetable[detailIdx] : null;

  // Export "screenshot" — print
  const handleExport = (kind) => {
    setExportOpen(false);
    if (kind === 'print') {
      window.print();
    } else if (kind === 'json') {
      const blob = new Blob([JSON.stringify({ users, events }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'timetable.json'; a.click();
    } else if (kind === 'ical') {
      // tiny ics emitter for the current person
      const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bento Timetable//EN'];
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      person.timetable.forEach(e => {
        if (e.break) return;
        const d = new Date(monday); d.setDate(monday.getDate() + (e.day - 1));
        const [sh, sm] = e.start.split('.').map(x => parseInt(x, 10));
        const [eh, em] = e.end.split('.').map(x => parseInt(x, 10));
        const ds = new Date(d); ds.setHours(sh, sm || 0, 0, 0);
        const de = new Date(d); de.setHours(eh, em || 0, 0, 0);
        const fmt = (dt) => dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        lines.push('BEGIN:VEVENT', `SUMMARY:${e.name || e.code_name}`, `LOCATION:${e.classroom || ''}`, `DTSTART:${fmt(ds)}`, `DTEND:${fmt(de)}`, 'END:VEVENT');
      });
      lines.push('END:VCALENDAR');
      const blob = new Blob([lines.join('\n')], { type: 'text/calendar' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `${selected}-timetable.ics`; a.click();
    }
  };

  const today = todayIdx();
  const n = nowMins();
  const currentNow = person.timetable.find(e => e.day === today + 1 && n >= parseTime(e.start) && n < parseTime(e.end));

  return (
    <div className={`app ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-head">
          <div className="brand">
            <div className="brand-dot" />
            <span className="brand-name">Timetable</span>
          </div>
          <button className="icon-btn" onClick={() => setCollapsed(c => !c)} style={{ width: 28, height: 28 }} aria-label="Toggle sidebar">
            <Icon name="sidebar" />
          </button>
        </div>

        <div className="sidebar-section-label">
          People
          {compareMode && <span style={{ float: 'right', color: 'var(--accent)', textTransform: 'none', letterSpacing: 0, fontSize: 10 }}>{selectedNames.length} compared</span>}
          {!compareMode && <span style={{ float: 'right', color: 'var(--ink-4)', textTransform: 'none', letterSpacing: 0, fontSize: 9.5, fontWeight: 500 }}>{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}-click to compare</span>}
        </div>
        <div className="person-list">
          {usernames.map(u => {
            const p = users[u];
            const inSel = selectedNames.includes(u);
            return (
              <div
                key={u}
                className={`person-chip ${u === selected ? 'active' : ''} ${inSel && u !== selected ? 'in-compare' : ''}`}
                onClick={(e) => togglePerson(u, e.metaKey || e.ctrlKey || e.shiftKey)}
                title={`${u} — ${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}-click to compare`}
              >
                <div className="avatar" style={{ background: p.background_colour, color: p.colour, '--avatar-ring': inSel ? p.colour : 'transparent' }}>
                  {initials(u)}
                </div>
                <div className="person-meta">
                  <div className="person-name">{u}</div>
                  <div className="person-code">{p.code || '—'}</div>
                </div>
              </div>
            );
          })}
          <button className="person-chip" onClick={() => setEditing({ mode: 'add' })} style={{ color: 'var(--ink-3)' }}>
            <div className="avatar" style={{ background: 'var(--paper-2)', border: '1px dashed var(--line-2)' }}>+</div>
            <div className="person-meta"><div className="person-name" style={{ fontWeight: 500 }}>Add person</div></div>
          </button>
        </div>

        <div className="sidebar-section-label">Quick</div>
        <button className="sidebar-btn" onClick={() => setEventsOpen(true)}><Icon name="sparkle" /><span>Events {events.length ? `· ${events.length}` : ''}</span></button>
        <button className="sidebar-btn" onClick={() => setEditing({ mode: 'edit', name: selected })}><Icon name="edit" /><span>Edit {selected}</span></button>

        <div className="sidebar-foot">
          <button className="sidebar-btn" onClick={() => setDark(d => !d)}>
            <Icon name={dark ? 'sun' : 'moon'} /><span>{dark ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main">
        <div className="toolbar">
          <div className="toolbar-title">
            {compareMode ? (
              <>
                <span>Comparing</span>
                <span className="cmp-banner">
                  {selectedNames.length} people
                  <button onClick={clearCompare} style={{ color: 'inherit', display: 'grid', placeItems: 'center', padding: 0, width: 14, height: 14, marginLeft: 2 }} aria-label="Clear">
                    <Icon name="x" style={{ width: 11, height: 11 }} />
                  </button>
                </span>
              </>
            ) : (
              <>
                <span>{selected}</span>
                <span className="pill">{person.code || ''}</span>
              </>
            )}
          </div>

          <div className="view-switch" ref={switchRef} style={{ marginLeft: 16 }}>
            <div className="view-switch-thumb" style={thumbStyle} />
            {VIEW_KEYS.map(k => (
              <button key={k} className={`view-switch-btn ${view === k ? 'active' : ''}`} onClick={() => setView(k)} disabled={compareMode && k !== 'week'} style={compareMode && k !== 'week' ? { opacity: 0.35, cursor: 'not-allowed' } : {}}>
                <Icon name={VIEW_ICON[k]} /> {VIEW_LABEL[k]}
              </button>
            ))}
          </div>

          <div className="search-box" style={{ marginLeft: 12 }}>
            <Icon name="search" />
            <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search subjects, rooms, codes…" />
            {!query && <kbd>/</kbd>}
            {query && <button className="icon-btn" style={{ width: 20, height: 20 }} onClick={() => setQuery('')}><Icon name="x" /></button>}
          </div>

          <div className="tb-right">
            <div style={{ position: 'relative' }}>
              <button className="tb-btn" onClick={() => setExportOpen(o => !o)}>
                <Icon name="download" /> Export <Icon name="chevron" style={{ width: 12, height: 12 }} />
              </button>
              <div className={`menu ${exportOpen ? 'open' : ''}`}>
                <button className="menu-item" onClick={() => handleExport('print')}><Icon name="image" /> Print / save as PDF</button>
                <button className="menu-item" onClick={() => handleExport('ical')}><Icon name="calendar" /> Calendar (.ics)</button>
                <button className="menu-item" onClick={() => handleExport('json')}><Icon name="file" /> JSON data</button>
              </div>
            </div>
            {!compareMode && (
              <button className="tb-btn primary" onClick={() => setEditing({ mode: 'edit', name: selected })}>
                <Icon name="edit" /> Edit
              </button>
            )}
          </div>
        </div>

        <div className="body" key={view + selectedNames.join('|')}>
          <div className="view-fade-enter view-fade-active">
            {compareMode
              ? <CompareView people={selectedPeople} query={query} density={t.density} />
              : <>
                  {view === 'week' && <WeekGrid person={person} entries={person.timetable} query={query} onBlockClick={(i) => setDetailIdx(i)} onMoveEntry={onMoveEntry} density={t.density} />}
                  {view === 'day'  && <DayList  person={person} entries={person.timetable} query={query} onBlockClick={(i) => setDetailIdx(i)} />}
                  {view === 'bento' && <Bento  person={person} entries={person.timetable} query={query} events={events} onBlockClick={(i) => setDetailIdx(i)} />}
                </>}
          </div>
        </div>
      </main>

      {/* Floating now */}
      {t.showFloatingNow && currentNow && (
        <button className="floating-now" onClick={jumpToNow}>
          <span className="pulse" />
          <span>Now: <strong style={{ marginLeft: 2 }}>{currentNow.name || currentNow.code_name}</strong></span>
          <span style={{ opacity: 0.6, fontFamily: 'var(--font-mono)', fontSize: 11 }}>· ends {currentNow.end}</span>
        </button>
      )}

      {/* Modals */}
      {detailEntry && (
        <BlockDetail
          entry={detailEntry}
          person={person}
          onClose={() => setDetailIdx(null)}
          onEdit={() => { setDetailIdx(null); setEditing({ mode: 'edit', name: selected }); }}
        />
      )}
      {editing && (
        <EditPerson
          mode={editing.mode}
          originalName={editing.mode === 'edit' ? editing.name : ''}
          person={editing.mode === 'edit' ? users[editing.name] : null}
          allUsernames={usernames}
          onClose={() => setEditing(null)}
          onSave={handleSavePerson}
          onDelete={editing.mode === 'edit' ? () => handleDeletePerson(editing.name) : null}
          onSwitchPerson={(name) => setEditing({ mode: 'edit', name })}
        />
      )}
      {eventsOpen && (
        <EventsModal
          events={events}
          onClose={() => setEventsOpen(false)}
          onAdd={(ev) => setEvents(prev => [...prev, ev])}
          onDelete={(i) => setEvents(prev => prev.filter((_, k) => k !== i))}
        />
      )}

      {/* Tweaks */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme">
          <TweakSelect
            label="Now accent"
            value={String(t.accentHue)}
            onChange={(v) => t.setTweak('accentHue', parseInt(v, 10))}
            options={[
              { value: '15',  label: '🔴 Red' },
              { value: '25',  label: '🟠 Orange' },
              { value: '45',  label: '🟡 Amber' },
              { value: '145', label: '🟢 Green' },
              { value: '220', label: '🔵 Sky' },
              { value: '260', label: '🟣 Indigo' },
              { value: '295', label: '🟪 Violet' },
            ]}
          />
        </TweakSection>
        <TweakSection label="Behaviour">
          <TweakToggle label="Floating 'Now' chip" value={t.showFloatingNow} onChange={(v) => t.setTweak('showFloatingNow', v)} />
          <TweakRadio label="Block style" value={t.blockStyle} onChange={(v) => t.setTweak('blockStyle', v)} options={[{ value: 'solid', label: 'Solid' }, { value: 'outline', label: 'Outline' }]} />
        </TweakSection>
        <TweakSection label="View">
          <TweakRadio label="Density" value={t.density} onChange={(v) => t.setTweak('density', v)} options={[{ value: 'comfortable', label: 'Comfy' }, { value: 'compact', label: 'Compact' }]} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
