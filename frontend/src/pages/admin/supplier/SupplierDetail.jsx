import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Star, Mail, Phone, MapPin, Building2, FileText,
  Package, CreditCard, ArrowUpCircle, ArrowDownCircle, ChevronDown,
  X, RefreshCw, Plus, AlertCircle, CheckCircle,
  TrendingDown, Edit2, List, LayoutGrid, ChevronLeft, ChevronRight, Calendar, Printer, BadgeCheck, Search, Trash2,
} from 'lucide-react';
import supplierService from '../../../services/supplierService';
import { useRole } from '../../../hooks/useRole';
import { buildPaymentReceipt, buildGroupReceipt, buildRequisitionReceipt, SupplierReceiptModal } from '../../../components/ReceiptModal';

// --- Helpers -----------------------------------------------------------------

const fmt = (n) => `RWF ${parseFloat(n || 0).toLocaleString()}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const fmtDateGroup = (d) => d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : '-';

const STATUS_BADGE = {
  ACTIVE: 'stoq-badge stoq-badge--success',
  INACTIVE: 'stoq-badge',
  SUSPENDED: 'stoq-badge stoq-badge--danger',
};

const REQ_BADGE = {
  PENDING: 'stoq-badge stoq-badge--warning',
  APPROVED: 'stoq-badge stoq-badge--accent',
  PARTIALLY_RECEIVED: 'stoq-badge stoq-badge--warning',
  FULLY_RECEIVED: 'stoq-badge stoq-badge--success',
  REJECTED: 'stoq-badge stoq-badge--danger',
};

// --- Date filter helpers ------------------------------------------------------

const DATE_PRESETS = [
  { label: 'All time', value: '' },
  { label: 'Today',    value: 'today' },
  { label: 'Week',     value: 'week' },
  { label: 'Month',    value: 'month' },
  { label: 'Year',     value: 'year' },
  { label: 'Custom',   value: 'custom' },
];

function getDateRange(preset, customFrom, customTo) {
  const now = new Date();
  if (preset === 'today') {
    const s = new Date(now); s.setHours(0, 0, 0, 0);
    return { from: s, to: now };
  }
  if (preset === 'week') {
    const s = new Date(now); s.setDate(now.getDate() - 7);
    return { from: s, to: now };
  }
  if (preset === 'month') {
    const s = new Date(now); s.setDate(1); s.setHours(0, 0, 0, 0);
    return { from: s, to: now };
  }
  if (preset === 'year') {
    const s = new Date(now.getFullYear(), 0, 1);
    return { from: s, to: now };
  }
  if (preset === 'custom' && customFrom) {
    return { from: new Date(customFrom), to: customTo ? new Date(customTo + 'T23:59:59') : now };
  }
  return null;
}

function inRange(dateStr, range) {
  if (!range) return true;
  const d = new Date(dateStr);
  return d >= range.from && d <= range.to;
}

// --- Pagination helper --------------------------------------------------------

function Pagination({ page, totalPages, total, onPage, label = 'items' }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-sunk)' }}>
      <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
        Page {page} of {totalPages} - {total} {label}
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="stoq-btn stoq-btn--icon" disabled={page <= 1} style={{ opacity: page <= 1 ? 0.4 : 1 }} onClick={() => onPage(page - 1)}>
          <ChevronLeft size={13} />
        </button>
        <button className="stoq-btn stoq-btn--icon" disabled={page >= totalPages} style={{ opacity: page >= totalPages ? 0.4 : 1 }} onClick={() => onPage(page + 1)}>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// --- Filter Bar (date + site + search) ----------------------------------------

function FilterBar({ preset, customFrom, customTo, onPreset, onCustomFrom, onCustomTo, sites, siteFilter, onSiteFilter, search, onSearch, onClear }) {
  const isFiltered = preset !== '' || siteFilter || search;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0', marginBottom: 12 }}>
      {/* Row 1: date presets + clear */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Calendar size={13} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />
        <div className="stoq-segment">
          {DATE_PRESETS.map(p => (
            <button key={p.value} data-active={preset === p.value ? 'true' : undefined} onClick={() => onPreset(p.value)}>
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="date" className="stoq-input" value={customFrom} onChange={e => onCustomFrom(e.target.value)}
              style={{ width: 140, height: 28, fontSize: 11 }} />
            <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>→</span>
            <input type="date" className="stoq-input" value={customTo} onChange={e => onCustomTo(e.target.value)}
              style={{ width: 140, height: 28, fontSize: 11 }} />
          </div>
        )}
        {isFiltered && onClear && (
          <button type="button" onClick={onClear}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg-sunk)', color: 'var(--fg-subtle)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <X size={11} /> Clear filters
          </button>
        )}
      </div>
      {/* Row 2: site dropdown + search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {sites && sites.length > 0 && (
          <select
            className="stoq-input"
            value={siteFilter}
            onChange={e => onSiteFilter(e.target.value)}
            style={{ height: 30, fontSize: 12, minWidth: 150, flexShrink: 0 }}>
            <option value="">All sites</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
          <input
            className="stoq-input"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search name, SKU, reference…"
            style={{ height: 30, fontSize: 12, paddingLeft: 28, paddingRight: search ? 30 : undefined, width: '100%' }}
          />
          {search && (
            <button type="button" onClick={() => onSearch('')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', display: 'flex', padding: 0 }}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StarRating({ rating }) {
  const r = Math.round(rating || 0);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={12}
          style={{ color: i <= r ? 'var(--warning)' : 'var(--border-strong)', fill: i <= r ? 'var(--warning)' : 'var(--border-strong)' }} />
      ))}
      <span style={{ fontSize: 11, color: 'var(--fg-subtle)', marginLeft: 4, fontFamily: 'var(--font-mono)' }}>
        {Number(rating || 0).toFixed(1)}
      </span>
    </div>
  );
}

// --- Payment Modal ------------------------------------------------------------

function PaymentModal({ supplierId, availableStocks, onClose, onSuccess, editMode, payment }) {
  const [type, setType] = useState(editMode ? payment?.type : 'CREDIT');
  const [items, setItems] = useState(() => {
    if (editMode && payment) {
      return [{ stockId: payment.stockId || '', quantity: payment.quantity != null ? String(parseFloat(payment.quantity)) : '', amount: String(parseFloat(payment.amount ?? 0)) }];
    }
    return [{ stockId: '', quantity: '', amount: '' }];
  });
  const [reference, setReference] = useState(editMode ? (payment?.reference || '') : '');
  const [notes, setNotes] = useState(editMode ? (payment?.notes?.startsWith('PAID_CREDITS:') ? '' : (payment?.notes || '')) : '');
  const [date, setDate] = useState(
    editMode && payment?.date ? new Date(payment.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isCredit = type === 'CREDIT';
  const accentColor = isCredit ? 'var(--warning)' : 'var(--success)';
  const totalAmount = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  const updateItem = (idx, field, val) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  const addItem = () => {
    setItems(prev => [...prev, { stockId: '', quantity: '', amount: '' }]);
    setAutoFillFlags(prev => [...prev, false]);
  };
  const removeItem = (idx) => {
    setItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
    setAutoFillFlags(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  };

  const [autoFillFlags, setAutoFillFlags] = useState(() => items.map(() => false));

  const handleStockChange = (idx, stockId) => {
    if (editMode) { updateItem(idx, 'stockId', stockId); return; }
    const stock = (availableStocks || []).find(s => s.id === stockId);
    const unitCost = stock ? parseFloat(stock.unitCost ?? 0) : 0;
    const qty = parseFloat(items[idx].quantity) || 1;
    setItems(prev => prev.map((it, i) =>
      i === idx ? { ...it, stockId, amount: unitCost > 0 ? String((unitCost * qty).toFixed(2)) : it.amount } : it
    ));
    setAutoFillFlags(prev => prev.map((f, i) => i === idx ? unitCost > 0 : f));
  };

  const handleQtyChange = (idx, qty) => {
    if (autoFillFlags[idx]) {
      const stock = (availableStocks || []).find(s => s.id === items[idx].stockId);
      const unitCost = stock ? parseFloat(stock.unitCost ?? 0) : 0;
      setItems(prev => prev.map((it, i) =>
        i === idx ? { ...it, quantity: qty, amount: unitCost > 0 ? String((unitCost * (parseFloat(qty) || 0)).toFixed(2)) : it.amount } : it
      ));
    } else {
      updateItem(idx, 'quantity', qty);
    }
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const validItems = items.filter(i => parseFloat(i.amount) > 0);
    if (validItems.length === 0) { setError('Enter at least one amount'); return; }
    setError('');
    setSubmitting(true);

    const resolvedRef = editMode
      ? (reference || null)
      : (reference.trim() || (() => {
          const firstStocked = validItems.find(i => i.stockId);
          const stock = firstStocked ? (availableStocks || []).find(s => s.id === firstStocked.stockId) : null;
          const sku = (stock?.sku || stock?.itemName || 'ITEM').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
          const d = date.replace(/-/g, '');
          return `${isCredit ? 'INV' : 'PAY'}-${sku}-${d}`;
        })());

    try {
      if (editMode) {
        const item = items[0];
        await supplierService.updatePayment(supplierId, payment.id, {
          type,
          amount: parseFloat(item.amount),
          quantity: item.quantity ? parseFloat(item.quantity) : null,
          stockId: item.stockId || null,
          reference: resolvedRef,
          notes: notes || null,
          date,
        });
        onSuccess(isCredit ? 'Credit updated' : 'Debit updated');
      } else {
        await Promise.all(validItems.map(item =>
          supplierService.addPayment(supplierId, {
            type,
            amount: parseFloat(item.amount),
            quantity: item.quantity ? parseFloat(item.quantity) : undefined,
            stockId: item.stockId || undefined,
            reference: resolvedRef,
            notes: notes || null,
            date,
          })
        ));
        const count = validItems.length;
        onSuccess(count > 1 ? `${count} ${isCredit ? 'credits' : 'debits'} recorded` : (isCredit ? 'Credit recorded' : 'Debit recorded'));
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || (editMode ? 'Failed to update' : 'Failed to record'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stoq-modal-backdrop">
      <div className="stoq-modal" style={{ maxWidth: 560, width: '100%' }}>
        <div className="stoq-modal__head">
          <div>
            <div className="stoq-modal__title">{editMode ? 'Edit Transaction' : 'Record Transaction'}</div>
            <div className="stoq-modal__sub">Track financial activity with this supplier</div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={14} /></button>
        </div>

        <form onSubmit={handleSubmit} className="stoq-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Type selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { val: 'CREDIT', Icon: ArrowUpCircle, label: 'Credit', sub: 'Amount owed to supplier', color: 'var(--warning)' },
              { val: 'DEBIT',  Icon: ArrowDownCircle, label: 'Debit', sub: 'Payment made to supplier', color: 'var(--success)' },
            ].map(({ val, Icon, label, sub, color }) => {
              const active = type === val;
              return (
                <button key={val} type="button" onClick={() => setType(val)}
                  style={{
                    padding: '14px 16px', borderRadius: 'var(--r-md)', textAlign: 'left',
                    border: `2px solid ${active ? color : 'var(--border)'}`,
                    background: active ? `color-mix(in oklch, ${color} 10%, var(--panel))` : 'var(--bg-sunk)',
                    cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                  <Icon size={22} style={{ color: active ? color : 'var(--fg-subtle)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: active ? color : 'var(--fg)' }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 1 }}>{sub}</div>
                  </div>
                  {active && <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>

          {/* Stock items */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label className="stoq-field__label" style={{ margin: 0, fontSize: 11 }}>
                Stock Items &amp; Amounts <span style={{ color: 'var(--fg-subtle)', fontWeight: 400 }}>(one row = one transaction)</span>
              </label>
              {!editMode && (
                <button type="button" onClick={addItem}
                  style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0' }}>
                  <Plus size={11} /> Add Row
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 100px 24px', gap: 5 }}>
                <span style={{ fontSize: 10, color: 'var(--fg-subtle)', paddingLeft: 2 }}>Stock</span>
                <span style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>Qty</span>
                <span style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>Amount (RWF) *</span>
                <span />
              </div>
              {items.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 72px 100px 24px', gap: 5, alignItems: 'center' }}>
                  <select
                    className="stoq-input"
                    value={item.stockId}
                    onChange={e => handleStockChange(idx, e.target.value)}
                    style={{ fontSize: 12, height: 32 }}
                  >
                    <option value="">— optional —</option>
                    {(availableStocks || []).map(s => (
                      <option key={s.id} value={s.id}>{s.itemName || s.sku}</option>
                    ))}
                  </select>
                  <input
                    type="number" min="0" step="any"
                    className="stoq-input"
                    value={item.quantity}
                    onChange={e => handleQtyChange(idx, e.target.value)}
                    placeholder="—"
                    style={{ fontSize: 12, height: 32 }}
                  />
                  <div style={{ position: 'relative' }}>
                  <input
                    type="number" min="0.01" step="0.01"
                    className="stoq-input"
                    value={item.amount}
                    onChange={e => { updateItem(idx, 'amount', e.target.value); setAutoFillFlags(p => p.map((f, i) => i === idx ? false : f)); }}
                    placeholder="0.00"
                    style={{ fontSize: 12, height: 32, width: '100%', borderColor: autoFillFlags[idx] ? 'var(--accent)' : undefined }}
                    autoFocus={idx === 0}
                  />
                  {autoFillFlags[idx] && (
                    <div style={{ fontSize: 9, color: 'var(--accent)', marginTop: 2, lineHeight: 1 }}>auto-filled</div>
                  )}
                  </div>
                  {!editMode && items.length > 1 ? (
                    <button type="button" onClick={() => removeItem(idx)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                      <X size={12} />
                    </button>
                  ) : <div />}
                </div>
              ))}
            </div>
          </div>

          {/* Reference */}
          <div className="stoq-field" style={{ margin: 0 }}>
            <label className="stoq-field__label">Reference / Invoice #</label>
            <div style={{ position: 'relative' }}>
              <input
                value={reference}
                onChange={e => setReference(e.target.value)}
                className="stoq-input"
                placeholder="e.g. INV-2024-001"
                style={{ paddingRight: reference ? 32 : undefined }}
              />
              {reference && (
                <button type="button" onClick={() => setReference('')}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'var(--border)', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, color: 'var(--fg-subtle)' }}>
                  <X size={10} />
                </button>
              )}
            </div>
          </div>

          {/* Date + Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="stoq-field" style={{ margin: 0 }}>
              <label className="stoq-field__label">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="stoq-input" />
            </div>
            <div className="stoq-field" style={{ margin: 0 }}>
              <label className="stoq-field__label">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} className="stoq-input" placeholder="Optional…" />
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--danger-soft)', borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--danger)' }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}
        </form>

        <div className="stoq-modal__foot">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {items.length > 1 && <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{items.length} items</span>}
            {totalAmount > 0 && (
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: accentColor }}>{fmt(totalAmount)}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="stoq-btn" onClick={onClose}>Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', borderRadius: 'var(--r-md)', border: 'none',
                background: accentColor, color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.65 : 1, transition: 'opacity 0.15s',
              }}>
              {submitting
                ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                : (isCredit ? <ArrowUpCircle size={13} /> : <ArrowDownCircle size={13} />)
              }
              {editMode
                ? (isCredit ? 'Update Credit' : 'Update Debit')
                : (isCredit ? 'Record Credit' : 'Record Debit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Bulk Credit Pay Modal ----------------------------------------------------

function BulkCreditPayModal({ supplierId, credits, onClose, onSuccess }) {
  const getRemaining    = (p) => parseFloat(p.amount ?? 0) - parseFloat(p.paidAmount ?? 0);
  const getRemainingQty = (p) => {
    const creditQty = p.quantity != null ? parseFloat(p.quantity) : null;
    if (creditQty == null) return null;
    const amount = parseFloat(p.amount ?? 0);
    if (amount === 0) return creditQty;
    return creditQty * getRemaining(p) / amount;
  };

  const [checkedIds, setCheckedIds] = useState(() => new Set(credits.map(p => p.id)));
  const [payQtys, setPayQtys] = useState(() =>
    Object.fromEntries(credits.map(p => {
      const remQty = getRemainingQty(p);
      return [p.id, remQty != null ? String(parseFloat(remQty.toFixed(2))) : ''];
    }))
  );
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggle = (id) => setCheckedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const checkedItems = credits.filter(p => checkedIds.has(p.id));

  const getProportionalAmt = (p) => {
    const remQty = getRemainingQty(p);
    if (remQty == null) return getRemaining(p);
    const payQty = parseFloat(payQtys[p.id] || 0);
    if (payQty >= remQty - 0.001) return getRemaining(p);
    const unitCost = parseFloat(p.amount ?? 0) / parseFloat(p.quantity);
    return payQty * unitCost;
  };

  const total    = checkedItems.reduce((s, p) => s + getProportionalAmt(p), 0);
  const totalQty = checkedItems.reduce((s, p) => s + parseFloat(payQtys[p.id] || 0), 0);

  const getQtyError = (credit) => {
    const pq = parseFloat(payQtys[credit.id] || 0);
    const remQty = getRemainingQty(credit);
    if (remQty != null && pq > remQty + 0.001) return `Max ${parseFloat(remQty.toFixed(2))}`;
    return null;
  };

  const hasErrors = checkedItems.some(p => getQtyError(p) !== null);

  const handleConfirm = async () => {
    if (checkedItems.length === 0) { setError('Select at least one credit to pay'); return; }
    if (hasErrors) { setError('Fix errors above before proceeding.'); return; }
    setError('');
    setSubmitting(true);
    try {
      // Group credits by site — create one DEBIT payment per site
      const siteGroups = {};
      for (const p of checkedItems) {
        const key = p.stock?.site?.id || '__none__';
        if (!siteGroups[key]) siteGroups[key] = [];
        siteGroups[key].push(p);
      }
      for (const groupItems of Object.values(siteGroups)) {
        const groupAmt = groupItems.reduce((s, p) => s + getProportionalAmt(p), 0);
        const groupQty = groupItems.reduce((s, p) => s + parseFloat(payQtys[p.id] || 0), 0);
        await supplierService.addPayment(supplierId, {
          type: 'DEBIT',
          amount: groupAmt,
          quantity: groupQty > 0 ? groupQty : undefined,
          reference: reference || `Payment for ${groupItems.length} credit(s)`,
          notes: `PAID_CREDITS:${groupItems.map(p => `${p.id}=${getProportionalAmt(p)}`).join(',')}`,
        });
      }

      // Update paidAmount + status on each credit
      const updates = checkedItems.map(p => {
        const payAmt = getProportionalAmt(p);
        const newPaidAmount = parseFloat(p.paidAmount ?? 0) + payAmt;
        const newStatus = newPaidAmount >= parseFloat(p.amount ?? 0) - 0.001 ? 'PAID' : 'PARTIAL';
        return { p, newPaidAmount, newStatus };
      });
      await Promise.all(updates.map(u =>
        supplierService.updatePayment(supplierId, u.p.id, { paidAmount: u.newPaidAmount, status: u.newStatus })
      ));

      const paidCount    = updates.filter(u => u.newStatus === 'PAID').length;
      const partialCount = updates.filter(u => u.newStatus === 'PARTIAL').length;
      const msg = partialCount > 0
        ? `${paidCount} paid, ${partialCount} partial`
        : `${checkedItems.length} credit${checkedItems.length !== 1 ? 's' : ''} marked as paid`;
      onSuccess(msg);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to process payment. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stoq-modal-backdrop">
      <div className="stoq-modal" style={{ maxWidth: 960, width: '100%' }}>
        <div className="stoq-modal__head">
          <div>
            <div className="stoq-modal__title">Pay Credits</div>
            <div className="stoq-modal__sub">Enter qty to pay per credit — partial qty marks the credit as PARTIAL</div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="stoq-modal__body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="stoq-tbl">
              <thead>
                <tr>
                  <th className="no-sort" style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={checkedIds.size === credits.length}
                      ref={el => { if (el) el.indeterminate = checkedIds.size > 0 && checkedIds.size < credits.length; }}
                      onChange={() => {
                        if (checkedIds.size === credits.length) setCheckedIds(new Set());
                        else setCheckedIds(new Set(credits.map(p => p.id)));
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th className="no-sort">Reference / Notes</th>
                  <th className="no-sort" style={{ width: 160 }}>Stock Item</th>
                  <th className="no-sort num-cell" style={{ width: 100 }}>Unit Cost</th>
                  <th className="no-sort num-cell" style={{ width: 110 }}>Original</th>
                  <th className="no-sort num-cell" style={{ width: 110 }}>Remaining</th>
                  <th className="no-sort" style={{ width: 110 }}>Qty to Pay</th>
                </tr>
              </thead>
              <tbody>
                {credits.map(p => {
                  const remaining = getRemaining(p);
                  const qtyErr = getQtyError(p);
                  const creditQty = p.quantity != null ? parseFloat(p.quantity) : null;
                  const isChecked = checkedIds.has(p.id);
                  return (
                    <tr key={p.id} style={{ cursor: 'pointer', background: isChecked ? 'color-mix(in oklch, var(--warning) 6%, transparent)' : undefined }}
                      onClick={() => toggle(p.id)}>
                      <td onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isChecked} onChange={() => toggle(p.id)} style={{ cursor: 'pointer' }} />
                      </td>
                      <td>
                        {p.reference && <span className="cell-stack__main">{p.reference}</span>}
                        {p.notes && !p.notes.startsWith('PAID_CREDITS:') && <span className="cell-stack__sub">{p.notes}</span>}
                      </td>
                      <td style={{ fontSize: 11 }}>
                        <span className="cell-stack__main" style={{ fontSize: 11 }}>
                          {p.stock?.itemName || p.requisitionItem?.itemName || '—'}
                        </span>
                        {p.stock?.site?.name && (
                          <span className="cell-stack__sub">{p.stock.site.name}</span>
                        )}
                      </td>
                      <td className="num-cell" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                        {p.stock?.unitCost != null ? fmt(p.stock.unitCost) : '—'}
                      </td>
                      <td className="num-cell" style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
                        {fmt(p.amount)}
                        {creditQty != null && (
                          <div style={{ fontSize: 9, color: 'var(--fg-subtle)', marginTop: 1 }}>{creditQty} {p.stock?.unit || ''}</div>
                        )}
                      </td>
                      <td className="num-cell" style={{ fontWeight: 700, color: remaining < parseFloat(p.amount ?? 0) ? 'var(--accent)' : 'var(--warning)' }}>
                        {fmt(remaining)}
                        {creditQty != null && (() => {
                          const remQty = getRemainingQty(p);
                          return remQty != null ? (
                            <div style={{ fontSize: 9, color: 'var(--fg-subtle)', marginTop: 1 }}>{parseFloat(remQty.toFixed(2))} {p.stock?.unit || ''}</div>
                          ) : null;
                        })()}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div>
                          <input
                            type="number" min="0" step="any"
                            value={payQtys[p.id] || ''}
                            onChange={e => setPayQtys(prev => ({ ...prev, [p.id]: e.target.value }))}
                            className="stoq-input"
                            style={{ width: 88, height: 28, fontSize: 11, padding: '0 8px', borderColor: qtyErr ? 'var(--danger)' : undefined }}
                            placeholder="—"
                          />
                          {creditQty != null && (
                            <div style={{ fontSize: 9, color: qtyErr ? 'var(--danger)' : 'var(--fg-subtle)', marginTop: 2 }}>
                              {qtyErr || `of ${creditQty} total`}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="stoq-field" style={{ margin: 0 }}>
              <label className="stoq-field__label">Payment Reference (optional)</label>
              <input
                value={reference}
                onChange={e => setReference(e.target.value)}
                className="stoq-input"
                placeholder="e.g. BANK-TXN-20240521"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
                {checkedIds.size} of {credits.length} credit{credits.length !== 1 ? 's' : ''} selected
                {totalQty > 0 && (
                  <span style={{ marginLeft: 8, fontWeight: 600, color: 'var(--fg)' }}>· {totalQty} units</span>
                )}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                {fmt(total)}
              </span>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--danger-soft)', borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--danger)' }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}
          </div>
        </div>

        <div className="stoq-modal__foot">
          <button className="stoq-btn" onClick={onClose}>Cancel</button>
          <button
            className="stoq-btn stoq-btn--primary"
            disabled={submitting || checkedIds.size === 0 || hasErrors}
            style={{ opacity: (submitting || checkedIds.size === 0 || hasErrors) ? 0.6 : 1 }}
            onClick={handleConfirm}
          >
            {submitting
              ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Processing…</>
              : <><BadgeCheck size={13} /> Pay {checkedIds.size} Credit{checkedIds.size !== 1 ? 's' : ''}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Tab: Info ----------------------------------------------------------------

function TabInfo({ supplier }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Contact details grid */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 10 }}>
          Contact Details
        </div>
        <div className="detail-grid">
          {supplier.contactPerson && (
            <div className="detail-cell">
              <div className="detail-cell__label"><Building2 size={11} /> Contact Person</div>
              <div className="detail-cell__value">{supplier.contactPerson}</div>
            </div>
          )}
          {supplier.email && (
            <div className="detail-cell">
              <div className="detail-cell__label"><Mail size={11} /> Email</div>
              <div className="detail-cell__value">{supplier.email}</div>
            </div>
          )}
          {supplier.phone && (
            <div className="detail-cell">
              <div className="detail-cell__label"><Phone size={11} /> Phone</div>
              <div className="detail-cell__value">{supplier.phone}</div>
            </div>
          )}
          {supplier.city && (
            <div className="detail-cell">
              <div className="detail-cell__label"><MapPin size={11} /> City</div>
              <div className="detail-cell__value">{supplier.city}</div>
            </div>
          )}
          {supplier.address && (
            <div className="detail-cell">
              <div className="detail-cell__label"><MapPin size={11} /> Address</div>
              <div className="detail-cell__value">{supplier.address}</div>
            </div>
          )}
          {supplier.country && (
            <div className="detail-cell">
              <div className="detail-cell__label"><Building2 size={11} /> Country</div>
              <div className="detail-cell__value">{supplier.country}</div>
            </div>
          )}
          {supplier.paymentTerms && (
            <div className="detail-cell">
              <div className="detail-cell__label"><CreditCard size={11} /> Payment Terms</div>
              <div className="detail-cell__value">{supplier.paymentTerms}</div>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {supplier.notes && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 10 }}>
            Notes
          </div>
          <div style={{ padding: '12px 14px', background: 'var(--warning-soft)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--fg)', lineHeight: 1.6 }}>
            {supplier.notes}
          </div>
        </div>
      )}

      {/* KPI row */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 10 }}>
          Quick Stats
        </div>
        <div className="kpi-grid kpi-grid--3">
          <div className="kpi">
            <div className="kpi__label">
              <span className="kpi__icon"><Package size={12} /></span>
              Total Items
            </div>
            <div className="kpi__value">{supplier._count?.stocks ?? supplier.stocks?.length ?? 0}</div>
          </div>
          <div className="kpi">
            <div className="kpi__label">
              <span className="kpi__icon"><TrendingDown size={12} /></span>
              Stock Value
            </div>
            <div className="kpi__value" style={{ fontSize: 18 }}>{fmt(supplier.totalStockValue)}</div>
          </div>
          <div className="kpi">
            <div className="kpi__label">
              <span className="kpi__icon" data-tone={supplier.paymentSummary?.balance > 0 ? 'warning' : undefined}>
                <CreditCard size={12} />
              </span>
              Balance Due
            </div>
            <div className="kpi__value" style={{ fontSize: 18, color: supplier.paymentSummary?.balance > 0 ? 'var(--danger)' : 'var(--fg)' }}>
              {fmt(supplier.paymentSummary?.balance)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Group Receipt Modal ------------------------------------------------------

function GroupReceiptModal({ supplierName, dateKey, items, onClose, onPrint }) {
  const [selectedIds, setSelectedIds] = useState(() => new Set(items.map(i => i.id)));

  const toggle = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => {
    if (selectedIds.size === items.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map(i => i.id)));
  };

  const selectedItems = items.filter(i => selectedIds.has(i.id));
  const selectedTotal = selectedItems.reduce((s, i) => s + parseFloat(i.amount ?? i.totalValue ?? 0), 0);

  const handlePrint = () => {
    if (selectedItems.length === 0) return;
    onPrint(buildGroupReceipt(supplierName, dateKey, selectedItems));
    onClose();
  };

  return (
    <div className="stoq-modal-backdrop">
      <div className="stoq-modal" style={{ maxWidth: 680, width: '100%' }}>
        <div className="stoq-modal__head">
          <div>
            <div className="stoq-modal__title">Receipt — {isNaN(Date.parse(dateKey)) ? dateKey : fmtDateGroup(dateKey)}</div>
            <div className="stoq-modal__sub">Select items to include on the printed receipt</div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="stoq-modal__body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="stoq-tbl">
              <thead>
                <tr>
                  <th className="no-sort" style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === items.length}
                      ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < items.length; }}
                      onChange={toggleAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th className="no-sort">SKU</th>
                  <th className="no-sort">Item Name</th>
                  <th className="no-sort">Qty</th>
                  <th className="no-sort">Unit</th>
                  <th className="no-sort num-cell">Unit Cost</th>
                  <th className="no-sort num-cell">Total</th>
                  <th className="no-sort">Site</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const checked = selectedIds.has(item.id);
                  const itemName  = item.stock?.itemName || item.itemName || item.reference || '—';
                  const itemSku   = item.stock?.sku || item.sku || '';
                  const itemQty   = item.quantity ?? '';
                  const itemUnit  = item.stock?.unit || item.unit || '';
                  const itemCost  = item.stock?.unitCost ?? item.unitCost ?? null;
                  const itemTotal = item.amount ?? item.totalValue ?? 0;
                  const itemSite  = item.stock?.site?.name || item.site?.name || '-';
                  return (
                    <tr key={item.id}
                      onClick={() => toggle(item.id)}
                      style={{ cursor: 'pointer', background: checked ? 'color-mix(in oklch, var(--accent) 5%, transparent)' : undefined }}>
                      <td onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={checked} onChange={() => toggle(item.id)} style={{ cursor: 'pointer' }} />
                      </td>
                      <td><span className="cell-stack__sub" style={{ display: 'inline' }}>{itemSku}</span></td>
                      <td><span className="cell-stack__main">{itemName}</span></td>
                      <td>{itemQty}</td>
                      <td style={{ color: 'var(--fg-subtle)' }}>{itemUnit}</td>
                      <td className="num-cell">{itemCost != null ? fmt(itemCost) : '—'}</td>
                      <td className="num-cell" style={{ fontWeight: 700 }}>{fmt(itemTotal)}</td>
                      <td style={{ color: 'var(--fg-subtle)' }}>{itemSite}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary footer inside modal body */}
          <div style={{ padding: '10px 16px', background: 'var(--bg-sunk)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
              {selectedIds.size} of {items.length} items selected
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {fmt(selectedTotal)}
            </span>
          </div>
        </div>

        <div className="stoq-modal__foot">
          <button className="stoq-btn" onClick={onClose}>Cancel</button>
          <button
            className="stoq-btn stoq-btn--primary"
            disabled={selectedIds.size === 0}
            style={{ opacity: selectedIds.size === 0 ? 0.5 : 1 }}
            onClick={handlePrint}>
            <Printer size={13} /> Print Receipt ({selectedIds.size})
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Delete Confirm Modal -----------------------------------------------------

function DeleteConfirmModal({ payment, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try { await onConfirm(); }
    catch (e) { setError(e?.response?.data?.message || 'Failed to delete. Please try again.'); setLoading(false); }
  };
  const isDebitWithLinks = payment.type === 'DEBIT' && payment.notes?.startsWith('PAID_CREDITS:');
  const isPaidCredit = payment.type === 'CREDIT' && (payment.status === 'PAID' || payment.status === 'PARTIAL');
  return (
    <div className="stoq-modal-backdrop">
      <div className="stoq-modal" style={{ maxWidth: 420 }}>
        <div className="stoq-modal__head">
          <div className="stoq-modal__title">Delete Transaction</div>
          <button className="icon-btn" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="stoq-modal__body" style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 13 }}>
            Are you sure you want to delete this <strong>{payment.type === 'CREDIT' ? 'invoice (credit)' : 'payment (debit)'}</strong>?
          </p>
          <p style={{ fontSize: 12, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>
            {fmt(payment.amount)}{payment.reference ? ` · ${payment.reference}` : ''}
          </p>
          {isDebitWithLinks && (
            <div style={{ fontSize: 12, color: 'var(--warning)', background: 'color-mix(in oklch, var(--warning) 10%, transparent)', padding: '8px 12px', borderRadius: 6, borderLeft: '3px solid var(--warning)' }}>
              This payment covers linked invoices — deleting it will restore their unpaid/partial status automatically.
            </div>
          )}
          {isPaidCredit && (
            <div style={{ fontSize: 12, color: 'var(--warning)', background: 'color-mix(in oklch, var(--warning) 10%, transparent)', padding: '8px 12px', borderRadius: 6, borderLeft: '3px solid var(--warning)' }}>
              This invoice has been partially or fully paid. Deleting it does not reverse the payment records.
            </div>
          )}
          {error && <p style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</p>}
        </div>
        <div className="stoq-modal__foot">
          <button className="stoq-btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button
            className="stoq-btn"
            disabled={loading}
            style={{ opacity: loading ? 0.6 : 1, background: 'var(--danger, #e53e3e)', color: '#fff', border: 'none' }}
            onClick={handleConfirm}>
            {loading ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Tab: Items & Requisitions ------------------------------------------------

function TabItems({ supplier }) {
  const [expandedDates, setExpandedDates] = useState({});
  const [stockView, setStockView] = useState('table');
  const [stockPage, setStockPage] = useState(1);
  const [reqPage, setReqPage] = useState(1);
  const [groupModal, setGroupModal] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const PAGE = 10;

  // Filter state
  const [datePreset, setDatePreset]   = useState('');
  const [customFrom, setCustomFrom]   = useState('');
  const [customTo,   setCustomTo]     = useState('');
  const [siteFilter, setSiteFilter]   = useState('');
  const [search,     setSearch]       = useState('');

  const dateRange = getDateRange(datePreset, customFrom, customTo);

  // Unique sites from all stocks
  const allSites = React.useMemo(() => {
    const map = {};
    for (const s of supplier.stocks || []) {
      if (s.site?.id && !map[s.site.id]) map[s.site.id] = s.site;
    }
    return Object.values(map);
  }, [supplier.stocks]);

  const handlePreset = (val) => {
    setDatePreset(val);
    if (val !== 'custom') { setCustomFrom(''); setCustomTo(''); }
    setStockPage(1); setReqPage(1);
  };

  const allStocks = (supplier.stocks || []).filter(s => {
    if (!inRange(s.receivedDate || s.createdAt, dateRange)) return false;
    if (siteFilter && s.site?.id !== siteFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!((s.itemName || '').toLowerCase().includes(q) ||
            (s.sku || '').toLowerCase().includes(q) ||
            (s.category?.name || '').toLowerCase().includes(q))) return false;
    }
    return true;
  });
  const stockTotal = allStocks.length;

  // Group ALL items by date first, then paginate the groups so each date is always complete
  const allGrouped = allStocks.reduce((acc, s) => {
    const key = s.receivedDate ? new Date(s.receivedDate).toISOString().slice(0, 10) : 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});
  const allSortedDates = Object.keys(allGrouped).sort((a, b) => b.localeCompare(a));

  // Table view: paginate by date groups
  const groupTotalPages = Math.max(1, Math.ceil(allSortedDates.length / PAGE));
  const pagedDates = allSortedDates.slice((stockPage - 1) * PAGE, stockPage * PAGE);

  // Cards view: paginate individual items
  const stockTotalPages = Math.max(1, Math.ceil(stockTotal / PAGE));
  const pagedStocks = allStocks.slice((stockPage - 1) * PAGE, stockPage * PAGE);

  const toggleDate = (k) => setExpandedDates(p => ({ ...p, [k]: !p[k] }));

  useEffect(() => {
    if (pagedDates.length > 0) setExpandedDates({ [pagedDates[0]]: true });
  }, [stockPage, datePreset]);

  useEffect(() => { setStockPage(1); setReqPage(1); }, [datePreset, customFrom, customTo, siteFilter, search]);

  // Set of stock IDs at the selected site (for requisition site-filtering)
  const siteStockIds = React.useMemo(() => {
    if (!siteFilter) return null;
    return new Set((supplier.stocks || []).filter(s => s.site?.id === siteFilter).map(s => s.id));
  }, [siteFilter, supplier.stocks]);

  const allReqs = (supplier.requisitions || []).filter(r => {
    if (!inRange(r.createdAt, dateRange)) return false;
    if (siteStockIds && !r.items?.some(i => siteStockIds.has(i.stockId))) return false;
    if (search) {
      const q = search.toLowerCase();
      const emp = r.employee ? `${r.employee.firstName} ${r.employee.lastName}`.toLowerCase() : '';
      if (!(emp.includes(q) || r.id.toLowerCase().includes(q))) return false;
    }
    return true;
  });
  const reqTotal = allReqs.length;
  const reqTotalPages = Math.max(1, Math.ceil(reqTotal / PAGE));
  const pagedReqs = allReqs.slice((reqPage - 1) * PAGE, reqPage * PAGE);

  return (
    <>
      {receipt && <SupplierReceiptModal data={receipt} supplier={supplier} onClose={() => setReceipt(null)} />}
      {groupModal && (
        <GroupReceiptModal
          supplierName={supplier.name}
          dateKey={groupModal.dateKey}
          items={groupModal.items}
          onClose={() => setGroupModal(null)}
          onPrint={setReceipt}
        />
      )}

      <FilterBar
        preset={datePreset} customFrom={customFrom} customTo={customTo}
        onPreset={handlePreset}
        onCustomFrom={v => { setCustomFrom(v); setStockPage(1); }}
        onCustomTo={v => { setCustomTo(v); setStockPage(1); }}
        sites={allSites} siteFilter={siteFilter}
        onSiteFilter={v => { setSiteFilter(v); setStockPage(1); setReqPage(1); }}
        search={search} onSearch={v => { setSearch(v); setStockPage(1); setReqPage(1); }}
        onClear={() => { handlePreset(''); setCustomFrom(''); setCustomTo(''); setSiteFilter(''); setSearch(''); setStockPage(1); setReqPage(1); }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* -- Stock Items -- */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>Stock Items</span>
              <span style={{ fontSize: 11, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>{stockTotal} items</span>
            </div>
            <div className="stoq-segment">
              <button data-active={stockView === 'table' ? 'true' : undefined} onClick={() => setStockView('table')} title="Table"><List size={13} /></button>
              <button data-active={stockView === 'cards' ? 'true' : undefined} onClick={() => setStockView('cards')} title="Cards"><LayoutGrid size={13} /></button>
            </div>
          </div>

          {allStocks.length === 0 ? (
            <div className="stoq-empty stoq-panel">
              <div className="stoq-empty__icon"><Package size={28} /></div>
              <div className="stoq-empty__title">No stock items{(datePreset || siteFilter || search) ? ' matching filters' : ' yet'}</div>
            </div>

          ) : stockView === 'table' ? (
            <div className="stoq-panel">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {pagedDates.map(dateKey => {
                  const items = allGrouped[dateKey];
                  const isOpen = !!expandedDates[dateKey];
                  const groupTotal = items.reduce((s, i) => s + parseFloat(i.totalValue || 0), 0);
                  return (
                    <div key={dateKey} style={{ borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', gap: 10 }}>
                        {/* Left — expand toggle */}
                        <button type="button" onClick={() => toggleDate(dateKey)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', cursor: 'pointer', flex: 1, minWidth: 0, textAlign: 'left', padding: 0 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: isOpen ? 'var(--accent)' : 'var(--border-strong)', flexShrink: 0, display: 'inline-block' }} />
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{fmtDateGroup(dateKey)}</span>
                          <span className="stoq-badge stoq-badge--plain">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                        </button>
                        {/* Right — total + print + chevron */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>{fmt(groupTotal)}</span>
                          <button
                            type="button"
                            className="stoq-btn stoq-btn--sm stoq-btn--ghost"
                            title="Print receipt for this date"
                            onClick={e => { e.stopPropagation(); setGroupModal({ dateKey, items: allGrouped[dateKey] ?? items }); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Printer size={12} /> Receipt
                          </button>
                          <button type="button" onClick={() => toggleDate(dateKey)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}>
                            <ChevronDown size={14} style={{ color: 'var(--fg-subtle)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                          </button>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="table-wrap" style={{ borderTop: '1px solid var(--border)' }}>
                          <table className="stoq-tbl">
                            <thead>
                              <tr>{['SKU', 'Item Name', 'Qty', 'Unit', 'Unit Cost', 'Total', 'Site'].map(h => <th key={h} className="no-sort">{h}</th>)}</tr>
                            </thead>
                            <tbody>
                              {items.map(item => (
                                <tr key={item.id}>
                                  <td><span className="cell-stack__sub" style={{ display: 'inline' }}>{item.sku}</span></td>
                                  <td><span className="cell-stack__main">{item.itemName}</span></td>
                                  <td>{item.quantity}</td>
                                  <td style={{ color: 'var(--fg-subtle)' }}>{item.unit}</td>
                                  <td className="num-cell">{fmt(item.unitCost)}</td>
                                  <td className="num-cell" style={{ fontWeight: 700 }}>{fmt(item.totalValue)}</td>
                                  <td style={{ color: 'var(--fg-subtle)' }}>{item.site?.name || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <Pagination page={stockPage} totalPages={groupTotalPages} total={allSortedDates.length} onPage={setStockPage} label="date groups" />
            </div>

          ) : (
            <div className="stoq-panel">
              <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--gap-card)' }}>
                {pagedStocks.map(item => (
                  <div key={item.id} style={{ background: 'var(--bg-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-subtle)' }}>{item.sku}</span>
                      {item.quantity === 0
                        ? <span className="stoq-badge stoq-badge--danger">Out</span>
                        : item.quantity <= (item.reorderLevel ?? 0)
                          ? <span className="stoq-badge stoq-badge--warning">Low</span>
                          : null}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3, marginBottom: 4 }}>{item.itemName}</div>
                    <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginBottom: 10 }}>{item.category?.name || '-'} - {item.site?.name || '-'}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
                        {item.quantity} <span style={{ fontSize: 10, color: 'var(--fg-subtle)', fontWeight: 400 }}>{item.unit}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>{fmt(item.totalValue)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination page={stockPage} totalPages={stockTotalPages} total={stockTotal} onPage={setStockPage} label="items" />
            </div>
          )}
        </div>

        {/* -- Requisitions -- */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>Linked Requisitions</span>
            <span style={{ fontSize: 11, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>{reqTotal} total</span>
          </div>

          {allReqs.length === 0 ? (
            <div className="stoq-empty stoq-panel">
              <div className="stoq-empty__icon"><FileText size={28} /></div>
              <div className="stoq-empty__title">No requisitions{(datePreset || search) ? ' matching filters' : ' linked'}</div>
            </div>
          ) : (
            <div className="stoq-panel">
              <div className="table-wrap">
                <table className="stoq-tbl">
                  <thead>
                    <tr>{['ID', 'Date', 'Employee', 'Items', 'Status', ''].map(h => <th key={h} className="no-sort">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {pagedReqs.map(req => {
                      const badgeCls = REQ_BADGE[req.status] || 'stoq-badge';
                      const label = { PENDING: 'Pending', APPROVED: 'Approved', PARTIALLY_RECEIVED: 'Partial', FULLY_RECEIVED: 'Received', REJECTED: 'Rejected' }[req.status] || req.status;
                      return (
                        <tr key={req.id}>
                          <td><span className="cell-stack__sub" style={{ display: 'inline' }}>#{req.id.slice(-6).toUpperCase()}</span></td>
                          <td>{fmtDate(req.createdAt)}</td>
                          <td><span className="cell-stack__main">{req.employee ? `${req.employee.firstName} ${req.employee.lastName}` : '-'}</span></td>
                          <td>{req.items?.length ?? req._count?.items ?? 0}</td>
                          <td><span className={badgeCls}>{label}</span></td>
                          <td style={{ width: 36 }}>
                            <button className="stoq-btn stoq-btn--sm stoq-btn--icon" title="View Receipt"
                              onClick={() => setReceipt(buildRequisitionReceipt(req))}>
                              <FileText size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={reqPage} totalPages={reqTotalPages} total={reqTotal} onPage={setReqPage} label="requisitions" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// --- Tab: Finance -------------------------------------------------------------

const PAGE_SIZE = 20;

function groupByDate(payments) {
  const groups = {};
  for (const p of payments) {
    const key = new Date(p.date ?? p.createdAt).toISOString().slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

const STATUS_ORDER = { UNPAID: 0, PARTIAL: 1, PAID: 2 };
function sortByStatus(payments) {
  return [...payments].sort((a, b) => {
    const sa = STATUS_ORDER[a.status] ?? 0;
    const sb = STATUS_ORDER[b.status] ?? 0;
    if (sa !== sb) return sa - sb;
    if (a.type !== b.type) return a.type === 'CREDIT' ? -1 : 1;
    return 0;
  });
}

// ── Payment row with checkbox ─────────────────────────────────────────────────
function PaymentRow({ p, supplier, onReceipt, onEdit, onDelete, selected, onToggle, allPayments }) {
  const isCredit = p.type === 'CREDIT';
  const [expanded, setExpanded] = useState(false);

  const linkedCredits = React.useMemo(() => {
    if (!isCredit && p.notes?.startsWith('PAID_CREDITS:')) {
      const ids = p.notes.replace('PAID_CREDITS:', '').split(',')
        .filter(Boolean)
        .map(part => part.split('=')[0].trim());
      return (allPayments || []).filter(c => ids.includes(c.id));
    }
    return [];
  }, [p.notes, isCredit, allPayments]);

  const hasLinked = linkedCredits.length > 0;

  const handleReceipt = (e) => {
    e.stopPropagation();
    onReceipt(buildPaymentReceipt(p, supplier.name, linkedCredits));
  };

  const siteText = () => {
    if (p.stock?.site?.name) return p.stock.site.name;
    if (p.stock?.sku) return p.stock.sku;
    if (hasLinked) {
      const sites = [...new Set(linkedCredits.map(c => c.stock?.site?.name).filter(Boolean))];
      if (sites.length === 1) return `${sites[0]} (${linkedCredits.length})`;
      if (sites.length > 1) return `${linkedCredits.length} invoice${linkedCredits.length !== 1 ? 's' : ''}`;
      return `${linkedCredits.length} invoice${linkedCredits.length !== 1 ? 's' : ''}`;
    }
    if (p.requisitionItem) return p.requisitionItem.itemName;
    return '—';
  };

  return (
    <>
      <tr
        style={{ cursor: 'pointer', background: selected ? 'color-mix(in oklch, var(--accent) 5%, transparent)' : undefined }}
        onClick={onToggle}>
        <td style={{ width: 36 }} onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={!!selected} onChange={onToggle} style={{ cursor: 'pointer' }} />
        </td>
        <td style={{ width: 100 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span className={isCredit ? 'stoq-badge stoq-badge--warning' : 'stoq-badge stoq-badge--success'}>
              {isCredit ? 'Credit' : 'Debit'}
            </span>
            {isCredit && (
              <span className={p.status === 'PAID' ? 'stoq-badge stoq-badge--success' : p.status === 'PARTIAL' ? 'stoq-badge stoq-badge--warning' : 'stoq-badge'} style={{ fontSize: 9 }}>
                {p.status === 'PAID' ? 'Paid' : p.status === 'PARTIAL' ? 'Partial' : 'Unpaid'}
              </span>
            )}
            {p.requisitionItemId && (
              <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--accent)', background: 'color-mix(in oklch, var(--accent) 10%, transparent)', padding: '1px 4px', borderRadius: 3, display: 'inline-block' }}>REQ</span>
            )}
          </div>
        </td>
        <td>
          {p.reference && <span className="cell-stack__main">{p.reference}</span>}
          {p.notes && !p.notes.startsWith('PAID_CREDITS:') && <span className="cell-stack__sub">{p.notes}</span>}
        </td>
        <td style={{ width: 140, fontSize: 11, color: 'var(--fg-muted)' }}>
          {siteText()}
        </td>
        <td className="num-cell" style={{ width: 130, fontWeight: 700, color: isCredit ? 'var(--warning)' : 'var(--success)' }}>
          {isCredit && p.status === 'PARTIAL' ? (
            <div>
              <div>+ {fmt(parseFloat(p.amount) - parseFloat(p.paidAmount ?? 0))}</div>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', fontWeight: 400 }}>of {fmt(p.amount)}</div>
            </div>
          ) : (
            `${isCredit ? '+' : '−'} ${fmt(p.amount)}`
          )}
        </td>
        <td style={{ width: 90 }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {hasLinked && (
              <button className="stoq-btn stoq-btn--sm stoq-btn--icon" title={expanded ? 'Collapse' : 'View items'}
                onClick={() => setExpanded(x => !x)}>
                <ChevronDown size={12} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>
            )}
            <button className="stoq-btn stoq-btn--sm stoq-btn--icon" title="Edit" onClick={() => onEdit(p)}>
              <Edit2 size={12} />
            </button>
            <button className="stoq-btn stoq-btn--sm stoq-btn--icon" title="Delete"
              style={{ color: 'var(--danger)' }}
              onClick={(e) => { e.stopPropagation(); onDelete(p); }}>
              <Trash2 size={12} />
            </button>
            <button className="stoq-btn stoq-btn--sm stoq-btn--icon" title="View Receipt" onClick={handleReceipt}>
              <FileText size={12} />
            </button>
          </div>
        </td>
      </tr>
      {hasLinked && expanded && (
        <tr style={{ background: 'var(--bg-sunk)' }}>
          <td colSpan={6} style={{ padding: 0, borderBottom: '2px solid var(--border)' }}>
            <div style={{ padding: '8px 12px 10px 52px' }}>
              {(() => {
                // Parse per-credit paid amounts from notes: PAID_CREDITS:id=amount,id2=amount2
                const paidMap = {};
                if (p.notes?.startsWith('PAID_CREDITS:')) {
                  p.notes.replace('PAID_CREDITS:', '').split(',').forEach(part => {
                    const [cId, amt] = part.split('=');
                    if (cId && amt) paidMap[cId.trim()] = parseFloat(amt);
                  });
                }
                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr>
                        {['Reference', 'Item', 'Qty', 'Site', 'Invoice Total', 'Paid This Time'].map(h => (
                          <th key={h} style={{
                            textAlign: (h === 'Invoice Total' || h === 'Paid This Time' || h === 'Qty') ? 'right' : 'left',
                            padding: '3px 8px', color: 'var(--fg-subtle)',
                            fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {linkedCredits.map(credit => {
                        const paidThisTime = paidMap[credit.id];
                        return (
                          <tr key={credit.id} style={{ borderTop: '1px solid var(--border)' }}>
                            <td style={{ padding: '5px 8px', color: 'var(--fg-muted)' }}>{credit.reference || '—'}</td>
                            <td style={{ padding: '5px 8px' }}>{credit.stock?.itemName || credit.requisitionItem?.itemName || '—'}</td>
                            <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}>
                              {credit.quantity != null ? `${parseFloat(credit.quantity)}${credit.stock?.unit ? ' ' + credit.stock.unit : ''}` : '—'}
                            </td>
                            <td style={{ padding: '5px 8px', color: 'var(--fg-muted)' }}>{credit.stock?.site?.name || '—'}</td>
                            <td style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>
                              {fmt(credit.amount)}
                            </td>
                            <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                              {paidThisTime != null ? `− ${fmt(paidThisTime)}` : `− ${fmt(credit.amount)}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function TabFinance({ supplier, onRecordPayment, onRefresh, onBulkPay, onEditPayment }) {
  const summary = supplier.paymentSummary || { totalCredit: 0, totalDebit: 0, balance: 0 };
  const balance = summary.balance;
  const [receipt, setReceipt] = useState(null);
  const [groupModal, setGroupModal] = useState(null);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Filter state
  const [datePreset, setDatePreset] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [search,     setSearch]     = useState('');

  const dateRange = getDateRange(datePreset, customFrom, customTo);

  const handlePreset = (val) => {
    setDatePreset(val);
    if (val !== 'custom') { setCustomFrom(''); setCustomTo(''); }
    setPage(1); setSelectedIds(new Set());
  };

  // Merge manual payments + requisition-received payments into one unified list
  const normalPayments = supplier.normalPayments || supplier.payments || [];
  const reqPayments = (supplier.requisitionGroups || []).flatMap(g => g.items || []);

  // Unique sites from all payments
  const allSites = React.useMemo(() => {
    const map = {};
    for (const p of [...normalPayments, ...reqPayments]) {
      if (p.stock?.site?.id && !map[p.stock.site.id]) map[p.stock.site.id] = p.stock.site;
    }
    return Object.values(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplier]);

  // Lookup map: paymentId → siteId, for resolving linked credits in bulk DEBIT payments
  const paymentSiteMap = React.useMemo(() => {
    const map = {};
    for (const p of [...normalPayments, ...reqPayments]) {
      if (p.id) map[p.id] = p.stock?.site?.id || null;
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplier]);

  const allPaymentsFlat = [...normalPayments, ...reqPayments]
    .filter(p => {
      if (!inRange(p.date ?? p.createdAt, dateRange)) return false;
      if (siteFilter) {
        if (p.stockId) {
          if (p.stock?.site?.id !== siteFilter) return false;
        } else if (p.notes?.startsWith('PAID_CREDITS:')) {
          // Show bulk DEBIT only if at least one linked credit is from this site
          const ids = p.notes.replace('PAID_CREDITS:', '').split(',')
            .filter(Boolean).map(part => part.split('=')[0].trim());
          if (!ids.some(id => paymentSiteMap[id] === siteFilter)) return false;
        } else {
          return false;
        }
      }
      if (search) {
        const q = search.toLowerCase();
        if (!((p.stock?.itemName || '').toLowerCase().includes(q) ||
              (p.stock?.sku || '').toLowerCase().includes(q) ||
              (p.reference || '').toLowerCase().includes(q) ||
              (p.notes?.startsWith('PAID_CREDITS:') ? false : (p.notes || '').toLowerCase().includes(q)))) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.date ?? b.createdAt) - new Date(a.date ?? a.createdAt));

  const allGroups = groupByDate(allPaymentsFlat).map(([key, items]) => [key, sortByStatus(items)]);
  const totalPages = Math.max(1, Math.ceil(allGroups.length / PAGE_SIZE));
  const groups = allGroups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const togglePayment = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleGroup = (items) => {
    const groupIds = items.map(p => p.id);
    const allSelected = groupIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) groupIds.forEach(id => next.delete(id));
      else groupIds.forEach(id => next.add(id));
      return next;
    });
  };

  const selectGroupByType = (items, type) => {
    const typeIds = items.filter(p => p.type === type).map(p => p.id);
    setSelectedIds(prev => {
      const next = new Set(prev);
      typeIds.forEach(id => next.add(id));
      return next;
    });
  };

  const selectedPayments = allPaymentsFlat.filter(p => selectedIds.has(p.id));
  const selectedTotal = selectedPayments.reduce((s, p) => s + parseFloat(p.amount ?? 0), 0);
  const selectedRefs = selectedPayments.map(p => p.reference).filter(Boolean).join(', ');

  const creditItems = selectedPayments.filter(p => p.type === 'CREDIT' && p.status !== 'PAID');
  const allSelectedAreDebits = selectedPayments.length > 0 && selectedPayments.every(p => p.type === 'DEBIT');

  const handleBulkPay = () => {
    if (creditItems.length === 0) return;
    onBulkPay(creditItems);
    setSelectedIds(new Set());
  };

  const [pendingDelete, setPendingDelete] = useState(null);
  const handleDeleteConfirm = async () => {
    await supplierService.deletePayment(supplier.id, pendingDelete.id);
    setPendingDelete(null);
    setSelectedIds(prev => { const next = new Set(prev); next.delete(pendingDelete.id); return next; });
    onRefresh(); // reload data without opening the payment modal
  };

  return (
    <>
      {receipt && <SupplierReceiptModal data={receipt} supplier={supplier} onClose={() => setReceipt(null)} />}
      {groupModal && (
        <GroupReceiptModal
          supplierName={supplier.name}
          dateKey={groupModal.dateKey}
          items={groupModal.items}
          onClose={() => setGroupModal(null)}
          onPrint={setReceipt}
        />
      )}
      {pendingDelete && (
        <DeleteConfirmModal
          payment={pendingDelete}
          onConfirm={handleDeleteConfirm}
          onClose={() => setPendingDelete(null)}
        />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        <FilterBar
          preset={datePreset} customFrom={customFrom} customTo={customTo}
          onPreset={handlePreset}
          onCustomFrom={v => { setCustomFrom(v); setPage(1); }}
          onCustomTo={v => { setCustomTo(v); setPage(1); }}
          sites={allSites} siteFilter={siteFilter}
          onSiteFilter={v => { setSiteFilter(v); setPage(1); setSelectedIds(new Set()); }}
          search={search} onSearch={v => { setSearch(v); setPage(1); setSelectedIds(new Set()); }}
          onClear={() => { handlePreset(''); setCustomFrom(''); setCustomTo(''); setSiteFilter(''); setSearch(''); setPage(1); setSelectedIds(new Set()); }}
        />

        {/* KPI summary */}
        <div className="kpi-grid kpi-grid--3">
          <div className="kpi">
            <div className="kpi__label">
              <span className="kpi__icon" data-tone="warning"><ArrowUpCircle size={12} /></span>
              Total Invoiced
            </div>
            <div className="kpi__value" style={{ fontSize: 20 }}>{fmt(summary.totalCredit)}</div>
            <div className="kpi__foot">
              All credits recorded (incl. paid)
              {summary.totalQtyCredit > 0 && <span style={{ marginLeft: 6, fontWeight: 600, color: 'var(--fg)' }}>{summary.totalQtyCredit} units</span>}
            </div>
          </div>
          <div className="kpi">
            <div className="kpi__label">
              <span className="kpi__icon"><ArrowDownCircle size={12} /></span>
              Total Paid
            </div>
            <div className="kpi__value" style={{ fontSize: 20 }}>{fmt(summary.totalDebit)}</div>
            <div className="kpi__foot">
              Payments made to date
              {summary.totalQtyDebit > 0 && <span style={{ marginLeft: 6, fontWeight: 600, color: 'var(--fg)' }}>{summary.totalQtyDebit} units</span>}
            </div>
          </div>
          <div className="kpi">
            <div className="kpi__label">
              <span className="kpi__icon" data-tone={balance > 0 ? 'warning' : undefined}><CreditCard size={12} /></span>
              Balance Remaining
            </div>
            <div className="kpi__value" style={{ fontSize: 20, color: balance > 0 ? 'var(--danger)' : balance < 0 ? 'var(--success)' : 'var(--fg)' }}>
              {fmt(balance)}
            </div>
            <div className="kpi__foot">
              {balance > 0 ? 'Still owed to supplier' : balance < 0 ? 'Overpaid / Credit' : 'Fully settled'}
              {summary.outstandingQty > 0 && <span style={{ marginLeft: 6, fontWeight: 600, color: 'var(--danger)' }}>{summary.outstandingQty} units unpaid</span>}
            </div>
          </div>
        </div>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>
            {allPaymentsFlat.length} transaction{allPaymentsFlat.length !== 1 ? 's' : ''}
          </span>
          <button className="stoq-btn stoq-btn--primary stoq-btn--sm" onClick={onRecordPayment}>
            <Plus size={12} /> Record Transaction
          </button>
        </div>

        {/* ── PAYMENTS LIST ── */}
        {(
          allPaymentsFlat.length === 0 ? (
            <div className="stoq-empty" style={{ border: '1px dashed var(--border)', borderRadius: 'var(--r-md)' }}>
              <CreditCard size={28} className="stoq-empty__icon" />
              <div className="stoq-empty__title">No stock payments yet</div>
              <div>Record an invoice or payment to start tracking</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {groups.map(([dateKey, items]) => {
                const groupIds = items.map(p => p.id);
                const allGroupSelected = groupIds.every(id => selectedIds.has(id));
                const someGroupSelected = groupIds.some(id => selectedIds.has(id));
                const dayCredit = items.filter(p => p.type === 'CREDIT').reduce((s, p) => s + parseFloat(p.amount), 0);
                const dayDebit  = items.filter(p => p.type === 'DEBIT').reduce((s, p) => s + parseFloat(p.amount), 0);
                return (
                  <div key={dateKey} className="stoq-panel">
                    <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-sunk)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                          type="checkbox"
                          checked={allGroupSelected}
                          ref={el => { if (el) el.indeterminate = someGroupSelected && !allGroupSelected; }}
                          onChange={() => toggleGroup(items)}
                          style={{ cursor: 'pointer' }}
                          title="Select all in this date"
                        />
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)' }}>{fmtDateGroup(dateKey)}</span>
                        <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{items.length} transaction{items.length !== 1 ? 's' : ''}</span>
                        {items.some(p => p.type === 'CREDIT') && (
                          <button type="button"
                            onClick={() => selectGroupByType(items, 'CREDIT')}
                            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 'var(--r-sm)', border: '1px solid var(--warning)', background: 'var(--warning-soft, #fff8e7)', color: 'var(--warning)', cursor: 'pointer', fontWeight: 600 }}>
                            Credits
                          </button>
                        )}
                        {items.some(p => p.type === 'DEBIT') && (
                          <button type="button"
                            onClick={() => selectGroupByType(items, 'DEBIT')}
                            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 'var(--r-sm)', border: '1px solid var(--success)', background: 'var(--success-soft)', color: 'var(--success)', cursor: 'pointer', fontWeight: 600 }}>
                            Debits
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                        {dayCredit > 0 && <span style={{ color: 'var(--warning)', fontWeight: 600 }}>+{fmt(dayCredit)}</span>}
                        {dayDebit > 0  && <span style={{ color: 'var(--success)', fontWeight: 600 }}>−{fmt(dayDebit)}</span>}
                      </div>
                    </div>
                    <div className="table-wrap">
                      <table className="stoq-tbl">
                        <tbody>
                          {items.map(p => (
                            <PaymentRow
                              key={p.id}
                              p={p}
                              supplier={supplier}
                              onReceipt={setReceipt}
                              onEdit={onEditPayment}
                              onDelete={setPendingDelete}
                              selected={selectedIds.has(p.id)}
                              onToggle={() => togglePayment(p.id)}
                              allPayments={allPaymentsFlat}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                  <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
                    Page {page} of {totalPages} · {allGroups.length} date group{allGroups.length !== 1 ? 's' : ''} · {allPaymentsFlat.length} transactions
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="stoq-btn stoq-btn--icon" disabled={page <= 1} style={{ opacity: page <= 1 ? 0.4 : 1 }} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft size={13} />
                    </button>
                    <button className="stoq-btn stoq-btn--icon" disabled={page >= totalPages} style={{ opacity: page >= totalPages ? 0.4 : 1 }} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* Net balance footer */}
              <div style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-sunk)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Net Balance</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {fmt(balance)}
                </span>
              </div>
            </div>
          )
        )}

      </div>

      {/* ── Bulk Pay floating bar ── */}
      {selectedIds.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--fg)', color: 'var(--bg)', borderRadius: 'var(--r-lg)',
          padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)', zIndex: 1000, minWidth: 360,
          animation: 'slideUp 0.18s ease-out',
        }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>
            {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
            {creditItems.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>
                ({creditItems.length} invoice{creditItems.length !== 1 ? 's' : ''})
              </span>
            )}
          </span>
          <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-mono)', flex: 1 }}>
            {fmt(selectedTotal)}
          </span>
          <button
            className="stoq-btn stoq-btn--sm"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'inherit', border: '1px solid rgba(255,255,255,0.2)' }}
            onClick={() => setSelectedIds(new Set())}>
            Clear
          </button>
          {allSelectedAreDebits && (
            <button
              className="stoq-btn stoq-btn--sm"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'inherit', border: '1px solid rgba(255,255,255,0.2)' }}
              onClick={() => {
                const allFlat = [...normalPayments, ...reqPayments];
                const paymentById = Object.fromEntries(allFlat.map(p => [p.id, p]));
                const seen = new Set();
                const expanded = [];
                for (const p of selectedPayments) {
                  if (p.notes?.startsWith('PAID_CREDITS:')) {
                    const parts = p.notes.replace('PAID_CREDITS:', '').split(',').filter(Boolean);
                    for (const part of parts) {
                      const id = part.split('=')[0].trim();
                      const credit = paymentById[id];
                      if (credit && !seen.has(credit.id)) { seen.add(credit.id); expanded.push(credit); }
                    }
                  } else if (!seen.has(p.id)) {
                    seen.add(p.id); expanded.push(p);
                  }
                }
                setGroupModal({ dateKey: 'Selected Payments', items: expanded });
              }}>
              <Printer size={13} /> Print Receipt
            </button>
          )}
          {creditItems.length > 0 && (
            <button
              className="stoq-btn stoq-btn--sm"
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 700 }}
              onClick={handleBulkPay}>
              <BadgeCheck size={13} /> Pay Credits ({creditItems.length})
            </button>
          )}
        </div>
      )}

      <style>{`@keyframes slideUp { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
    </>
  );
}

// --- Main Page ----------------------------------------------------------------

const TABS = [
  { id: 'info', label: 'Info', icon: Building2 },
  { id: 'items', label: 'Items & Requisitions', icon: Package },
  { id: 'finance', label: 'Finance', icon: CreditCard },
];

export default function SupplierDetail() {
  const navigate = useNavigate();
  const { path } = useRole();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'info');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentPrefill, setPaymentPrefill] = useState(null);
  const [editPayment, setEditPayment] = useState(null);
  const [bulkCreditItems, setBulkCreditItems] = useState(null);
  const [toast, setToast] = useState(null);

  // Date filter - persisted in URL
  const datePreset  = searchParams.get('date') || '';
  const customFrom  = searchParams.get('from') || '';
  const customTo    = searchParams.get('to')   || '';

  const setParam = (key, val) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val) next.set(key, val); else next.delete(key);
      return next;
    }, { replace: true });
  };

  const handlePreset = (val) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val) next.set('date', val); else next.delete('date');
      next.delete('from');
      next.delete('to');
      return next;
    }, { replace: true });
  };

  const handleTab = (tab) => {
    setActiveTab(tab);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    }, { replace: true });
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await supplierService.getOne(id);
      setSupplier(data);
    } catch {
      showToast('Failed to load supplier details', 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--fg-subtle)', gap: 10 }}>
      <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: 12 }}>Loading supplier details...</span>
    </div>
  );

  if (!supplier) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--fg-subtle)', gap: 10 }}>
      <AlertCircle size={24} style={{ color: 'var(--danger)' }} />
      <span style={{ fontSize: 12 }}>Supplier not found</span>
      <button className="stoq-btn stoq-btn--ghost" onClick={() => navigate(path('/suppliers'))}>
        â† Back to Suppliers
      </button>
    </div>
  );

  const statusLabel = { ACTIVE: 'Active', INACTIVE: 'Inactive', SUSPENDED: 'Suspended' }[supplier.status] || supplier.status;
  const statusBadge = STATUS_BADGE[supplier.status] || 'stoq-badge';

  return (
    <div style={{ padding: '20px 24px 32px' }}>
      {toast && (
        <div className={`stoq-toast ${toast.type === 'error' ? 'stoq-toast--error' : 'stoq-toast--success'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'error' ? <AlertCircle size={13} /> : <CheckCircle size={13} />}
          {toast.message}
        </div>
      )}

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
        <button className="icon-btn" onClick={() => navigate(path('/suppliers'))} style={{ marginTop: 2, flexShrink: 0 }}>
          <ArrowLeft size={14} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="stoq-crumbs" style={{ marginBottom: 6 }}>
            <span>Suppliers</span>
            <span className="stoq-crumbs__sep">/</span>
            <span className="stoq-crumbs__current">{supplier.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--fg)' }}>
              {supplier.name}
            </h1>
            <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: 'var(--bg-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--r-xs)', padding: '2px 6px', color: 'var(--fg-subtle)' }}>
              {supplier.code}
            </code>
            <span className={statusBadge}>{statusLabel}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
            <StarRating rating={supplier.rating} />
            {supplier.city && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--fg-subtle)' }}>
                <MapPin size={11} /> {supplier.city}{supplier.country ? `, ${supplier.country}` : ''}
              </span>
            )}
            {supplier.email && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--fg-subtle)' }}>
                <Mail size={11} /> {supplier.email}
              </span>
            )}
          </div>
        </div>

        <button className="stoq-btn" onClick={() => navigate(path(`/suppliers/edit/${supplier.id}`))} style={{ flexShrink: 0 }}>
          <Edit2 size={13} /> Edit
        </button>
      </div>


      {/* Tabs */}
      <div className="stoq-tabs">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id}
              className="stoq-tab"
              data-active={activeTab === tab.id ? 'true' : 'false'}
              onClick={() => handleTab(tab.id)}>
              <Icon size={13} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'info' && <TabInfo supplier={supplier} />}
      {activeTab === 'items' && <TabItems supplier={supplier} />}
      {activeTab === 'finance' && (
        <TabFinance
          supplier={supplier}
          onRecordPayment={() => { setPaymentPrefill(null); setShowPayment(true); }}
          onRefresh={load}
          onBulkPay={(credits) => setBulkCreditItems(credits)}
          onEditPayment={(p) => setEditPayment(p)}
        />
      )}

      {showPayment && (
        <PaymentModal
          supplierId={supplier.id}
          availableStocks={supplier.stocks || []}
          onClose={() => { setShowPayment(false); setPaymentPrefill(null); }}
          onSuccess={(msg) => { showToast(msg); load(); }}
        />
      )}

      {editPayment && (
        <PaymentModal
          supplierId={supplier.id}
          availableStocks={supplier.stocks || []}
          editMode
          payment={editPayment}
          onClose={() => setEditPayment(null)}
          onSuccess={(msg) => { showToast(msg); load(); }}
        />
      )}

      {bulkCreditItems && (
        <BulkCreditPayModal
          supplierId={supplier.id}
          credits={bulkCreditItems}
          onClose={() => setBulkCreditItems(null)}
          onSuccess={(msg) => { showToast(msg); load(); }}
        />
      )}
    </div>
  );
}

