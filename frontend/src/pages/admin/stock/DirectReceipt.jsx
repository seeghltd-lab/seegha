import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PackagePlus, Plus, Trash2, CheckCircle, AlertCircle,
  Search, ChevronDown, X, Loader2, MapPin, Truck, List, LayoutGrid,
} from 'lucide-react';
import stockService from '../../../services/stockService';
import siteService from '../../../services/siteService';
import supplierService from '../../../services/supplierService';
import categoryService from '../../../services/categoryService';
import UnitPicker from '../../../components/UnitPicker';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { useEmployeeAuth } from '../../../context/EmployeeAuthContext';
import { loadDraft, clearDraft, useFormDraft } from '../../../hooks/useFormDraft';

const DRAFT_KEY = 'direct-receipt';

// -- Searchable Select --------------------------------------------------------
// Uses a portal-style fixed dropdown to avoid overflow:hidden clipping

function SearchableSelect({ value, onChange, options, placeholder, loading, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const dropRef = useRef(null);

  // Position the dropdown relative to the trigger button
  const openDropdown = () => {
    if (disabled) return;
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropPos({
        top: rect.bottom + window.scrollY + 2,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    setOpen(v => !v);
    setQuery('');
  };

  useEffect(() => {
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropRef.current && !dropRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setDropPos({ top: rect.bottom + window.scrollY + 2, left: rect.left + window.scrollX, width: rect.width });
      }
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => { window.removeEventListener('scroll', reposition, true); window.removeEventListener('resize', reposition); };
  }, [open]);

  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()));
  const selected = options.find(o => o.value === value);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={openDropdown}
        className="stoq-input"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: disabled ? 0.5 : 1 }}
      >
        <span style={{ color: selected ? 'var(--fg)' : 'var(--fg-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {selected ? selected.label : placeholder}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {loading && <Loader2 size={11} style={{ animation: 'spin 1s linear infinite', color: 'var(--fg-subtle)' }} />}
          {value && !disabled && (
            <X size={11} style={{ color: 'var(--fg-subtle)', cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); onChange(''); }} />
          )}
          <ChevronDown size={11} style={{ color: 'var(--fg-subtle)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </div>
      </button>

      {open && (
        <div
          ref={dropRef}
          style={{
            position: 'fixed',
            top: dropPos.top,
            left: dropPos.left,
            width: dropPos.width,
            zIndex: 9999,
            background: 'var(--bg-elev)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
            boxShadow: 'var(--shadow-lg)',
            maxHeight: 220,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: 6, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'var(--bg-sunk)', borderRadius: 'var(--r-xs)' }}>
              <Search size={11} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search..."
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--fg)' }}
              />
            </div>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <p style={{ fontSize: 11, color: 'var(--fg-subtle)', textAlign: 'center', padding: '10px 0' }}>No results</p>
            ) : filtered.map(o => (
              <button key={o.value} type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                style={{ width: '100%', textAlign: 'left', padding: '7px 12px', background: value === o.value ? 'var(--accent-soft)' : 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: value === o.value ? 'var(--accent-soft-fg)' : 'var(--fg)', fontWeight: value === o.value ? 600 : 400 }}
                onMouseEnter={e => { if (value !== o.value) e.currentTarget.style.background = 'var(--bg-sunk)'; }}
                onMouseLeave={e => { if (value !== o.value) e.currentTarget.style.background = 'none'; }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`stoq-toast ${toast.type === 'error' ? 'stoq-toast--error' : 'stoq-toast--success'}`}
      style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {toast.type === 'error' ? <AlertCircle size={13} /> : <CheckCircle size={13} />}
      {toast.msg}
    </div>
  );
}

// -- Item Row (card view) -----------------------------------------------------

function ItemRow({ item, index, onChange, onRemove, canRemove, categories, loadingDropdowns }) {
  const update = (field, val) => onChange(index, { ...item, [field]: val });

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Item {index + 1}</span>
        {canRemove && (
          <button type="button" className="icon-btn" onClick={() => onRemove(index)} style={{ color: 'var(--danger)' }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="stoq-field" style={{ marginBottom: 10 }}>
        <label className="stoq-field__label">Item Name <span style={{ color: 'var(--danger)' }}>*</span></label>
        <input type="text" className="stoq-input" value={item.itemName}
          onChange={e => update('itemName', e.target.value)} placeholder="e.g. Cement bags, Steel rods..." />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div className="stoq-field">
          <label className="stoq-field__label">Quantity <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input type="number" min="1" className="stoq-input" value={item.quantity}
            onChange={e => update('quantity', e.target.value)} />
        </div>
        <div className="stoq-field">
          <label className="stoq-field__label">Unit</label>
          <UnitPicker
            value={item.unit}
            onChange={v => update('unit', v)}
            placeholder="Select or create unit…"
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div className="stoq-field">
          <label className="stoq-field__label">Unit Cost (RWF)</label>
          <input type="number" min="0" step="0.01" className="stoq-input" value={item.unitCost}
            onChange={e => update('unitCost', e.target.value)} placeholder="0.00" />
        </div>
        <div className="stoq-field">
          <label className="stoq-field__label">Category</label>
          <SearchableSelect value={item.categoryId} onChange={v => update('categoryId', v)}
            options={categories} placeholder="Select category..." loading={loadingDropdowns} />
        </div>
      </div>

      <div className="stoq-field">
        <label className="stoq-field__label">Notes</label>
        <input type="text" className="stoq-input" value={item.notes}
          onChange={e => update('notes', e.target.value)} placeholder="Optional notes..." />
      </div>
    </div>
  );
}

const makeEmptyItem = () => ({ itemName: '', quantity: 1, unit: '', unitCost: '', categoryId: '', notes: '' });

// -- Main Component -----------------------------------------------------------

export default function DirectReceipt() {
  const navigate = useNavigate();
  const { admin, isAuthenticated: isAdmin } = useAdminAuth();
  const { employee } = useEmployeeAuth();

  const isAdminUser = isAdmin && !!admin;
  const actorName = isAdminUser
    ? (admin?.names || 'Admin')
    : (`${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || 'Employee');

  const draft = loadDraft(DRAFT_KEY);
  const [siteId, setSiteId] = useState(draft?.siteId ?? '');
  const [supplierId, setSupplierId] = useState(draft?.supplierId ?? '');
  const [items, setItems] = useState(draft?.items ?? [makeEmptyItem()]);
  const [itemView, setItemView] = useState('cards'); // 'cards' | 'table'

  const [sites, setSites] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  useFormDraft(DRAFT_KEY, { siteId, supplierId, items });

  useEffect(() => {
    const load = async () => {
      setLoadingDropdowns(true);
      try {
        const [sitesData, suppliersData, catsData] = await Promise.all([
          siteService.getAll(),
          supplierService.getAll({ limit: 200 }),
          categoryService.getAll(),
        ]);
        setSites((sitesData || []).map(s => ({ value: s.id, label: s.name })));
        setSuppliers((suppliersData?.suppliers || []).map(s => ({ value: s.id, label: s.name })));
        setCategories((catsData || []).map(c => ({ value: c.id, label: c.name })));
      } catch { showToast('Failed to load dropdowns', 'error'); }
      finally { setLoadingDropdowns(false); }
    };
    load();
  }, []);

  const handleItemChange = (index, updated) => setItems(prev => prev.map((it, i) => i === index ? updated : it));
  const handleAddItem = () => setItems(prev => [...prev, makeEmptyItem()]);
  const handleRemoveItem = (index) => setItems(prev => prev.filter((_, i) => i !== index));

  const validate = () => {
    const errs = {};
    if (!siteId) errs.siteId = 'Site is required';
    items.forEach((it, i) => {
      if (!it.itemName.trim()) errs[`item_${i}_name`] = 'Item name required';
      if (!it.quantity || Number(it.quantity) < 1) errs[`item_${i}_qty`] = 'Quantity must be >= 1';
    });
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); showToast('Please fix the errors below', 'error'); return; }
    setErrors({});
    setSubmitting(true);
    try {
      const payload = items.map(it => ({
        itemName: it.itemName.trim(),
        quantity: Number(it.quantity),
        siteId,
        supplierId: supplierId || undefined,
        unit: it.unit || undefined,
        unitCost: it.unitCost ? Number(it.unitCost) : 0,
        categoryId: it.categoryId || undefined,
        notes: it.notes.trim() || undefined,
      }));
      await stockService.directReceipt(payload);
      clearDraft(DRAFT_KEY);
      showToast(`${payload.length} item${payload.length > 1 ? 's' : ''} recorded successfully`);
      setTimeout(() => navigate(isAdminUser ? '/admin/stock' : '/dashboard'), 1500);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to record items', 'error');
    } finally { setSubmitting(false); }
  };

  // Grand total for table footer
  const grandTotal = items.reduce((s, it) => s + (parseFloat(it.quantity || 0) * parseFloat(it.unitCost || 0)), 0);

  return (
    <div style={{ padding: '20px 24px 40px' }}>
      <Toast toast={toast} />

      <div className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="kpi__icon" style={{ width: 40, height: 40, flexShrink: 0 }}>
            <PackagePlus size={18} />
          </span>
          <div>
            <h1>Direct Stock Receipt</h1>
            <div className="page-head__sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Recording as {actorName}
              <span className={`stoq-badge ${isAdminUser ? 'stoq-badge--accent' : 'stoq-badge--warning'} stoq-badge--plain`}>
                {isAdminUser ? 'Admin' : 'Employee'}
              </span>
            </div>
          </div>
        </div>
        <div className="page-head__actions">
          <button className="stoq-btn" onClick={() => navigate(isAdminUser ? '/admin/stock' : '/dashboard')}>Cancel</button>
          <button className="stoq-btn stoq-btn--primary" disabled={submitting} onClick={handleSubmit}
            style={{ opacity: submitting ? 0.6 : 1 }}>
            {submitting
              ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Recording...</>
              : <><PackagePlus size={13} /> Record Receipt</>}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* -- Receipt Details (Site + Supplier) -- */}
        {/* overflow:visible so the fixed-position dropdowns aren't clipped */}
        <div className="stoq-panel" style={{ overflow: 'visible' }}>
          <div className="stoq-panel__head">
            <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="kpi__icon"><MapPin size={13} /></span>
              Receipt Details
            </span>
          </div>
          <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="stoq-field">
              <label className="stoq-field__label">Site <span style={{ color: 'var(--danger)' }}>*</span></label>
              <SearchableSelect value={siteId} onChange={setSiteId} options={sites}
                placeholder="Select site..." loading={loadingDropdowns} />
              {errors.siteId && <span style={{ fontSize: 11, color: 'var(--danger)' }}>{errors.siteId}</span>}
            </div>
            <div className="stoq-field">
              <label className="stoq-field__label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Truck size={11} /> Supplier <span style={{ color: 'var(--fg-subtle)', fontWeight: 400 }}>(optional)</span>
              </label>
              <SearchableSelect value={supplierId} onChange={setSupplierId} options={suppliers}
                placeholder="Select supplier..." loading={loadingDropdowns} />
            </div>
          </div>
        </div>

        {/* -- Items -- */}
        <div className="stoq-panel" style={{ overflow: 'visible' }}>
          <div className="stoq-panel__head">
            <span className="stoq-panel__title">Items Received ({items.length})</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="stoq-segment">
                <button type="button" data-active={itemView === 'cards' ? 'true' : undefined}
                  onClick={() => setItemView('cards')} title="Card view"><LayoutGrid size={13} /></button>
                <button type="button" data-active={itemView === 'table' ? 'true' : undefined}
                  onClick={() => setItemView('table')} title="Table view"><List size={13} /></button>
              </div>
              <button type="button" className="stoq-btn stoq-btn--sm stoq-btn--primary" onClick={handleAddItem}>
                <Plus size={12} /> Add Item
              </button>
            </div>
          </div>

          {/* -- TABLE VIEW -- */}
          {itemView === 'table' && (
            <div style={{ overflowX: 'auto' }}>
              <table className="stoq-tbl" style={{ minWidth: 800 }}>
                <thead>
                  <tr>
                    <th className="no-sort" style={{ width: 32 }}>#</th>
                    <th className="no-sort" style={{ minWidth: 180 }}>Item Name *</th>
                    <th className="no-sort num-cell" style={{ width: 80 }}>Qty *</th>
                    <th className="no-sort" style={{ width: 110 }}>Unit</th>
                    <th className="no-sort num-cell" style={{ width: 120 }}>Unit Cost</th>
                    <th className="no-sort num-cell" style={{ width: 120 }}>Total</th>
                    <th className="no-sort" style={{ width: 130 }}>Category</th>
                    <th className="no-sort" style={{ minWidth: 140 }}>Notes</th>
                    <th className="no-sort col-actions" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const total = parseFloat(item.quantity || 0) * parseFloat(item.unitCost || 0);
                    return (
                      <tr key={i} style={{ verticalAlign: 'top' }}>
                        <td style={{ paddingTop: 10 }}>
                          <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{i + 1}</span>
                        </td>
                        <td>
                          <input type="text" className="stoq-input" value={item.itemName}
                            onChange={e => handleItemChange(i, { ...item, itemName: e.target.value })}
                            placeholder="Item name"
                            style={{ height: 28, fontSize: 11, ...(errors[`item_${i}_name`] ? { borderColor: 'var(--danger)' } : {}) }} />
                          {errors[`item_${i}_name`] && <div style={{ fontSize: 10, color: 'var(--danger)', marginTop: 2 }}>{errors[`item_${i}_name`]}</div>}
                        </td>
                        <td>
                          <input type="number" min="1" className="stoq-input" value={item.quantity}
                            onChange={e => handleItemChange(i, { ...item, quantity: e.target.value })}
                            style={{ height: 28, fontSize: 11, textAlign: 'right', ...(errors[`item_${i}_qty`] ? { borderColor: 'var(--danger)' } : {}) }} />
                          {errors[`item_${i}_qty`] && <div style={{ fontSize: 10, color: 'var(--danger)', marginTop: 2 }}>{errors[`item_${i}_qty`]}</div>}
                        </td>
                        <td>
                          <UnitPicker
                            value={item.unit}
                            onChange={v => handleItemChange(i, { ...item, unit: v })}
                            inputStyle={{ height: 28, fontSize: 11 }}
                          />
                        </td>
                        <td>
                          <input type="number" min="0" step="0.01" className="stoq-input" value={item.unitCost}
                            onChange={e => handleItemChange(i, { ...item, unitCost: e.target.value })}
                            placeholder="0.00"
                            style={{ height: 28, fontSize: 11, textAlign: 'right' }} />
                        </td>
                        <td className="num-cell">
                          <span style={{ fontSize: 11, fontWeight: 600, color: total > 0 ? 'var(--success)' : 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>
                            {total > 0 ? `RWF ${total.toLocaleString()}` : '-'}
                          </span>
                        </td>
                        <td>
                          <select className="stoq-select" value={item.categoryId}
                            onChange={e => handleItemChange(i, { ...item, categoryId: e.target.value })}
                            style={{ width: '100%', height: 28, fontSize: 11 }}>
                            <option value="">- None -</option>
                            {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                        </td>
                        <td>
                          <input type="text" className="stoq-input" value={item.notes}
                            onChange={e => handleItemChange(i, { ...item, notes: e.target.value })}
                            placeholder="Optional"
                            style={{ height: 28, fontSize: 11 }} />
                        </td>
                        <td>
                          {items.length > 1 && (
                            <button type="button" className="icon-btn" style={{ color: 'var(--danger)' }}
                              onClick={() => handleRemoveItem(i)}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Grand total footer */}
              {grandTotal > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-sunk)' }}>
                  <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{items.length} items</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                    Total: RWF {grandTotal.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* -- CARDS VIEW -- */}
          {itemView === 'cards' && (
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map((item, i) => (
                <div key={i}>
                  <ItemRow item={item} index={i} onChange={handleItemChange} onRemove={handleRemoveItem}
                    canRemove={items.length > 1} categories={categories}
                    loadingDropdowns={loadingDropdowns} />
                  {(errors[`item_${i}_name`] || errors[`item_${i}_qty`]) && (
                    <div style={{ marginTop: 4 }}>
                      {errors[`item_${i}_name`] && <p style={{ fontSize: 11, color: 'var(--danger)' }}>{errors[`item_${i}_name`]}</p>}
                      {errors[`item_${i}_qty`] && <p style={{ fontSize: 11, color: 'var(--danger)' }}>{errors[`item_${i}_qty`]}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
