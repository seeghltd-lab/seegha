/**
 * PortalSelect — generic searchable select with optional inline-create.
 *
 * Same portal/positioning approach as UnitPicker (renders the dropdown into
 * document.body with position:fixed so it always overlays ancestor panels,
 * table cells, etc. instead of being clipped by their overflow/border-radius).
 *
 * Props:
 *   value        {string}   — selected option's `value`
 *   onChange     {fn}       — called with the new value
 *   options      {Array<{value,label}>} — already-loaded list (no internal fetch)
 *   onCreate     {fn}       — optional async (query) => newValue; shows "Create…" row
 *   createLabel  {string}   — optional, e.g. "supplier" / "category"
 *   label        {string}   — optional field label rendered above the trigger
 *   placeholder  {string}
 *   disabled     {boolean}
 *   clearable    {boolean}  — default true, shows a "None" row
 *   error        {string}   — optional validation message
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Plus, Loader2 } from 'lucide-react';

export default function PortalSelect({
  value = '',
  onChange,
  options = [],
  onCreate,
  createLabel = 'item',
  label,
  placeholder = 'Select…',
  disabled = false,
  clearable = true,
  error,
}) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const [creating, setCreating] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef(null);
  const dropRef    = useRef(null);
  const inputRef   = useRef(null);

  const selected = options.find(o => o.value === value);

  // ── position the dropdown ──────────────────────────────────────────────
  const calcPos = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const minW = 200;
    const naturalW = Math.max(rect.width, minW);
    const overflows = rect.left + naturalW > window.innerWidth - 8;
    setDropPos({
      top:   rect.bottom + window.scrollY + 2,
      left:  overflows
        ? Math.max(8, rect.right + window.scrollX - naturalW)
        : rect.left + window.scrollX,
      width: naturalW,
    });
  };

  const openDropdown = () => {
    if (disabled) return;
    calcPos();
    setOpen(true);
    setQuery('');
  };

  // ── close on outside click ─────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropRef.current    && !dropRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── reposition on scroll / resize ─────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const reposition = () => calcPos();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  // ── focus search input when dropdown opens ─────────────────────────────────
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  // ── filtered list ──────────────────────────────────────────────────────────
  const q        = query.trim().toLowerCase();
  const filtered = options.filter(o => o.label.toLowerCase().includes(q));
  const exactMatch = options.some(o => o.label.toLowerCase() === q);
  const showCreate = !!onCreate && q.length > 0 && !exactMatch;

  const select = (v) => {
    onChange(v);
    setOpen(false);
    setQuery('');
  };

  const handleCreate = async () => {
    const name = query.trim();
    if (!name || creating || !onCreate) return;
    setCreating(true);
    try {
      const newValue = await onCreate(name);
      select(newValue);
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length === 1) { select(filtered[0].value); return; }
      if (showCreate) handleCreate();
    }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div>
      {label && <label className="stoq-field__label">{label}</label>}

      {/* ── Trigger button ── */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className="stoq-input"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          width: '100%',
          opacity: disabled ? 0.5 : 1,
          ...(error ? { borderColor: 'var(--danger)' } : {}),
        }}
      >
        <span style={{
          color: selected ? 'var(--fg)' : 'var(--fg-subtle)',
          fontWeight: selected ? 500 : 400,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={13} style={{ color: 'var(--fg-subtle)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0, marginLeft: 6 }} />
      </button>

      {error && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>{error}</p>}

      {/* ── Portal dropdown — escapes all ancestor overflow clipping ── */}
      {open && createPortal(
        <div
          ref={dropRef}
          style={{
            position: 'fixed',
            top:      dropPos.top,
            left:     dropPos.left,
            minWidth: dropPos.width,
            width:    dropPos.width,
            zIndex: 99999,
            background: 'var(--bg-elev)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
            boxShadow: 'var(--shadow-lg)',
            maxHeight: 240,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: 6, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="stoq-input"
              style={{ height: 28, fontSize: 11 }}
              placeholder={onCreate ? 'Search or type to create…' : 'Search…'}
            />
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {clearable && (
              <button type="button" onClick={() => select('')}
                style={{ width: '100%', textAlign: 'left', padding: '7px 10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--fg-subtle)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-sunk)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                — None —
              </button>
            )}

            {filtered.length === 0 && !showCreate && (
              <p style={{ padding: '10px 0', fontSize: 11, color: 'var(--fg-subtle)', textAlign: 'center' }}>
                {q ? 'No match' : `No ${createLabel}s yet.${onCreate ? ' Type a name to create one.' : ''}`}
              </p>
            )}

            {filtered.map(o => (
              <button key={o.value} type="button" onClick={() => select(o.value)}
                style={{ width: '100%', textAlign: 'left', padding: '7px 10px', background: value === o.value ? 'var(--accent-soft)' : 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: value === o.value ? 'var(--accent-soft-fg)' : 'var(--fg)', fontWeight: value === o.value ? 600 : 400 }}
                onMouseEnter={e => { if (value !== o.value) e.currentTarget.style.background = 'var(--bg-sunk)'; }}
                onMouseLeave={e => { if (value !== o.value) e.currentTarget.style.background = 'none'; }}>
                {o.label}
              </button>
            ))}

            {showCreate && (
              <button type="button" onClick={handleCreate} disabled={creating}
                style={{ width: '100%', textAlign: 'left', padding: '7px 10px', background: 'none', border: 'none', borderTop: filtered.length > 0 ? '1px solid var(--border)' : 'none', cursor: creating ? 'not-allowed' : 'pointer', fontSize: 12, color: 'var(--accent-soft-fg)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, opacity: creating ? 0.6 : 1 }}
                onMouseEnter={e => { if (!creating) e.currentTarget.style.background = 'var(--accent-soft)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
                {creating ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={11} />}
                {creating ? 'Creating…' : `Create ${createLabel} "${query.trim()}"`}
              </button>
            )}
          </div>
        </div>
      , document.body)}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
