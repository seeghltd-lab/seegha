/**
 * UnitPicker — searchable + inline-create unit selector.
 *
 * Props:
 *   value        {string}   — current unit name (e.g. "KG")
 *   onChange     {fn}       — called with the new unit name string
 *   disabled     {boolean}  — optional
 *   placeholder  {string}   — optional
 *   style        {object}   — optional inline style on the trigger button
 *   inputStyle   {object}   — optional inline style on the trigger button
 *
 * Behaviour:
 *   - Loads units from /units on first open (lazy)
 *   - Filters by search query
 *   - If query doesn't match any unit, shows "Create [query]" option
 *   - On create: calls POST /units, adds to local list, selects it
 *   - Uses a fixed-position portal dropdown to avoid overflow clipping
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Plus, Loader2, X } from 'lucide-react';
import unitService from '../services/unitService';

export default function UnitPicker({
  value = '',
  onChange,
  disabled = false,
  placeholder = 'Select or create unit…',
  style = {},
  inputStyle = {},
}) {
  const [open, setOpen]         = useState(false);
  const [query, setQuery]       = useState('');
  const [units, setUnits]       = useState([]);
  const [loaded, setLoaded]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [creating, setCreating] = useState(false);
  const [dropPos, setDropPos]   = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef(null);
  const dropRef    = useRef(null);
  const inputRef   = useRef(null);

  // ── load units once on first open ──────────────────────────────────────────
  const loadUnits = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const data = await unitService.getAll();
      setUnits(data.map(u => u.name));
      setLoaded(true);
    } catch {
      // silently fail — user can still type a free-form unit
    } finally {
      setLoading(false);
    }
  }, [loaded]);

  // ── position the dropdown ──────────────────────────────────────────────────
  const calcPos = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const minW = 200; // never narrower than this
    const naturalW = Math.max(rect.width, minW);
    // If the dropdown would overflow the right edge of the viewport, anchor to the right of the trigger instead
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
    loadUnits();
  };

  // ── close on outside click ─────────────────────────────────────────────────
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
  const filtered = units.filter(u => u.toLowerCase().includes(q));
  const exactMatch = units.some(u => u.toLowerCase() === q);
  const showCreate = q.length > 0 && !exactMatch;

  // ── select a unit ──────────────────────────────────────────────────────────
  const select = (name) => {
    onChange(name);
    setOpen(false);
    setQuery('');
  };

  // ── create a new unit ──────────────────────────────────────────────────────
  const handleCreate = async () => {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      await unitService.create(name);
      // Add to local list (deduplicated)
      setUnits(prev => {
        const exists = prev.some(u => u.toLowerCase() === name.toLowerCase());
        return exists ? prev : [...prev, name].sort((a, b) => a.localeCompare(b));
      });
      select(name);
    } catch {
      // If conflict (already exists), just select it
      select(name);
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length === 1) { select(filtered[0]); return; }
      if (showCreate) handleCreate();
    }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={openDropdown}
        className="stoq-input"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          opacity: disabled ? 0.5 : 1,
          ...style,
          ...inputStyle,
        }}
      >
        <span style={{
          color: value ? 'var(--fg)' : 'var(--fg-subtle)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          fontWeight: value ? 500 : 400,
        }}>
          {value || placeholder}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {loading && <Loader2 size={11} style={{ animation: 'spin 1s linear infinite', color: 'var(--fg-subtle)' }} />}
          {value && !disabled && (
            <X
              size={11}
              style={{ color: 'var(--fg-subtle)', cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); onChange(''); }}
            />
          )}
          <ChevronDown
            size={12}
            style={{
              color: 'var(--fg-subtle)',
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s',
            }}
          />
        </div>
      </button>

      {/* ── Portal dropdown — rendered into document.body to escape all overflow constraints ── */}
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
          {/* Search input */}
          <div style={{ padding: 6, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'var(--bg-sunk)', borderRadius: 'var(--r-xs)' }}>
              <Search size={11} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search or type to create…"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 12,
                  color: 'var(--fg)',
                }}
              />
            </div>
          </div>

          {/* Options list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--fg-subtle)' }} />
              </div>
            ) : (
              <>
                {/* Clear option */}
                {value && (
                  <button
                    type="button"
                    onClick={() => select('')}
                    style={{ width: '100%', textAlign: 'left', padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--fg-subtle)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-sunk)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    — None —
                  </button>
                )}

                {/* Existing units */}
                {filtered.length === 0 && !showCreate && (
                  <p style={{ fontSize: 11, color: 'var(--fg-subtle)', textAlign: 'center', padding: '10px 0' }}>
                    {q ? 'No match — type to create' : 'No units yet'}
                  </p>
                )}
                {filtered.map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => select(name)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '7px 12px',
                      background: value === name ? 'var(--accent-soft)' : 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      color: value === name ? 'var(--accent-soft-fg)' : 'var(--fg)',
                      fontWeight: value === name ? 600 : 400,
                    }}
                    onMouseEnter={e => { if (value !== name) e.currentTarget.style.background = 'var(--bg-sunk)'; }}
                    onMouseLeave={e => { if (value !== name) e.currentTarget.style.background = 'none'; }}
                  >
                    {name}
                  </button>
                ))}

                {/* Create new */}
                {showCreate && (
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '7px 12px',
                      background: 'none',
                      border: 'none',
                      borderTop: filtered.length > 0 ? '1px solid var(--border)' : 'none',
                      cursor: creating ? 'not-allowed' : 'pointer',
                      fontSize: 12,
                      color: 'var(--accent-soft-fg)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      opacity: creating ? 0.6 : 1,
                    }}
                    onMouseEnter={e => { if (!creating) e.currentTarget.style.background = 'var(--accent-soft)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                  >
                    {creating
                      ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                      : <Plus size={11} />}
                    {creating ? 'Creating…' : `Create "${query.trim()}"`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      , document.body)}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
