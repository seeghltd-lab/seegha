/**
 * StockPicker — type-ahead replacement for the old full-screen "browse stock" modal.
 *
 * Type a name directly; a live-filtered dropdown of matching stock appears
 * below. If nothing matches, a fallback row lets the user proceed with a
 * free-text item name (no stock created yet — it becomes a real Stock row
 * automatically once the requisition item is received, same as today).
 *
 * Props:
 *   value        {string|null}  — currently linked stock id, or null/'' if unlinked
 *   itemName     {string}       — current free-text item name (shown when value is empty)
 *   stocks       {Array}        — already-fetched site stock list ({id, itemName, sku, quantity, unit, unitCost, reorderLevel, category})
 *   onSelect     {fn}           — called with { id, itemName, unit, sku, unitCost } for an existing stock,
 *                                  or { id: null, itemName } for the free-text fallback
 *   onClear      {fn}           — called when the user clears a linked stock
 *   disabled     {boolean}
 *   placeholder  {string}
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Package, Search, X, Link2, Lock } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0 }).format(n ?? 0);

export default function StockPicker({
  value,
  itemName = '',
  stocks = [],
  onSelect,
  onClear,
  disabled = false,
  placeholder = 'Search or type item name…',
}) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef(null);
  const dropRef    = useRef(null);
  const inputRef   = useRef(null);

  const linkedStock = value ? stocks.find(s => s.id === value) : null;

  const calcPos = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const minW = 280;
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
    setQuery(itemName || '');
  };

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

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? stocks.filter(s => s.itemName.toLowerCase().includes(q) || s.sku.toLowerCase().includes(q))
    : stocks;
  const exactMatch = stocks.some(s => s.itemName.toLowerCase() === q);
  const showFallback = q.length > 0 && !exactMatch;

  const selectStock = (s) => {
    onSelect({ id: s.id, itemName: s.itemName, unit: s.unit, sku: s.sku, unitCost: s.unitCost });
    setOpen(false);
    setQuery('');
  };

  const applyFreeText = () => {
    const name = query.trim();
    if (!name) return;
    onSelect({ id: null, itemName: name });
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length === 1) { selectStock(filtered[0]); return; }
      if (showFallback) applyFreeText();
    }
    if (e.key === 'Escape') setOpen(false);
  };

  if (linkedStock || (value && itemName)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--success-soft)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)' }}>
        <Package size={13} style={{ color: 'var(--success)', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{itemName}</span>
        {linkedStock?.sku && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-subtle)' }}>{linkedStock.sku}</span>}
        {disabled ? (
          <Lock size={11} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />
        ) : (
          <button type="button" className="icon-btn" onClick={onClear}><X size={12} /></button>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={openDropdown}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '7px 10px', background: 'var(--bg-subtle)',
          border: '1px dashed var(--border)', borderRadius: 'var(--r-sm)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 12, color: 'var(--fg-muted)',
          opacity: disabled ? 0.5 : 1, textAlign: 'left',
        }}
      >
        {disabled ? <Lock size={13} style={{ color: 'var(--fg-subtle)' }} /> : <Link2 size={13} style={{ color: 'var(--fg-subtle)' }} />}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{itemName || placeholder}</span>
      </button>

      {open && createPortal(
        <div
          ref={dropRef}
          style={{
            position: 'fixed',
            top: dropPos.top, left: dropPos.left, minWidth: dropPos.width, width: dropPos.width,
            zIndex: 99999,
            background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
            boxShadow: 'var(--shadow-lg)', maxHeight: 320, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}
        >
          <div style={{ padding: 6, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'var(--bg-sunk)', borderRadius: 'var(--r-xs)' }}>
              <Search size={11} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type item name or SKU…"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--fg)' }}
              />
            </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 && !showFallback && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--fg-subtle)', fontSize: 12 }}>
                <Package size={24} style={{ opacity: 0.3, marginBottom: 6, display: 'block', margin: '0 auto 6px' }} />
                No matching stock — type a name
              </div>
            )}

            {filtered.map(s => (
              <button key={s.id} type="button" onClick={() => selectStock(s)}
                style={{ width: '100%', textAlign: 'left', padding: '9px 10px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-sunk)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <div style={{ width: 28, height: 28, borderRadius: 'var(--r-sm)', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Package size={13} style={{ color: 'var(--accent-soft-fg)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.itemName}</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-subtle)', display: 'flex', gap: 8, marginTop: 1 }}>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{s.sku}</span>
                    {s.category?.name && <span>· {s.category.name}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: s.quantity <= (s.reorderLevel ?? 0) ? 'var(--warning)' : 'var(--success)' }}>
                    {s.quantity} {s.unit}
                  </div>
                  {s.unitCost != null && <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{fmt(s.unitCost)}</div>}
                </div>
              </button>
            ))}

            {showFallback && (
              <button type="button" onClick={applyFreeText}
                style={{ width: '100%', textAlign: 'left', padding: '9px 10px', background: 'none', border: 'none', borderTop: filtered.length > 0 ? '1px solid var(--border)' : 'none', cursor: 'pointer', fontSize: 12, color: 'var(--accent-soft-fg)', fontWeight: 600 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-soft)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                Use "{query.trim()}" as new item <span style={{ fontWeight: 400, color: 'var(--fg-subtle)' }}>(not yet in inventory)</span>
              </button>
            )}
          </div>
        </div>
      , document.body)}
    </>
  );
}
