/* Helpers + icons — shared across the app. Exported via window. */

// Parse "9.00", "9.30", "10.00" → minutes since midnight
function parseTime(t) {
  if (!t && t !== 0) return 0;
  const s = String(t).trim();
  const m = s.match(/^(\d{1,2})[.:]?(\d{2})?$/);
  if (!m) return 0;
  const h = parseInt(m[1], 10);
  const mm = m[2] ? parseInt(m[2], 10) : 0;
  return h * 60 + mm;
}

function fmtTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}.${String(m).padStart(2, '0')}`;
}

function fmtTime12(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ap = h >= 12 ? 'pm' : 'am';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAY_FULL  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Color helpers — turn a hex into an oklch-ish HSL we can manipulate
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
}
function mixColor(hex, withHex, amount) {
  const a = hexToRgb(hex), b = hexToRgb(withHex);
  return rgbToHex(
    a.r + (b.r - a.r) * amount,
    a.g + (b.g - a.g) * amount,
    a.b + (b.b - a.b) * amount
  );
}
function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function readableOn(bg) {
  return luminance(bg) > 0.55 ? '#1a1a1a' : '#ffffff';
}

function initials(name) {
  if (!name) return '?';
  return name.trim().slice(0, 2).toUpperCase();
}

// Active day index 0..4 if Mon-Fri, else -1 (Saturday/Sunday)
function todayIdx() {
  const d = new Date().getDay(); // 0=Sun
  return d === 0 || d === 6 ? -1 : d - 1;
}

// Returns minutes since midnight for "now"
function nowMins() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

// ── SVG icon factory ──
const Icon = ({ name, ...props }) => {
  const paths = {
    grid:       'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    list:       'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    bento:      'M3 3h8v11H3zM13 3h8v6h-8zM13 11h8v10h-8zM3 16h8v5H3z',
    search:     'M11 4a7 7 0 1 0 4.95 11.95L20 20l1.41-1.41-4.05-4.05A7 7 0 0 0 11 4z',
    sun:        'M12 4v2M12 18v2M4 12h2M18 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    moon:       'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
    plus:       'M12 5v14M5 12h14',
    edit:       'M14 4l6 6L8 22H2v-6L14 4zM12.5 5.5l6 6',
    calendar:   'M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8 2v4M16 2v4',
    download:   'M12 3v12M7 10l5 5 5-5M4 21h16',
    chevron:    'M6 9l6 6 6-6',
    x:          'M6 6l12 12M18 6L6 18',
    menu:       'M3 6h18M3 12h18M3 18h18',
    sidebar:    'M3 4h18v16H3zM10 4v16',
    clock:      'M12 6v6l4 2M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z',
    pin:        'M12 22s-7-7.5-7-13a7 7 0 1 1 14 0c0 5.5-7 13-7 13zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    online:     'M3 12a9 9 0 0 1 18 0M6.5 12a5.5 5.5 0 0 1 11 0M10 12a2 2 0 0 1 4 0M12 20h.01',
    sparkle:    'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
    chart:      'M3 21h18M5 17V10M10 17V5M15 17v-8M20 17v-12',
    trash:      'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14',
    play:       'M5 3l16 9-16 9z',
    location:   'M12 22s-7-7.5-7-13a7 7 0 1 1 14 0c0 5.5-7 13-7 13zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    coffee:     'M3 8h14v6a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8zM17 9h2a2 2 0 0 1 0 4h-2M6 2v3M10 2v3M14 2v3',
    settings:   'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    drag:       'M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01',
    image:      'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6',
    file:       'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
  };
  const p = paths[name];
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d={p} />
    </svg>
  );
};

// Hover preview tooltip
function Tooltip({ children, content, disabled }) {
  const [show, setShow] = React.useState(false);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const ref = React.useRef(null);
  const onEnter = (e) => {
    if (disabled) return;
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ x: r.left + r.width / 2, y: r.top });
    setShow(true);
  };
  return (
    <>
      <span ref={ref} onMouseEnter={onEnter} onMouseLeave={() => setShow(false)} style={{ display: 'contents' }}>{children}</span>
      {show && content && ReactDOM.createPortal(
        <div style={{
          position: 'fixed', left: pos.x, top: pos.y - 8,
          transform: 'translate(-50%, -100%)',
          background: 'var(--ink)', color: 'var(--paper)',
          padding: '8px 12px', borderRadius: 8, fontSize: 12,
          maxWidth: 260, zIndex: 200, pointerEvents: 'none',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        }}>{content}</div>,
        document.body
      )}
    </>
  );
}

Object.assign(window, {
  parseTime, fmtTime, fmtTime12, DAY_NAMES, DAY_FULL,
  hexToRgb, rgbToHex, mixColor, luminance, readableOn, initials,
  todayIdx, nowMins, Icon, Tooltip,
});
