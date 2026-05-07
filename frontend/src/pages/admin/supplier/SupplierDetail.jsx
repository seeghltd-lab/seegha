import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Star, Mail, Phone, MapPin, Building2, FileText,
  Package, CreditCard, ArrowUpCircle, ArrowDownCircle, ChevronDown,
  X, RefreshCw, Plus, AlertCircle, CheckCircle,
  TrendingDown, Edit2, List, LayoutGrid, ChevronLeft, ChevronRight, Calendar, Printer,
} from 'lucide-react';
import supplierService from '../../../services/supplierService';
import { useRole } from '../../../hooks/useRole';
import ReceiptModal, { buildPaymentReceipt, buildGroupReceipt, buildRequisitionReceipt, SupplierReceiptModal } from '../../../components/ReceiptModal';

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

// --- Date Filter Bar ----------------------------------------------------------

function DateFilterBar({ preset, customFrom, customTo, onPreset, onCustomFrom, onCustomTo }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 0', marginBottom: 12 }}>
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

function PaymentModal({ supplierId, stocks, onClose, onSuccess, prefill }) {
  const [type, setType] = useState(prefill?.type || 'DEBIT');
  const [amount, setAmount] = useState(prefill?.amount != null ? String(prefill.amount) : '');
  const [stockId, setStockId] = useState('');
  const [reference, setReference] = useState(prefill?.reference || '');
  const [notes, setNotes] = useState(prefill?.notes || '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { setError('Please enter a valid amount'); return; }
    setError('');
    setSubmitting(true);
    try {
      await supplierService.addPayment(supplierId, { type, amount: parseFloat(amount), stockId: stockId || undefined, reference, notes, date });
      onSuccess(type === 'CREDIT' ? 'Invoice recorded' : 'Payment recorded');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stoq-modal-backdrop">
      <div className="stoq-modal">
        <div className="stoq-modal__head">
          <div>
            <div className="stoq-modal__title">Record Transaction</div>
            <div className="stoq-modal__sub">Track financial activity with this supplier</div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={14} /></button>
        </div>

        <form onSubmit={handleSubmit} className="stoq-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Type selector */}
          <div className="stoq-field">
            <label className="stoq-field__label">Transaction Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { val: 'CREDIT', Icon: ArrowUpCircle, label: 'Credit', sub: 'Invoice - We owe', color: 'var(--warning)' },
                { val: 'DEBIT', Icon: ArrowDownCircle, label: 'Debit', sub: 'Payment - We paid', color: 'var(--success)' },
              ].map(({ val, Icon, label, sub, color }) => (
                <button key={val} type="button" onClick={() => setType(val)}
                  style={{
                    padding: '10px 12px', borderRadius: 'var(--r-md)', textAlign: 'left',
                    border: `1.5px solid ${type === val ? color : 'var(--border)'}`,
                    background: type === val ? `color-mix(in oklch, ${color} 8%, var(--panel))` : 'var(--panel)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  <Icon size={16} style={{ color: type === val ? color : 'var(--fg-subtle)', marginBottom: 4 }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="stoq-field">
            <label className="stoq-field__label">Amount (RWF) <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
              className="stoq-input" placeholder="0.00" />
          </div>

          {/* Linked stock */}
          {stocks?.length > 0 && (
            <div className="stoq-field">
              <label className="stoq-field__label">Linked Stock Item (optional)</label>
              <select value={stockId} onChange={e => setStockId(e.target.value)} className="stoq-select" style={{ width: '100%' }}>
                <option value="">- No specific item -</option>
                {stocks.map(s => <option key={s.id} value={s.id}>{s.itemName} ({s.sku})</option>)}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="stoq-field">
              <label className="stoq-field__label">Reference / Invoice #</label>
              <input value={reference} onChange={e => setReference(e.target.value)}
                className="stoq-input" placeholder="INV-001" />
            </div>
            <div className="stoq-field">
              <label className="stoq-field__label">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="stoq-input" />
            </div>
          </div>

          <div className="stoq-field">
            <label className="stoq-field__label">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="stoq-input" style={{ height: 'auto', padding: '8px 10px', resize: 'none' }}
              placeholder="Optional notes..." />
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--danger-soft)', borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--danger)' }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}
        </form>

        <div className="stoq-modal__foot">
          <button type="button" className="stoq-btn" onClick={onClose}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="stoq-btn stoq-btn--primary"
            style={{ opacity: submitting ? 0.6 : 1 }}>
            {submitting && <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />}
            {type === 'CREDIT' ? 'Record Invoice' : 'Record Payment'}
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
  const selectedTotal = selectedItems.reduce((s, i) => s + parseFloat(i.totalValue || 0), 0);

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
            <div className="stoq-modal__title">Receipt — {fmtDateGroup(dateKey)}</div>
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
                  return (
                    <tr key={item.id}
                      onClick={() => toggle(item.id)}
                      style={{ cursor: 'pointer', background: checked ? 'color-mix(in oklch, var(--accent) 5%, transparent)' : undefined }}>
                      <td onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={checked} onChange={() => toggle(item.id)} style={{ cursor: 'pointer' }} />
                      </td>
                      <td><span className="cell-stack__sub" style={{ display: 'inline' }}>{item.sku}</span></td>
                      <td><span className="cell-stack__main">{item.itemName}</span></td>
                      <td>{item.quantity}</td>
                      <td style={{ color: 'var(--fg-subtle)' }}>{item.unit}</td>
                      <td className="num-cell">{fmt(item.unitCost)}</td>
                      <td className="num-cell" style={{ fontWeight: 700 }}>{fmt(item.totalValue)}</td>
                      <td style={{ color: 'var(--fg-subtle)' }}>{item.site?.name || '-'}</td>
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

// --- Tab: Items & Requisitions ------------------------------------------------

function TabItems({ supplier, datePreset, customFrom, customTo }) {
  const [expandedDates, setExpandedDates] = useState({});
  const [stockView, setStockView] = useState('table');
  const [stockPage, setStockPage] = useState(1);
  const [reqPage, setReqPage] = useState(1);
  const [groupModal, setGroupModal] = useState(null); // { dateKey, items }
  const [receipt, setReceipt] = useState(null);
  const PAGE = 10;

  const dateRange = getDateRange(datePreset, customFrom, customTo);

  const allStocks = (supplier.stocks || []).filter(s =>
    inRange(s.receivedDate || s.createdAt, dateRange)
  );

  const stockTotal = allStocks.length;
  const stockTotalPages = Math.max(1, Math.ceil(stockTotal / PAGE));
  const pagedStocks = allStocks.slice((stockPage - 1) * PAGE, stockPage * PAGE);

  const grouped = pagedStocks.reduce((acc, s) => {
    const key = s.receivedDate ? new Date(s.receivedDate).toISOString().slice(0, 10) : 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const toggleDate = (k) => setExpandedDates(p => ({ ...p, [k]: !p[k] }));

  useEffect(() => {
    if (sortedDates.length > 0) setExpandedDates({ [sortedDates[0]]: true });
  }, [stockPage, datePreset]);

  useEffect(() => { setStockPage(1); setReqPage(1); }, [datePreset, customFrom, customTo]);

  const allReqs = (supplier.requisitions || []).filter(r =>
    inRange(r.createdAt, dateRange)
  );
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
              <div className="stoq-empty__title">No stock items{datePreset ? ' in this period' : ' yet'}</div>
            </div>

          ) : stockView === 'table' ? (
            <div className="stoq-panel">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {sortedDates.map(dateKey => {
                  const items = grouped[dateKey];
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
                            onClick={e => { e.stopPropagation(); setGroupModal({ dateKey, items }); }}
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
              <Pagination page={stockPage} totalPages={stockTotalPages} total={stockTotal} onPage={setStockPage} label="items" />
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
              <div className="stoq-empty__title">No requisitions{datePreset ? ' in this period' : ' linked'}</div>
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
    const key = new Date(p.date).toISOString().slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

// ── Payment row with checkbox ─────────────────────────────────────────────────
function PaymentRow({ p, supplier, onReceipt, selected, onToggle }) {
  const isCredit = p.type === 'CREDIT';
  return (
    <tr
      style={{ cursor: 'pointer', background: selected ? 'color-mix(in oklch, var(--accent) 5%, transparent)' : undefined }}
      onClick={onToggle}>
      <td style={{ width: 36 }} onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={!!selected} onChange={onToggle} style={{ cursor: 'pointer' }} />
      </td>
      <td style={{ width: 70 }}>
        <span className={isCredit ? 'stoq-badge stoq-badge--warning' : 'stoq-badge stoq-badge--success'}>
          {isCredit ? 'Credit' : 'Debit'}
        </span>
      </td>
      <td>
        {p.reference && <span className="cell-stack__main">{p.reference}</span>}
        {p.notes && <span className="cell-stack__sub">{p.notes}</span>}
        {!p.reference && !p.notes && <span style={{ color: 'var(--fg-subtle)', fontStyle: 'italic' }}>No reference</span>}
      </td>
      <td style={{ width: 120 }}>
        {p.stock
          ? <span className="stoq-badge stoq-badge--plain" style={{ fontFamily: 'var(--font-mono)' }}>{p.stock.sku}</span>
          : p.requisitionItem
            ? <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{p.requisitionItem.itemName}</span>
            : <span style={{ color: 'var(--fg-subtle)' }}>—</span>}
      </td>
      <td className="num-cell" style={{ width: 130, fontWeight: 700, color: isCredit ? 'var(--warning)' : 'var(--success)' }}>
        {isCredit ? '+' : '−'} {fmt(p.amount)}
      </td>
      <td style={{ width: 36 }} onClick={e => e.stopPropagation()}>
        <button className="stoq-btn stoq-btn--sm stoq-btn--icon" title="View Receipt"
          onClick={() => onReceipt(buildPaymentReceipt(p, supplier.name))}>
          <FileText size={12} />
        </button>
      </td>
    </tr>
  );
}

function TabFinance({ supplier, onRecordPayment, onBulkPay }) {
  const summary = supplier.paymentSummary || { totalCredit: 0, totalDebit: 0, balance: 0 };
  const balance = summary.balance;
  const [receipt, setReceipt] = useState(null);
  const [financeTab, setFinanceTab] = useState('payments');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const normalPayments = supplier.normalPayments || supplier.payments || [];
  const requisitionGroups = supplier.requisitionGroups || [];

  const switchTab = (t) => { setFinanceTab(t); setPage(1); setSelectedIds(new Set()); };

  const totalPages = Math.max(1, Math.ceil(normalPayments.length / PAGE_SIZE));
  const paged = normalPayments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const groups = groupByDate(paged);

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

  const selectedPayments = normalPayments.filter(p => selectedIds.has(p.id));
  const selectedTotal = selectedPayments.reduce((s, p) => s + parseFloat(p.amount ?? 0), 0);
  const selectedRefs = selectedPayments.map(p => p.reference).filter(Boolean).join(', ');

  const handleBulkPay = () => {
    onBulkPay({ amount: selectedTotal, reference: selectedRefs || undefined, count: selectedIds.size });
    setSelectedIds(new Set());
  };

  return (
    <>
      {receipt && <ReceiptModal data={receipt} onClose={() => setReceipt(null)} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* KPI summary */}
        <div className="kpi-grid kpi-grid--3">
          <div className="kpi">
            <div className="kpi__label">
              <span className="kpi__icon" data-tone="warning"><ArrowUpCircle size={12} /></span>
              Total Invoiced
            </div>
            <div className="kpi__value" style={{ fontSize: 20 }}>{fmt(summary.totalCredit)}</div>
            <div className="kpi__foot">Amount owed to supplier</div>
          </div>
          <div className="kpi">
            <div className="kpi__label">
              <span className="kpi__icon"><ArrowDownCircle size={12} /></span>
              Total Paid
            </div>
            <div className="kpi__value" style={{ fontSize: 20 }}>{fmt(summary.totalDebit)}</div>
            <div className="kpi__foot">Payments made to date</div>
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
            </div>
          </div>
        </div>

        {/* Sub-tab header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div className="stoq-segment">
            <button data-active={financeTab === 'payments' ? 'true' : undefined} onClick={() => switchTab('payments')}>
              Stock Payments
              <span style={{ marginLeft: 5, fontSize: 10, color: 'var(--fg-subtle)' }}>({normalPayments.length})</span>
            </button>
            <button data-active={financeTab === 'requisitions' ? 'true' : undefined} onClick={() => switchTab('requisitions')}>
              Requisitions
              <span style={{ marginLeft: 5, fontSize: 10, color: 'var(--fg-subtle)' }}>({requisitionGroups.length})</span>
            </button>
          </div>
          <button className="stoq-btn stoq-btn--primary stoq-btn--sm" onClick={onRecordPayment}>
            <Plus size={12} /> Record Transaction
          </button>
        </div>

        {/* ── STOCK PAYMENTS SUB-TAB ── */}
        {financeTab === 'payments' && (
          normalPayments.length === 0 ? (
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
                              selected={selectedIds.has(p.id)}
                              onToggle={() => togglePayment(p.id)}
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
                    Page {page} of {totalPages} · {normalPayments.length} transactions
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

        {/* ── REQUISITIONS SUB-TAB ── */}
        {financeTab === 'requisitions' && (
          requisitionGroups.length === 0 ? (
            <div className="stoq-empty" style={{ border: '1px dashed var(--border)', borderRadius: 'var(--r-md)' }}>
              <FileText size={28} className="stoq-empty__icon" />
              <div className="stoq-empty__title">No requisition payments yet</div>
              <div>Payments are created automatically when requisition items are received</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {requisitionGroups.map(group => {
                const groupTotal = group.items.reduce((s, p) => {
                  return p.type === 'CREDIT' ? s + parseFloat(p.amount) : s - parseFloat(p.amount);
                }, 0);
                const reqLabel = `REQ-${(group.requisitionId || '').slice(-6).toUpperCase()}`;
                const reqStatus = group.requisition?.status;
                const REQ_BADGE_MAP = {
                  PENDING: 'stoq-badge stoq-badge--warning',
                  APPROVED: 'stoq-badge stoq-badge--accent',
                  PARTIALLY_RECEIVED: 'stoq-badge stoq-badge--warning',
                  FULLY_RECEIVED: 'stoq-badge stoq-badge--success',
                  REJECTED: 'stoq-badge stoq-badge--danger',
                };
                return (
                  <div key={group.requisitionId} className="stoq-panel">
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-sunk)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--fg)' }}>{reqLabel}</span>
                        {reqStatus && <span className={REQ_BADGE_MAP[reqStatus] || 'stoq-badge'}>{reqStatus.replace(/_/g, ' ')}</span>}
                        <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{group.items.length} payment{group.items.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {group.requisition?.createdAt && (
                          <span style={{ fontSize: 11, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>{fmtDate(group.requisition.createdAt)}</span>
                        )}
                        <span style={{ fontSize: 12, fontWeight: 700, color: groupTotal >= 0 ? 'var(--warning)' : 'var(--success)' }}>
                          {groupTotal >= 0 ? '+' : '−'}{fmt(Math.abs(groupTotal))}
                        </span>
                      </div>
                    </div>
                    <div className="table-wrap">
                      <table className="stoq-tbl">
                        <thead>
                          <tr>
                            <th className="no-sort" style={{ width: 70 }}>Type</th>
                            <th className="no-sort">Item</th>
                            <th className="no-sort" style={{ width: 80 }}>Qty</th>
                            <th className="no-sort num-cell" style={{ width: 130 }}>Amount</th>
                            <th className="no-sort" style={{ width: 36 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.items.map(p => {
                            const isCredit = p.type === 'CREDIT';
                            return (
                              <tr key={p.id}>
                                <td><span className={isCredit ? 'stoq-badge stoq-badge--warning' : 'stoq-badge stoq-badge--success'}>{isCredit ? 'Credit' : 'Debit'}</span></td>
                                <td>
                                  <span className="cell-stack__main">{p.requisitionItem?.itemName || p.reference || '—'}</span>
                                  {p.notes && <span className="cell-stack__sub">{p.notes}</span>}
                                </td>
                                <td style={{ color: 'var(--fg-muted)', fontSize: 11 }}>{p.quantity != null ? `${p.quantity} ${p.requisitionItem?.unit || ''}` : '—'}</td>
                                <td className="num-cell" style={{ fontWeight: 700, color: isCredit ? 'var(--warning)' : 'var(--success)' }}>{isCredit ? '+' : '−'} {fmt(p.amount)}</td>
                                <td>
                                  <button className="stoq-btn stoq-btn--sm stoq-btn--icon" title="View Receipt"
                                    onClick={() => setReceipt(buildPaymentReceipt(p, supplier.name))}>
                                    <FileText size={12} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
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
          <button
            className="stoq-btn stoq-btn--sm"
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 700 }}
            onClick={handleBulkPay}>
            <CreditCard size={13} /> Pay Selected
          </button>
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

      {/* Date filter - shown on items tab */}
      {activeTab === 'items' && (
        <DateFilterBar
          preset={datePreset}
          customFrom={customFrom}
          customTo={customTo}
          onPreset={handlePreset}
          onCustomFrom={v => setParam('from', v)}
          onCustomTo={v => setParam('to', v)}
        />
      )}

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
      {activeTab === 'items' && (
        <TabItems
          supplier={supplier}
          datePreset={datePreset}
          customFrom={customFrom}
          customTo={customTo}
        />
      )}
      {activeTab === 'finance' && (
        <TabFinance
          supplier={supplier}
          onRecordPayment={() => { setPaymentPrefill(null); setShowPayment(true); }}
          onBulkPay={(prefill) => { setPaymentPrefill(prefill); setShowPayment(true); }}
        />
      )}

      {showPayment && (
        <PaymentModal
          supplierId={supplier.id}
          stocks={supplier.stocks}
          prefill={paymentPrefill}
          onClose={() => { setShowPayment(false); setPaymentPrefill(null); }}
          onSuccess={(msg) => { showToast(msg); load(); }}
        />
      )}
    </div>
  );
}

