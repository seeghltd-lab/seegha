import React, { useState, useEffect } from 'react';

/* ─── Accent presets ─── */
const ACCENTS = {
  Indigo:  { h: 250, c: 0.18, l: 0.55 },
  Amber:   { h: 60,  c: 0.16, l: 0.60 },
  Emerald: { h: 155, c: 0.15, l: 0.50 },
  Rose:    { h: 15,  c: 0.18, l: 0.58 },
  Violet:  { h: 290, c: 0.18, l: 0.55 },
};

const ACCENT_COLORS = {
  Indigo:  '#6366f1',
  Amber:   '#f59e0b',
  Emerald: '#10b981',
  Rose:    '#f43f5e',
  Violet:  '#8b5cf6',
};

const FONT_PAIRS = {
  'Inter / Inter Tight': { display: '"Inter Tight"', body: '"Inter"' },
  'System UI':           { display: 'ui-sans-serif, system-ui', body: 'ui-sans-serif, system-ui' },
};

/* ─── Apply tweaks to document root ─── */
function applyTweaks(tweaks) {
  const root = document.documentElement;
  root.dataset.theme = tweaks.theme;
  root.dataset.density = tweaks.density;

  const a = ACCENTS[tweaks.accent] || ACCENTS.Indigo;
  root.style.setProperty('--accent-h', a.h);
  root.style.setProperty('--accent-c', a.c);
  root.style.setProperty('--accent-l', a.l);

  const fp = FONT_PAIRS[tweaks.fontPair] || FONT_PAIRS['Inter / Inter Tight'];
  root.style.setProperty('--font-display', `${fp.display}, ui-sans-serif, system-ui, sans-serif`);
  root.style.setProperty('--font-body', `${fp.body}, ui-sans-serif, system-ui, sans-serif`);
}

/* ─── Load saved tweaks from localStorage ─── */
function loadTweaks() {
  return {
    theme:    localStorage.getItem('stoq.theme')    || 'light',
    accent:   localStorage.getItem('stoq.accent')   || 'Indigo',
    density:  localStorage.getItem('stoq.density')  || 'dense',
    fontPair: localStorage.getItem('stoq.fontPair') || 'Inter / Inter Tight',
  };
}

/* ─── Save tweaks to localStorage ─── */
function saveTweaks(tweaks) {
  Object.entries(tweaks).forEach(([k, v]) => localStorage.setItem(`stoq.${k}`, v));
}

