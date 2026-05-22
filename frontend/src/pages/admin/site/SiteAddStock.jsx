import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, X, RefreshCw, Plus, Trash2, ChevronDown, PackagePlus, List, LayoutGrid } from 'lucide-react';
import stockService from '../../../services/stockService';
import categoryService from '../../../services/categoryService';
import supplierService from '../../../services/supplierService';
import unitService from '../../../services/unitService';
import siteService from '../../../services/siteService';
import { useRole } from '../../../hooks/useRole';
import { useViewMode } from '../../../hooks/useViewMode';

// ── Searchable Select (Portal-based) ─────────────────────────────────────────

function SearchableSelect({ label, options, value, onChange, placeholder, onCreate, createLabel, error }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const dropRef = useRef(null);
  const inputRef = useRef(null);

  const filtered = options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()));
  const selected = options.find(o => o.value === value);
  const showCreate = onCreate && q.trim();

  const calcPos = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const minW = 160;
    const naturalW = Math.max(rect.width, minW);
    const overflows = rect.left + naturalW > window.innerWidth - 8;
    setDropPos({
      top: rect.bottom + window.scrollY + 2,
      left: overflows ? Math.max(8, rect.right + window.scrollX - naturalW) : rect.left + window.scrollX,
      width: naturalW,
    });
  };

  const openDropdown = () => { calcPos(); setOpen(true); setQ(''); };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target) && dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => calcPos();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => { window.removeEventListener('scroll', reposition, true); window.removeEventListener('resize', reposition); };
  }, [open]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30); }, [open]);

  const handleCreate = async () => {
    if (!q.trim() || creating) return;
    setCreating(true);
    try { const newId = await onCreate(q.trim()); onChange(newId); setOpen(false); setQ(''); }
    finally { setCreating(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (showCreate) handleCreate(); }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <>
      <div className="stoq-field">
        {label && <label className="stoq-field__label">{label}</label>}
        <button ref={triggerRef} type="button" onClick={openDropdown} className="stoq-input"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left', width: '100%', ...(error ? { borderColor: 'var(--danger)' } : {}) }}>
          <span style={{ color: selected ? 'var(--fg)' : 'var(--fg-subtle)', fontWeight: selected ? 500 : 400 }}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown size={13} style={{ color: 'var(--fg-subtle)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
        </button>
        {error && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>{error}</p>}
      </div>

      {open && createPortal(
        <div ref={dropRef} style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, minWidth: dropPos.width, width: dropPos.width, zIndex: 99999, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-lg)', maxHeight: 240, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: 6, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={handleKeyDown}
              className="stoq-input" style={{ height: 28, fontSize: 11 }} placeholder={onCreate ? 'Search or type to create...' : 'Search...'} />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <button type="button" onClick={() => { onChange(''); setOpen(false); }}
              style={{ width: '100%', textAlign: 'left', padding: '7px 10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--fg-subtle)' }}>None</button>
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
                {creating ? 'Creating...' : `Create ${createLabel} "${q.trim()}"`}
              </button>
            )}
            {!q.trim() && options.length === 0 && (
              <p style={{ padding: '8px 10px', fontSize: 11, color: 'var(--fg-subtle)' }}>No {createLabel}s yet.{onCreate ? ' Type a name to create one.' : ''}</p>
            )}
          </div>
        </div>
      , document.body)}
    </>
  );
}

