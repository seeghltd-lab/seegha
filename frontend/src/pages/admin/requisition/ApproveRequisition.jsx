import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { Plus, Trash2, X, Search, ArrowLeft, CheckCircle, AlertCircle, Truck, RefreshCw, List, LayoutGrid, ChevronDown, MapPin } from 'lucide-react';
import requisitionService from '../../../services/requisitionService';
import stockService from '../../../services/stockService';
import supplierService from '../../../services/supplierService';
import UnitPicker from '../../../components/UnitPicker';
import { useViewMode } from '../../../hooks/useViewMode';

const fmt = (n) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0 }).format(n ?? 0);

function SearchableSelect({ label, options, value, onChange, placeholder, onCreate, createLabel, error }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const ref = useRef(null);

  const filtered = options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()));
  const selected = options.find(o => o.value === value);
  const showCreate = onCreate && q.trim();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCreate = async () => {
    if (!q.trim() || creating) return;
    setCreating(true);
    try {
      const newId = await onCreate(q.trim());
      onChange(newId);
      setOpen(false);
      setQ('');
    } finally { setCreating(false); }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {label && <label className="stoq-field__label">{label}</label>}
      <button type="button" onClick={() => { setOpen(!open); setQ(''); }}
        className="stoq-input"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left', width: '100%', ...(error ? { borderColor: 'var(--danger)' } : {}) }}>
        <span style={{ color: selected ? 'var(--fg)' : 'var(--fg-subtle)', fontWeight: selected ? 500 : 400 }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={13} style={{ color: 'var(--fg-subtle)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', zIndex: 30, width: '100%', marginTop: 2, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-lg)', maxHeight: 220, overflowY: 'auto' }}>
          <div style={{ padding: 6, borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-elev)' }}>
            <input autoFocus value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (showCreate) handleCreate(); } }}
              className="stoq-input" style={{ height: 28, fontSize: 11 }}
              placeholder={onCreate ? 'Search or type to create…' : 'Search…'} />
          </div>
          <div>
            <button type="button" onClick={() => { onChange(''); setOpen(false); }}
              style={{ width: '100%', textAlign: 'left', padding: '7px 10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--fg-subtle)' }}>
              None
            </button>
            {filtered.map(o => (
              <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); setQ(''); }}
                style={{ width: '100%', textAlign: 'left', padding: '7px 10px', background: value === o.value ? 'var(--accent-soft)' : 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: value === o.value ? 'var(--accent-soft-fg)' : 'var(--fg)', fontWeight: value === o.value ? 600 : 400 }}
                onMouseEnter={e => { if (value !== o.value) e.currentTarget.style.background = 'var(--bg-sunk)'; }}
                onMouseLeave={e => { if (value !== o.value) e.currentTarget.style.background = 'none'; }}>
                {o.label}
              </button>
            ))}
            {showCreate && (
              <button type="button" onClick={handleCreate} disabled={creating}
                style={{ width: '100%', textAlign: 'left', padding: '7px 10px', background: 'none', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer', fontSize: 12, color: 'var(--accent-soft-fg)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={12} />
                {creating ? 'Creating…' : `Create ${createLabel} "${q.trim()}"`}
              </button>
            )}
            {!q.trim() && options.length === 0 && (
              <p style={{ padding: '8px 10px', fontSize: 11, color: 'var(--fg-subtle)' }}>No {createLabel}s yet.{onCreate ? ' Type a name to create one.' : ''}</p>
            )}
          </div>
        </div>
      )}
      {error && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>{error}</p>}
    </div>
  );
}