/* ─── TweaksPanel ─── */
const TweaksPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(() => localStorage.getItem('stoq.tweaksHidden') === 'true');
  const [tweaks, setTweaks] = useState(loadTweaks);

  /* Apply on mount + whenever tweaks change */
  useEffect(() => {
    applyTweaks(tweaks);
    saveTweaks(tweaks);
  }, [tweaks]);

  const set = (key, val) => setTweaks(t => ({ ...t, [key]: val }));

  if (isHidden) {
    return (
      <button
        onClick={() => { setIsHidden(false); localStorage.setItem('stoq.tweaksHidden', 'false'); setIsOpen(true); }}
        title="Open Tweaks"
        style={{
          position: 'fixed', right: 16, bottom: 16, zIndex: 99,
          width: 40, height: 40, borderRadius: '50%',
          border: '1px solid var(--border)',
          background: 'var(--panel)',
          color: 'var(--fg)',
          display: 'grid', placeItems: 'center',
          boxShadow: 'var(--shadow-md)',
          cursor: 'pointer',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
          <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
          <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/>
          <line x1="17" y1="16" x2="23" y2="16"/>
        </svg>
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', right: 16, bottom: 16, zIndex: 100,
      width: 300,
      background: 'var(--bg-elev)',
      color: 'var(--fg)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      boxShadow: 'var(--shadow-lg)',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      maxHeight: 'calc(100vh - 32px)',
      fontSize: 12,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
            <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
            <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/>
            <line x1="17" y1="16" x2="23" y2="16"/>
          </svg>
          Appearance
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setIsOpen(v => !v)}
            title={isOpen ? 'Collapse' : 'Expand'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', padding: 4, borderRadius: 'var(--r-xs)', display: 'grid', placeItems: 'center' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {isOpen
                ? <polyline points="6 15 12 9 18 15" />
                : <polyline points="6 9 12 15 18 9" />}
            </svg>
          </button>
          <button
            onClick={() => { setIsHidden(true); localStorage.setItem('stoq.tweaksHidden', 'true'); }}
            title="Hide panel"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', padding: 4, borderRadius: 'var(--r-xs)', display: 'grid', placeItems: 'center' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18"/><path d="M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Body — collapsible */}
      {isOpen && (
        <div style={{ padding: '12px 14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Theme */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.10em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 8 }}>Theme</div>
            <SegRow
              options={['light', 'dark']}
              value={tweaks.theme}
              onChange={v => set('theme', v)}
              labels={{ light: 'Light', dark: 'Dark' }}
            />
          </div>

          {/* Accent */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.10em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 8 }}>Accent colour</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(ACCENT_COLORS).map(([name, color]) => (
                <button
                  key={name}
                  onClick={() => set('accent', name)}
                  title={name}
                  style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: color,
                    border: tweaks.accent === name ? '2px solid var(--fg)' : '2px solid transparent',
                    cursor: 'pointer', padding: 0, outline: 'none',
                    position: 'relative',
                  }}
                >
                  {tweaks.accent === name && (
                    <span style={{
                      position: 'absolute', inset: 4, borderRadius: '50%',
                      border: '1.5px solid var(--bg)',
                    }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Density */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.10em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 8 }}>Density</div>
            <SegRow
              options={['compact', 'dense', 'comfy']}
              value={tweaks.density}
              onChange={v => set('density', v)}
              labels={{ compact: 'Compact', dense: 'Dense', comfy: 'Comfy' }}
            />
          </div>

          {/* Font */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.10em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 8 }}>Font</div>
            <select
              value={tweaks.fontPair}
              onChange={e => set('fontPair', e.target.value)}
              className="stoq-select"
              style={{ width: '100%', height: 28 }}
            >
              {Object.keys(FONT_PAIRS).map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Reset */}
          <button
            onClick={() => {
              const defaults = { theme: 'light', accent: 'Indigo', density: 'dense', fontPair: 'Inter / Inter Tight' };
              setTweaks(defaults);
            }}
            className="stoq-btn"
            style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}
          >
            Reset to defaults
          </button>
        </div>
      )}

      {/* Collapsed summary */}
      {!isOpen && (
        <div
          onClick={() => setIsOpen(true)}
          style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 11, color: 'var(--fg-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-sunk)'}
          onMouseLeave={e => e.currentTarget.style.background = ''}
        >
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: ACCENT_COLORS[tweaks.accent], display: 'inline-block', flexShrink: 0 }} />
          {tweaks.accent} · {tweaks.theme} · {tweaks.density}
        </div>
      )}
    </div>
  );
};

/* ─── Segment row helper ─── */
const SegRow = ({ options, value, onChange, labels }) => (
  <div style={{
    display: 'flex', gap: 1,
    background: 'var(--bg-sunk)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-sm)',
    padding: 2,
  }}>
    {options.map(opt => (
      <button
        key={opt}
        data-active={value === opt ? 'true' : undefined}
        onClick={() => onChange(opt)}
        style={{
          flex: 1, height: 24,
          background: value === opt ? 'var(--panel)' : 'transparent',
          border: 'none',
          color: value === opt ? 'var(--fg)' : 'var(--fg-muted)',
          fontSize: 11, fontWeight: 600,
          borderRadius: 4,
          cursor: 'pointer',
          boxShadow: value === opt ? 'var(--shadow-sm)' : 'none',
          transition: 'background 0.1s',
        }}
      >
        {labels[opt] || opt}
      </button>
    ))}
  </div>
);

export default TweaksPanel;