const Field = ({ label, required, error, children }) => (
  <div className="stoq-field">
    <label className="stoq-field__label">
      {label}{required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
    </label>
    {children}
    {error && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>{error}</p>}
  </div>
);

const makeEmptyItem = (siteId) => ({
  itemName: '',
  categoryId: '',
  supplierId: '',
  siteId: siteId || '',
  unit: '',
  quantity: '',
  unitCost: '',
  warehouseLocation: '',
  receivedDate: new Date().toISOString().slice(0, 10),
  reorderLevel: 5,
  expiryDate: '',
  description: '',
  paymentType: 'CREDIT',
});

// ── Stock Item Row (no site selector) ─────────────────────────────────────────

function StockItemRow({ item, index, onChange, onRemove, canRemove, categories, suppliers, units, onCreateCategory, onCreateSupplier, onCreateUnit, errors }) {
  const set = (field, value) => onChange(index, { ...item, [field]: value });

  const totalValue = item.quantity && item.unitCost
    ? (parseFloat(item.quantity || 0) * parseFloat(item.unitCost || 0)).toFixed(2)
    : '0.00';

  return (
    <div className="stoq-panel">
      <div className="stoq-panel__head">
        <span className="stoq-panel__title">Item {index + 1}</span>
        {canRemove && (
          <button type="button" className="icon-btn" onClick={() => onRemove(index)} style={{ color: 'var(--danger)' }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Row 1: Name + Category + Supplier */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <Field label="Item Name" required error={errors?.itemName}>
            <input value={item.itemName} onChange={e => set('itemName', e.target.value)}
              className="stoq-input" style={errors?.itemName ? { borderColor: 'var(--danger)' } : {}} placeholder="e.g. A4 Printer Paper" />
          </Field>
          <SearchableSelect label="Category" options={categories} value={item.categoryId} onChange={v => set('categoryId', v)} placeholder="Select or create..." onCreate={onCreateCategory} createLabel="category" />
          <SearchableSelect label="Supplier" options={suppliers} value={item.supplierId} onChange={v => set('supplierId', v)} placeholder="Select or create..." onCreate={onCreateSupplier} createLabel="supplier" />
        </div>

        {/* Row 2: Unit + Qty + Cost + Total */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
          <SearchableSelect label="Unit" options={units} value={item.unit} onChange={v => set('unit', v)} placeholder="Select or create..." onCreate={onCreateUnit} createLabel="unit" error={errors?.unit} />
          <Field label="Quantity" required error={errors?.quantity}>
            <input type="number" min="0" value={item.quantity} onChange={e => set('quantity', e.target.value)}
              className="stoq-input" style={errors?.quantity ? { borderColor: 'var(--danger)' } : {}} placeholder="0" />
          </Field>
          <Field label="Unit Cost (RWF)" required error={errors?.unitCost}>
            <input type="number" min="0" step="0.01" value={item.unitCost} onChange={e => set('unitCost', e.target.value)}
              className="stoq-input" style={errors?.unitCost ? { borderColor: 'var(--danger)' } : {}} placeholder="0.00" />
          </Field>
          <div>
            <label className="stoq-field__label">Total Value</label>
            <input disabled value={`RWF ${parseFloat(totalValue).toLocaleString()}`} className="stoq-input"
              style={{ background: 'var(--success-soft)', color: 'var(--success)', fontWeight: 600, cursor: 'not-allowed' }} />
          </div>
        </div>

        {/* Payment Type */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label className="stoq-field__label" style={{ marginBottom: 0, flexShrink: 0 }}>Payment Type</label>
          <button type="button" onClick={() => set('paymentType', 'CREDIT')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 'var(--r-md)', border: '2px solid', borderColor: item.paymentType === 'CREDIT' ? 'var(--warning)' : 'var(--border)', background: item.paymentType === 'CREDIT' ? 'var(--warning-soft, #fff8e7)' : 'var(--bg)', color: item.paymentType === 'CREDIT' ? 'var(--warning)' : 'var(--fg-subtle)', fontWeight: item.paymentType === 'CREDIT' ? 700 : 400, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.paymentType === 'CREDIT' ? 'var(--warning)' : 'var(--border)' }} />
            Credit — we owe supplier
          </button>
          <button type="button" onClick={() => set('paymentType', 'DEBIT')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 'var(--r-md)', border: '2px solid', borderColor: item.paymentType === 'DEBIT' ? 'var(--success)' : 'var(--border)', background: item.paymentType === 'DEBIT' ? 'var(--success-soft)' : 'var(--bg)', color: item.paymentType === 'DEBIT' ? 'var(--success)' : 'var(--fg-subtle)', fontWeight: item.paymentType === 'DEBIT' ? 700 : 400, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.paymentType === 'DEBIT' ? 'var(--success)' : 'var(--border)' }} />
            Debit — paid to supplier
          </button>
          {item.supplierId && parseFloat(totalValue) > 0 ? (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px',
              borderRadius: 'var(--r-md)',
              background: item.paymentType === 'CREDIT' ? 'var(--warning-soft, #fff8e7)' : 'var(--success-soft)',
              color: item.paymentType === 'CREDIT' ? 'var(--warning)' : 'var(--success)',
              border: `1px solid ${item.paymentType === 'CREDIT' ? 'var(--warning)' : 'var(--success)'}`,
            }}>
              → Auto-records: {item.paymentType === 'CREDIT' ? 'Credit' : 'Debit'} of RWF {parseFloat(totalValue).toLocaleString()}
              {item.quantity ? ` · ${item.quantity} ${item.unit || 'units'}` : ''}
            </span>
          ) : !item.supplierId ? (
            <span style={{ fontSize: 11, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>
              Link a supplier to auto-record this payment
            </span>
          ) : null}
        </div>

        {/* Row 3: Location + Reorder (no site selector) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Location within site">
            <input value={item.warehouseLocation} onChange={e => set('warehouseLocation', e.target.value)}
              className="stoq-input" placeholder="e.g. Shelf A-3 (optional)" />
          </Field>
          <Field label="Reorder Level">
            <input type="number" min="0" value={item.reorderLevel} onChange={e => set('reorderLevel', parseInt(e.target.value) || 0)}
              className="stoq-input" />
          </Field>
        </div>

        {/* Row 4: Dates + Description */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <Field label="Received Date" required error={errors?.receivedDate}>
            <input type="date" value={item.receivedDate} onChange={e => set('receivedDate', e.target.value)}
              className="stoq-input" style={errors?.receivedDate ? { borderColor: 'var(--danger)' } : {}} />
          </Field>
          <Field label="Expiry Date">
            <input type="date" value={item.expiryDate} onChange={e => set('expiryDate', e.target.value)} className="stoq-input" />
          </Field>
          <Field label="Description">
            <input value={item.description} onChange={e => set('description', e.target.value)} className="stoq-input" placeholder="Notes or specs..." />
          </Field>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SiteAddStock() {
  const navigate = useNavigate();
  const { path } = useRole();
  const { siteId } = useParams();

  const [site, setSite] = useState(null);
  const [items, setItems] = useState([makeEmptyItem(siteId)]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [units, setUnits] = useState([]);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([{}]);
  const [toast, setToast] = useState(null);
  const [itemView, setItemView] = useViewMode('site-stock-add-items', 'cards');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const siteStockPath = `${path('/sites/' + siteId)}?tab=stock`;

  const loadDropdowns = useCallback(() => {
    categoryService.getAll().then(data => setCategories(data.map(c => ({ value: c.id, label: c.name })))).catch(() => {});
    supplierService.getForSelect().then(data => setSuppliers(data.map(s => ({ value: s.id, label: `${s.name} (${s.code})` })))).catch(() => {});
    unitService.getAll().then(data => setUnits(data.map(u => ({ value: u.name, label: u.name })))).catch(() => {});
  }, []);

  useEffect(() => {
    loadDropdowns();
    siteService.getOne(siteId).then(setSite).catch(() => {});
  }, [siteId, loadDropdowns]);

  const handleCreateCategory = async (name) => {
    const cat = await categoryService.create({ name });
    const opt = { value: cat.id, label: cat.name };
    setCategories(prev => [...prev, opt]);
    showToast(`Category "${name}" created`);
    return cat.id;
  };

  const handleCreateSupplier = async (name) => {
    const sup = await supplierService.create({ name });
    const opt = { value: sup.id, label: `${sup.name} (${sup.code})` };
    setSuppliers(prev => [...prev, opt]);
    showToast(`Supplier "${name}" created`);
    return sup.id;
  };

  const handleCreateUnit = async (name) => {
    const unit = await unitService.create(name);
    const opt = { value: unit.name, label: unit.name };
    setUnits(prev => [...prev, opt]);
    showToast(`Unit "${name}" created`);
    return unit.name;
  };

  const updateItem = (index, updated) => setItems(prev => prev.map((it, i) => i === index ? updated : it));
  const addItem = () => { setItems(prev => [...prev, makeEmptyItem(siteId)]); setErrors(prev => [...prev, {}]); };
  const removeItem = (index) => { setItems(prev => prev.filter((_, i) => i !== index)); setErrors(prev => prev.filter((_, i) => i !== index)); };

  const validateItems = () => {
    const allErrors = items.map(item => {
      const errs = {};
      if (!item.itemName.trim()) errs.itemName = 'Item name is required';
      if (item.quantity === '' || parseFloat(item.quantity) < 0) errs.quantity = 'Valid quantity required';
      if (item.unitCost === '' || parseFloat(item.unitCost) < 0) errs.unitCost = 'Valid unit cost required';
      if (!item.receivedDate) errs.receivedDate = 'Received date is required';
      return errs;
    });
    setErrors(allErrors);
    return allErrors.every(e => Object.keys(e).length === 0);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const cleanItem = (item) => {
    const out = { ...item };
    Object.keys(out).forEach(k => { if (out[k] === '') delete out[k]; });
    return out;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateItems()) return;
    setSubmitting(true);
    try {
      if (items.length === 1 && imageFile) {
        const fd = new FormData();
        Object.entries(items[0]).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) fd.append(k, v); });
        fd.append('stockImg', imageFile);
        await stockService.create(fd);
        showToast('Stock item created');
      } else {
        await stockService.batchCreate(items.map(cleanItem));
        showToast(items.length > 1 ? `${items.length} stock items created` : 'Stock item created');
      }
      setTimeout(() => navigate(siteStockPath), 900);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save stock', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '20px 24px 40px' }}>
      {toast && (
        <div className={`stoq-toast ${toast.type === 'error' ? 'stoq-toast--error' : 'stoq-toast--success'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{toast.message}</div>
      )}

      <div className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-btn" onClick={() => navigate(siteStockPath)}><ArrowLeft size={14} /></button>
          <div>
            <div className="stoq-crumbs" style={{ marginBottom: 4 }}>
              <span>Sites</span>
              <span className="stoq-crumbs__sep">/</span>
              <span>{site?.name || '…'}</span>
              <span className="stoq-crumbs__sep">/</span>
              <span className="stoq-crumbs__current">Add Stock</span>
            </div>
            <h1>Add Stock to {site?.name || '…'}</h1>
            <div className="page-head__sub">
              {`Fill in ${items.length > 1 ? `${items.length} items` : 'the item below'} — all created at once for this site`}
            </div>
          </div>
        </div>
        <div className="page-head__actions">
          <button type="button" className="stoq-btn" onClick={() => navigate(siteStockPath)}>Cancel</button>
          <button type="button" className="stoq-btn stoq-btn--primary" disabled={submitting} onClick={handleSubmit}
            style={{ opacity: submitting ? 0.6 : 1 }}>
            {submitting && <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />}
            <PackagePlus size={13} />
            {submitting ? 'Saving...' : items.length > 1 ? `Create ${items.length} Items` : 'Create Stock'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="stoq-panel" style={{ overflow: 'visible' }}>
          <div className="stoq-panel__head">
            <span className="stoq-panel__title">Items ({items.length})</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="stoq-segment">
                <button type="button" data-active={itemView === 'cards' ? 'true' : undefined} onClick={() => setItemView('cards')} title="Card view"><LayoutGrid size={13} /></button>
                <button type="button" data-active={itemView === 'table' ? 'true' : undefined} onClick={() => setItemView('table')} title="Table view"><List size={13} /></button>
              </div>
              <button type="button" className="stoq-btn stoq-btn--sm stoq-btn--primary" onClick={addItem}>
                <Plus size={12} /> Add Item
              </button>
            </div>
          </div>

          {/* TABLE VIEW */}
          {itemView === 'table' && (
            <div className="table-wrap">
              <table className="stoq-tbl" style={{ minWidth: 900 }}>
                <thead>
                  <tr>
                    <th className="no-sort" style={{ width: 32 }}>#</th>
                    <th className="no-sort" style={{ minWidth: 160 }}>Item Name *</th>
                    <th className="no-sort" style={{ width: 130 }}>Category</th>
                    <th className="no-sort" style={{ width: 130 }}>Supplier</th>
                    <th className="no-sort" style={{ width: 90 }}>Unit</th>
                    <th className="no-sort num-cell" style={{ width: 80 }}>Qty *</th>
                    <th className="no-sort num-cell" style={{ width: 110 }}>Unit Cost *</th>
                    <th className="no-sort num-cell" style={{ width: 110 }}>Total</th>
                    <th className="no-sort" style={{ width: 110 }}>Location</th>
                    <th className="no-sort" style={{ width: 70 }}>Reorder</th>
                    <th className="no-sort" style={{ width: 120 }}>Received *</th>
                    <th className="no-sort" style={{ width: 120 }}>Expiry</th>
                    <th className="no-sort" style={{ width: 110 }}>Payment</th>
                    <th className="no-sort col-actions" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const errs = errors[idx] || {};
                    const totalValue = item.quantity && item.unitCost
                      ? parseFloat(item.quantity || 0) * parseFloat(item.unitCost || 0) : 0;
                    return (
                      <tr key={idx} style={{ verticalAlign: 'top' }}>
                        <td style={{ paddingTop: 10 }}><span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{idx + 1}</span></td>
                        <td>
                          <input value={item.itemName} onChange={e => updateItem(idx, { ...item, itemName: e.target.value })}
                            className="stoq-input" placeholder="Item name"
                            style={{ height: 28, fontSize: 11, ...(errs.itemName ? { borderColor: 'var(--danger)' } : {}) }} />
                          {errs.itemName && <div style={{ fontSize: 10, color: 'var(--danger)', marginTop: 2 }}>{errs.itemName}</div>}
                        </td>
                        <td style={{ position: 'relative', zIndex: 100 - idx }}>
                          <SearchableSelect options={categories} value={item.categoryId} onChange={v => updateItem(idx, { ...item, categoryId: v })} placeholder="Select..." onCreate={handleCreateCategory} createLabel="category" />
                        </td>
                        <td style={{ position: 'relative', zIndex: 100 - idx }}>
                          <SearchableSelect options={suppliers} value={item.supplierId} onChange={v => updateItem(idx, { ...item, supplierId: v })} placeholder="Select..." onCreate={handleCreateSupplier} createLabel="supplier" />
                        </td>
                        <td style={{ position: 'relative', zIndex: 100 - idx }}>
                          <SearchableSelect options={units} value={item.unit} onChange={v => updateItem(idx, { ...item, unit: v })} placeholder="Select..." onCreate={handleCreateUnit} createLabel="unit" />
                        </td>
                        <td>
                          <input type="number" min="0" value={item.quantity} onChange={e => updateItem(idx, { ...item, quantity: e.target.value })}
                            className="stoq-input" placeholder="0"
                            style={{ height: 28, fontSize: 11, textAlign: 'right', ...(errs.quantity ? { borderColor: 'var(--danger)' } : {}) }} />
                        </td>
                        <td>
                          <input type="number" min="0" step="0.01" value={item.unitCost} onChange={e => updateItem(idx, { ...item, unitCost: e.target.value })}
                            className="stoq-input" placeholder="0.00"
                            style={{ height: 28, fontSize: 11, textAlign: 'right', ...(errs.unitCost ? { borderColor: 'var(--danger)' } : {}) }} />
                        </td>
                        <td className="num-cell">
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                            {totalValue > 0 ? `RWF ${totalValue.toLocaleString()}` : '-'}
                          </span>
                        </td>
                        <td>
                          <input value={item.warehouseLocation} onChange={e => updateItem(idx, { ...item, warehouseLocation: e.target.value })}
                            className="stoq-input" placeholder="Shelf A-3" style={{ height: 28, fontSize: 11 }} />
                        </td>
                        <td>
                          <input type="number" min="0" value={item.reorderLevel} onChange={e => updateItem(idx, { ...item, reorderLevel: parseInt(e.target.value) || 0 })}
                            className="stoq-input" style={{ height: 28, fontSize: 11, textAlign: 'right' }} />
                        </td>
                        <td>
                          <input type="date" value={item.receivedDate} onChange={e => updateItem(idx, { ...item, receivedDate: e.target.value })}
                            className="stoq-input" style={{ height: 28, fontSize: 11, ...(errs.receivedDate ? { borderColor: 'var(--danger)' } : {}) }} />
                        </td>
                        <td>
                          <input type="date" value={item.expiryDate} onChange={e => updateItem(idx, { ...item, expiryDate: e.target.value })}
                            className="stoq-input" style={{ height: 28, fontSize: 11 }} />
                        </td>
                        <td>
                          <div className="stoq-segment" style={{ width: '100%' }}>
                            <button type="button" data-active={item.paymentType === 'CREDIT' ? 'true' : undefined}
                              onClick={() => updateItem(idx, { ...item, paymentType: 'CREDIT' })}
                              style={{ flex: 1, fontSize: 10, color: item.paymentType === 'CREDIT' ? 'var(--warning)' : undefined }}>Credit</button>
                            <button type="button" data-active={item.paymentType === 'DEBIT' ? 'true' : undefined}
                              onClick={() => updateItem(idx, { ...item, paymentType: 'DEBIT' })}
                              style={{ flex: 1, fontSize: 10, color: item.paymentType === 'DEBIT' ? 'var(--success)' : undefined }}>Debit</button>
                          </div>
                          {item.supplierId && item.quantity && item.unitCost && (
                            <div style={{ fontSize: 9, fontWeight: 600, marginTop: 3, textAlign: 'center',
                              color: item.paymentType === 'CREDIT' ? 'var(--warning)' : 'var(--success)' }}>
                              → {item.paymentType === 'CREDIT' ? 'Credit' : 'Debit'}: RWF {(parseFloat(item.quantity || 0) * parseFloat(item.unitCost || 0)).toLocaleString()} · {item.quantity} {item.unit || 'units'}
                            </div>
                          )}
                          {!item.supplierId && (
                            <div style={{ fontSize: 9, color: 'var(--fg-subtle)', marginTop: 3, textAlign: 'center' }}>
                              No supplier linked
                            </div>
                          )}
                        </td>
                        <td>
                          {items.length > 1 && (
                            <button type="button" className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => removeItem(idx)}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {items.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-sunk)' }}>
                  <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{items.length} items</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                    Total: RWF {items.reduce((s, it) => s + (parseFloat(it.quantity || 0) * parseFloat(it.unitCost || 0)), 0).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* CARDS VIEW */}
          {itemView === 'cards' && (
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {items.map((item, index) => (
                <StockItemRow key={index} item={item} index={index} onChange={updateItem} onRemove={removeItem}
                  canRemove={items.length > 1} categories={categories} suppliers={suppliers} units={units}
                  onCreateCategory={handleCreateCategory} onCreateSupplier={handleCreateSupplier}
                  onCreateUnit={handleCreateUnit} errors={errors[index] || {}} />
              ))}
            </div>
          )}
        </div>

        {/* Image upload (single item only) */}
        {items.length === 1 && (
          <div className="stoq-panel">
            <div className="stoq-panel__head"><span className="stoq-panel__title">Product Image</span></div>
            <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
              {imagePreview ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={imagePreview} alt="preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }} />
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                    style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'var(--danger)', color: 'white', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  style={{ width: 80, height: 80, border: '2px dashed var(--border)', borderRadius: 'var(--r-sm)', background: 'var(--bg-sunk)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--fg-subtle)' }}>
                  <Upload size={18} />
                  <span style={{ fontSize: 10 }}>Upload</span>
                </button>
              )}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>Product photo</div>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>JPG or PNG, optional</div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
            </div>
          </div>
        )}

        {/* Add another item button (cards view) */}
        {itemView === 'cards' && (
          <button type="button" onClick={addItem}
            style={{ width: '100%', padding: '10px 0', borderRadius: 'var(--r-md)', border: '2px dashed var(--border)', background: 'transparent', color: 'var(--accent-soft-fg)', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Plus size={14} /> Add Another Item
          </button>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
          <button type="button" className="stoq-btn" onClick={() => navigate(siteStockPath)}>Cancel</button>
          <button type="submit" className="stoq-btn stoq-btn--primary" disabled={submitting} style={{ opacity: submitting ? 0.6 : 1 }}>
            {submitting && <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />}
            <PackagePlus size={13} />
            {submitting ? 'Saving...' : items.length > 1 ? `Create ${items.length} Items` : 'Create Stock'}
          </button>
        </div>
      </form>
    </div>
  );
}