export default function ApproveRequisition() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useOutletContext() ?? {};
  const backBase = role === 'employee' ? '/requisitions' : '/admin/requisition-management';

  const [requisition, setRequisition] = useState(null);
  const [items, setItems] = useState([]);
  const [allStocks, setAllStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [notes, setNotes] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState(null);
  const [itemView, setItemView] = useViewMode('requisition-items', 'cards');

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const handleCreateSupplier = async (name) => {
    const sup = await supplierService.create({ name });
    const opt = { value: sup.id, label: `${sup.name} (${sup.code})` };
    setSuppliers(prev => [...prev, opt]);
    showToast(`Supplier "${name}" created`);
    return sup.id;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const req = await requisitionService.getOne(id);
        const [stockData, supplierList] = await Promise.all([
          stockService.getAll({ siteId: req.siteId || undefined, limit: 500 }),
          supplierService.getForSelect().then(data => data.map(s => ({ value: s.id, label: `${s.name} (${s.code})` }))).catch(() => []),
        ]);
        setRequisition(req);
        setSupplierId(req.supplierId || '');
        setSuppliers(supplierList ?? []);
        setItems(req.items.map(item => ({ ...item, costPrice: item.costPrice ?? (item.stock ? Number(item.stock.unitCost) : ''), paymentType: item.paymentType ?? 'NONE', isNew: false, remove: false })));
        const stocks = stockData.stocks ?? stockData;
        setAllStocks(stocks);
        setFilteredStocks(stocks);
      } catch { setErrors({ load: 'Failed to load requisition.' }); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!searchTerm.trim()) { setFilteredStocks(allStocks); return; }
    const t = searchTerm.toLowerCase();
    setFilteredStocks(allStocks.filter(s => s.itemName?.toLowerCase().includes(t) || s.sku?.toLowerCase().includes(t)));
  }, [searchTerm, allStocks]);

  const getStock = (stockId) => allStocks.find(s => s.id === stockId) || null;
  const isAlreadySelected = (stockId, currentIdx) => items.some((item, i) => i !== currentIdx && item.stockId === stockId && !item.remove);

  const openStockModal = (index) => { setSelectedItemIndex(index); setSearchTerm(''); setFilteredStocks(allStocks); setShowStockModal(true); };

  const selectStock = (stock) => {
    if (selectedItemIndex === null || isAlreadySelected(stock.id, selectedItemIndex)) return;
    const next = [...items];
    next[selectedItemIndex] = { ...next[selectedItemIndex], stockId: stock.id, itemName: stock.itemName, unit: stock.unit, costPrice: Number(stock.unitCost) || '' };
    setItems(next);
    setShowStockModal(false);
    setSelectedItemIndex(null);
  };

  const handleItemChange = (index, field, value) => { const next = [...items]; next[index] = { ...next[index], [field]: value }; setItems(next); };
  const addItem = () => setItems([...items, { itemName: '', quantity: '', unit: '', note: '', stockId: '', costPrice: '', isNew: true, remove: false }]);
  const toggleRemove = (index) => { const next = [...items]; next[index].remove = !next[index].remove; setItems(next); };
  const removeNewItem = (index) => setItems(items.filter((_, i) => i !== index));
  const clearStock = (index) => { const next = [...items]; next[index] = { ...next[index], stockId: '', itemName: '', costPrice: '' }; setItems(next); };

  const estimatedTotal = items.filter(i => !i.remove).reduce((sum, item) => {
    const price = item.costPrice !== '' && item.costPrice != null ? Number(item.costPrice) : 0;
    return sum + (Number(item.quantity) || 0) * price;
  }, 0);

  const validate = () => {
    const errs = {};
    const active = items.filter(i => !i.remove);
    if (active.length === 0) errs.items = 'At least one item is required';
    active.forEach(item => {
      const idx = items.indexOf(item);
      if (!item.itemName?.trim()) errs[`items.${idx}.itemName`] = 'Required';
      if (!item.quantity || Number(item.quantity) <= 0) errs[`items.${idx}.quantity`] = 'Must be > 0';
      if (!item.stockId && (item.costPrice === '' || item.costPrice === null || item.costPrice === undefined || Number(item.costPrice) <= 0)) {
        errs[`items.${idx}.costPrice`] = 'Cost price required for items not linked to stock';
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleApprove = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setErrors({});
    try {
      const payload = {
        notes: notes || undefined,
        supplierId: supplierId || undefined,
        items: items.map(item => {
          if (item.remove && item.id) return { id: item.id, remove: true };
          const data = { itemName: item.itemName, quantity: Number(item.quantity), unit: item.unit, note: item.note || undefined, stockId: item.stockId || undefined, costPrice: item.costPrice !== '' && item.costPrice != null ? Number(item.costPrice) : undefined, paymentType: item.paymentType ?? 'NONE' };
          if (item.id && !item.isNew) data.id = item.id;
          return data;
        }),
      };
      await requisitionService.approve(id, payload);
      setSuccess(true);
      showToast('Requisition approved!');
      setTimeout(() => navigate(`${backBase}/${id}`), 1800);
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || err.message || 'Failed to approve' });
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 10, color: 'var(--fg-subtle)' }}>
      <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  if (errors.load || !requisition) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 10, color: 'var(--fg-subtle)' }}>
      <AlertCircle size={28} style={{ color: 'var(--danger)' }} />
      <span style={{ fontSize: 12 }}>{errors.load || 'Requisition not found'}</span>
      <button className="stoq-btn" onClick={() => navigate(-1)}>Go Back</button>
    </div>
  );

  return (
    <div style={{ padding: '20px 24px 40px' }}>
      {toast && (
        <div className={`stoq-toast ${toast.type === 'error' ? 'stoq-toast--error' : 'stoq-toast--success'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'error' ? <AlertCircle size={13} /> : <CheckCircle size={13} />}
          {toast.msg}
        </div>
      )}

      <div className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={14} /></button>
          <div>
            <div className="stoq-crumbs" style={{ marginBottom: 4 }}>
              <span>Requisitions</span><span className="stoq-crumbs__sep">/</span>
              <span className="stoq-crumbs__current">#{requisition.id.slice(-8).toUpperCase()}</span>
            </div>
            <h1>Review & Approve</h1>
            <div className="page-head__sub" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>{requisition.employee?.firstName} {requisition.employee?.lastName}{requisition.employee?.position ? ` · ${requisition.employee.position}` : ''}</span>
              {requisition.site && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  · <MapPin size={11} style={{ marginLeft: 2 }} /> {requisition.site.name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="page-head__actions">
          <button className="stoq-btn" onClick={() => navigate(-1)}>Cancel</button>
          <button className="stoq-btn stoq-btn--primary" disabled={submitting || success} onClick={handleApprove}
            style={{ background: 'var(--success)', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Approving…</> : <><CheckCircle size={13} /> Approve</>}
          </button>
        </div>
      </div>

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--success-soft)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--success)', marginBottom: 14 }}>
          <CheckCircle size={14} /> Approved! Redirecting…
        </div>
      )}
      {errors.submit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--danger-soft)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--danger)', marginBottom: 14 }}>
          <AlertCircle size={14} /> {errors.submit}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Supplier & Notes */}
        <div className="stoq-panel">
          <div className="stoq-panel__head">
            <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="kpi__icon"><Truck size={13} /></span>
              Approval Details
            </span>
          </div>
          <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="stoq-field">
              <label className="stoq-field__label">Supplier (optional)</label>
              <SearchableSelect
                options={suppliers}
                value={supplierId}
                onChange={setSupplierId}
                placeholder="Search or create supplier…"
                onCreate={handleCreateSupplier}
                createLabel="supplier"
              />
            </div>
            <div className="stoq-field">
              <label className="stoq-field__label">Approval Note (optional)</label>
              <textarea className="stoq-input" value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Note for the employee…" rows={2}
                style={{ height: 'auto', padding: '6px 10px', resize: 'none' }} />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="stoq-panel">
          <div className="stoq-panel__head">
            <span className="stoq-panel__title">Items</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* View toggle */}
              <div className="stoq-segment">
                <button data-active={itemView === 'cards' ? 'true' : undefined} onClick={() => setItemView('cards')} title="Card view"><LayoutGrid size={13} /></button>
                <button data-active={itemView === 'table' ? 'true' : undefined} onClick={() => setItemView('table')} title="Table view"><List size={13} /></button>
              </div>
              <button className="stoq-btn stoq-btn--sm stoq-btn--primary" onClick={addItem}>
                <Plus size={12} /> Add Item
              </button>
            </div>
          </div>
          {errors.items && <p style={{ fontSize: 12, color: 'var(--danger)', padding: '8px 16px' }}>{errors.items}</p>}

          {/* ── TABLE VIEW ── */}
          {itemView === 'table' && (
            <div className="table-wrap">
              <table className="stoq-tbl">
                <thead>
                  <tr>
                    <th className="no-sort">#</th>
                    <th className="no-sort">Item Name</th>
                    <th className="no-sort">Stock Link</th>
                    <th className="no-sort">Qty</th>
                    <th className="no-sort">Unit</th>
                    <th className="no-sort num-cell">Cost (RWF)</th>
                    <th className="no-sort">Note</th>
                    <th className="no-sort" style={{ width: 120 }}>Payment</th>
                    <th className="no-sort col-actions" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const stockInfo = item.stockId ? getStock(item.stockId) : null;
                    if (item.remove) return (
                      <tr key={idx} style={{ opacity: 0.4, background: 'var(--danger-soft)' }}>
                        <td><span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{idx + 1}</span></td>
                        <td colSpan={6}><span style={{ fontSize: 12, color: 'var(--danger)', fontStyle: 'italic' }}>Marked for removal: {item.itemName}</span></td>
                        <td>
                          <button className="icon-btn" onClick={() => toggleRemove(idx)} title="Undo" style={{ color: 'var(--success)' }}><X size={13} /></button>
                        </td>
                      </tr>
                    );
                    return (
                      <tr key={idx} style={{ background: item.isNew ? 'var(--success-soft)' : undefined }}>
                        <td>
                          <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{idx + 1}</span>
                          {item.isNew && <span className="stoq-badge stoq-badge--success stoq-badge--plain" style={{ marginLeft: 4 }}>New</span>}
                        </td>
                        <td style={{ minWidth: 160 }}>
                          <input className="stoq-input" value={item.itemName}
                            onChange={e => handleItemChange(idx, 'itemName', e.target.value)}
                            style={{ ...(errors[`items.${idx}.itemName`] ? { borderColor: 'var(--danger)' } : {}), height: 28, fontSize: 11 }}
                            placeholder="Item name" />
                          {errors[`items.${idx}.itemName`] && <div style={{ fontSize: 10, color: 'var(--danger)' }}>{errors[`items.${idx}.itemName`]}</div>}
                        </td>
                        <td style={{ minWidth: 140 }}>
                          {stockInfo ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent-soft-fg)' }}>{stockInfo.sku}</span>
                              <button className="icon-btn" style={{ width: 18, height: 18, color: 'var(--danger)' }} onClick={() => clearStock(idx)}><X size={10} /></button>
                            </div>
                          ) : (
                            <button className="stoq-btn stoq-btn--sm stoq-btn--ghost" style={{ fontSize: 10, height: 26 }} onClick={() => openStockModal(idx)}>
                              <Search size={10} /> Browse
                            </button>
                          )}
                        </td>
                        <td style={{ width: 90 }}>
                          <input type="number" min="0.01" step="0.01" className="stoq-input" value={item.quantity}
                            onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                            style={{ ...(errors[`items.${idx}.quantity`] ? { borderColor: 'var(--danger)' } : {}), height: 28, fontSize: 11 }} />
                        </td>
                        <td style={{ width: 90 }}>
                          <UnitPicker
                            value={item.unit}
                            onChange={v => handleItemChange(idx, 'unit', v)}
                            inputStyle={{ height: 28, fontSize: 11 }}
                          />
                        </td>
                        <td className="num-cell" style={{ width: 120 }}>
                          <input type="number" min="0" step="0.01" className="stoq-input" value={item.costPrice ?? ''}
                            onChange={e => handleItemChange(idx, 'costPrice', e.target.value)}
                            placeholder={!item.stockId ? 'Required' : '0'}
                            style={{ height: 28, fontSize: 11, textAlign: 'right', ...(!item.stockId && errors[`items.${idx}.costPrice`] ? { borderColor: 'var(--danger)' } : {}) }} />
                          {!item.stockId && errors[`items.${idx}.costPrice`] && <div style={{ fontSize: 10, color: 'var(--danger)' }}>Required</div>}
                        </td>
                        <td style={{ minWidth: 120 }}>
                          <input className="stoq-input" value={item.note || ''} onChange={e => handleItemChange(idx, 'note', e.target.value)}
                            placeholder="Optional" style={{ height: 28, fontSize: 11 }} />
                        </td>
                        <td style={{ width: 120 }}>
                          <div style={{ display: 'flex', gap: 3 }}>
                            {['NONE', 'CREDIT', 'DEBIT'].map(t => (
                              <button key={t} type="button"
                                onClick={() => handleItemChange(idx, 'paymentType', t)}
                                style={{
                                  fontSize: 9, padding: '3px 6px', borderRadius: 4, border: '1px solid',
                                  borderColor: item.paymentType === t
                                    ? (t === 'CREDIT' ? 'var(--warning)' : t === 'DEBIT' ? 'var(--success)' : 'var(--border-strong)')
                                    : 'var(--border)',
                                  background: item.paymentType === t
                                    ? (t === 'CREDIT' ? 'var(--warning-soft)' : t === 'DEBIT' ? 'var(--success-soft)' : 'var(--bg-sunk)')
                                    : 'transparent',
                                  color: item.paymentType === t
                                    ? (t === 'CREDIT' ? 'var(--warning)' : t === 'DEBIT' ? 'var(--success)' : 'var(--fg)')
                                    : 'var(--fg-subtle)',
                                  cursor: 'pointer', fontWeight: 600,
                                }}>
                                {t === 'NONE' ? '—' : t[0] + t.slice(1).toLowerCase()}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td>
                          {item.isNew
                            ? <button className="icon-btn" onClick={() => removeNewItem(idx)} style={{ color: 'var(--danger)' }}><Trash2 size={13} /></button>
                            : item.id && <button className="icon-btn" onClick={() => toggleRemove(idx)} style={{ color: 'var(--danger)' }}><Trash2 size={13} /></button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── CARDS VIEW ── */}
          {itemView === 'cards' && (
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map((item, idx) => {
                const stockInfo = item.stockId ? getStock(item.stockId) : null;
                return (
                  <div key={idx} style={{
                    border: `1px solid ${item.remove ? 'var(--danger-soft)' : item.isNew ? 'var(--success-soft)' : 'var(--border)'}`,
                    borderRadius: 'var(--r-md)', padding: 12,
                    background: item.remove ? 'var(--danger-soft)' : item.isNew ? 'var(--success-soft)' : 'var(--panel)',
                    opacity: item.remove ? 0.6 : 1,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)' }}>Item {idx + 1}</span>
                        {item.isNew && <span className="stoq-badge stoq-badge--success stoq-badge--plain">New</span>}
                        {item.remove && <span className="stoq-badge stoq-badge--danger stoq-badge--plain">To Remove</span>}
                      </div>
                      {item.isNew
                        ? <button className="icon-btn" onClick={() => removeNewItem(idx)} style={{ color: 'var(--danger)' }}><Trash2 size={13} /></button>
                        : item.id && <button className="icon-btn" onClick={() => toggleRemove(idx)} style={{ color: item.remove ? 'var(--success)' : 'var(--danger)' }}>
                            {item.remove ? <X size={13} /> : <Trash2 size={13} />}
                          </button>}
                    </div>

                    {!item.remove && (
                      <>
                        <div style={{ marginBottom: 10 }}>
                          {!stockInfo ? (
                            <button type="button" onClick={() => openStockModal(idx)}
                              className="stoq-btn stoq-btn--ghost" style={{ width: '100%', justifyContent: 'space-between', border: '1px solid var(--border)' }}>
                              <span style={{ color: 'var(--fg-subtle)' }}>Browse stock (optional)</span>
                              <Search size={13} />
                            </button>
                          ) : (
                            <div style={{ padding: '8px 12px', background: 'var(--accent-soft)', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{stockInfo.itemName}</div>
                                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-subtle)' }}>{stockInfo.sku} · {stockInfo.quantity} {stockInfo.unit} in stock</div>
                              </div>
                              <button className="stoq-btn stoq-btn--sm stoq-btn--ghost" onClick={() => clearStock(idx)} style={{ color: 'var(--danger)', fontSize: 11 }}>Clear</button>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div className="stoq-field">
                            <label className="stoq-field__label">Item Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <input className="stoq-input" value={item.itemName} onChange={e => handleItemChange(idx, 'itemName', e.target.value)}
                              style={errors[`items.${idx}.itemName`] ? { borderColor: 'var(--danger)' } : {}} />
                            {errors[`items.${idx}.itemName`] && <span style={{ fontSize: 11, color: 'var(--danger)' }}>{errors[`items.${idx}.itemName`]}</span>}
                          </div>
                          <div className="stoq-field">
                            <label className="stoq-field__label">Quantity <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <input type="number" min="0.01" step="0.01" className="stoq-input" value={item.quantity}
                              onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                              style={errors[`items.${idx}.quantity`] ? { borderColor: 'var(--danger)' } : {}} />
                            {errors[`items.${idx}.quantity`] && <span style={{ fontSize: 11, color: 'var(--danger)' }}>{errors[`items.${idx}.quantity`]}</span>}
                          </div>
                          <div className="stoq-field">
                            <label className="stoq-field__label">Unit</label>
                            <UnitPicker
                            value={item.unit}
                            onChange={v => handleItemChange(idx, 'unit', v)}
                            placeholder="Select or create unit…"
                          />
                          </div>
                          <div className="stoq-field">
                            <label className="stoq-field__label">
                              Cost Price (RWF)
                              {!item.stockId && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
                              {stockInfo?.unitCost && <span style={{ color: 'var(--fg-subtle)', fontWeight: 400, marginLeft: 4 }}>· stock: {fmt(Number(stockInfo.unitCost))}</span>}
                            </label>
                            <input type="number" min="0" step="0.01" className="stoq-input" value={item.costPrice ?? ''}
                              onChange={e => handleItemChange(idx, 'costPrice', e.target.value)}
                              placeholder={!item.stockId ? 'Required' : 'e.g. 1500'}
                              style={!item.stockId && errors[`items.${idx}.costPrice`] ? { borderColor: 'var(--danger)' } : {}} />
                            {!item.stockId && errors[`items.${idx}.costPrice`] && <span style={{ fontSize: 11, color: 'var(--danger)' }}>Cost price is required</span>}
                          </div>
                          <div className="stoq-field" style={{ gridColumn: '1 / -1' }}>
                            <label className="stoq-field__label">Note</label>
                            <input className="stoq-input" value={item.note || ''} onChange={e => handleItemChange(idx, 'note', e.target.value)} />
                          </div>
                          <div className="stoq-field" style={{ gridColumn: '1 / -1' }}>
                            <label className="stoq-field__label">Payment Type</label>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {['NONE', 'CREDIT', 'DEBIT'].map(t => (
                                <button key={t} type="button"
                                  onClick={() => handleItemChange(idx, 'paymentType', t)}
                                  style={{
                                    flex: 1, padding: '7px 0', borderRadius: 'var(--r-sm)', border: '1px solid',
                                    borderColor: item.paymentType === t
                                      ? (t === 'CREDIT' ? 'var(--warning)' : t === 'DEBIT' ? 'var(--success)' : 'var(--border-strong)')
                                      : 'var(--border)',
                                    background: item.paymentType === t
                                      ? (t === 'CREDIT' ? 'var(--warning-soft)' : t === 'DEBIT' ? 'var(--success-soft)' : 'var(--bg-sunk)')
                                      : 'transparent',
                                    color: item.paymentType === t
                                      ? (t === 'CREDIT' ? 'var(--warning)' : t === 'DEBIT' ? 'var(--success)' : 'var(--fg)')
                                      : 'var(--fg-subtle)',
                                    cursor: 'pointer', fontSize: 11, fontWeight: 600, textAlign: 'center',
                                  }}>
                                  {t === 'NONE' ? '— None' : t[0] + t.slice(1).toLowerCase()}
                                </button>
                              ))}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 4 }}>
                              {item.paymentType === 'CREDIT' ? 'Invoice will be created when items are received' :
                               item.paymentType === 'DEBIT' ? 'Payment record will be created when items are received' :
                               'No payment record will be created'}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {estimatedTotal > 0 && (
            <div style={{ margin: '0 14px 14px', padding: '10px 14px', background: 'var(--bg-sunk)', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)' }}>Estimated Total</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--accent-soft-fg)' }}>{fmt(estimatedTotal)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stock modal */}
      {showStockModal && (
        <div className="stoq-modal-backdrop">
          <div className="stoq-modal stoq-modal--wide" style={{ maxHeight: '80vh' }}>
            <div className="stoq-modal__head">
              <div className="stoq-modal__title">Select Stock Item</div>
              <button className="icon-btn" onClick={() => setShowStockModal(false)}><X size={14} /></button>
            </div>
            <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
                <input className="stoq-input stoq-input--search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by name or SKU…" />
              </div>
            </div>
            <div className="stoq-modal__body" style={{ padding: 10 }}>
              {filteredStocks.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: 'var(--fg-subtle)' }}>No stocks found</p>
              ) : filteredStocks.map(stock => {
                const isDup = isAlreadySelected(stock.id, selectedItemIndex);
                return (
                  <button key={stock.id} disabled={isDup} onClick={() => selectStock(stock)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 'var(--r-sm)', textAlign: 'left',
                      border: `1px solid ${isDup ? 'var(--border)' : 'var(--border)'}`,
                      background: isDup ? 'var(--bg-sunk)' : 'var(--panel)',
                      cursor: isDup ? 'not-allowed' : 'pointer', marginBottom: 4,
                      opacity: isDup ? 0.5 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{stock.itemName}</div>
                      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-subtle)' }}>{stock.sku}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-soft-fg)' }}>{stock.quantity} {stock.unit}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{fmt(Number(stock.unitCost))}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
