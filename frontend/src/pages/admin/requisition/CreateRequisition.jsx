import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Plus, X, Trash2, Package, Search, User, Truck, AlertCircle, CheckCircle, RefreshCw, List, LayoutGrid, ChevronDown, MapPin, Link2 } from 'lucide-react';
import requisitionService from '../../../services/requisitionService';
import stockService from '../../../services/stockService';
import employeeService from '../../../services/employeeService';
import supplierService from '../../../services/supplierService';
import siteService from '../../../services/siteService';
import UnitPicker from '../../../components/UnitPicker';
import { useViewMode } from '../../../hooks/useViewMode';


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
    <div ref={ref} style={{ position: 'relative', zIndex: open ? 50 : 'auto' }}>
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

/* ── Stock Picker Modal ─────────────────────────────────────────────── */
function StockPickerModal({ stocks, onSelect, onClose }) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = stocks.filter(s =>
    s.itemName.toLowerCase().includes(q.toLowerCase()) ||
    s.sku.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="stoq-modal-backdrop" onClick={onClose}>
      <div className="stoq-modal" style={{ width: 520, maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
        <div className="stoq-modal__head">
          <span className="stoq-modal__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={14} /> Link to Inventory Stock
          </span>
          <button className="icon-btn" onClick={onClose}><X size={14} /></button>
        </div>
        <div style={{ padding: '10px 16px 6px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
            <input
              ref={inputRef}
              className="stoq-input"
              style={{ paddingLeft: 32 }}
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search by name or SKU…"
            />
          </div>
        </div>
        <div style={{ maxHeight: 340, overflowY: 'auto', padding: '4px 8px 12px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--fg-subtle)', fontSize: 12 }}>
              <Package size={28} style={{ opacity: 0.3, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
              No matching stock items
            </div>
          ) : filtered.map(s => (
            <button key={s.id} type="button"
              onClick={() => { onSelect(s); onClose(); }}
              style={{
                width: '100%', textAlign: 'left', padding: '9px 10px',
                background: 'none', border: 'none', borderRadius: 'var(--r-sm)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-sunk)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <div style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Package size={14} style={{ color: 'var(--accent-soft-fg)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.itemName}</div>
                <div style={{ fontSize: 10, color: 'var(--fg-subtle)', display: 'flex', gap: 8, marginTop: 2 }}>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{s.sku}</span>
                  {s.category?.name && <span>· {s.category.name}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: s.quantity <= (s.reorderLevel ?? 0) ? 'var(--warning)' : 'var(--success)' }}>
                  {s.quantity} {s.unit}
                </div>
                {s.unitCost && <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0 }).format(s.unitCost)}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Item Row (cards view) ──────────────────────────────────────────── */
function ItemRow({ item, index, stocks, onUpdate, onRemove, onOpenStockPicker }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Item {index + 1}</span>
        {index > 0 && (
          <button type="button" className="icon-btn" onClick={() => onRemove(index)} style={{ color: 'var(--danger)' }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Stock link */}
      <div style={{ marginBottom: 10 }}>
        <label className="stoq-field__label" style={{ marginBottom: 4, display: 'block' }}>
          Link to inventory <span style={{ color: 'var(--fg-subtle)', fontWeight: 400 }}>(optional)</span>
        </label>
        {item.stockId ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--success-soft)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)' }}>
            <Package size={13} style={{ color: 'var(--success)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', flex: 1 }}>{item.itemName}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-subtle)' }}>
              {stocks.find(s => s.id === item.stockId)?.sku}
            </span>
            <button type="button" className="icon-btn" onClick={() => onUpdate(index, { ...item, stockId: '', itemName: '', unit: '' })}>
              <X size={12} />
            </button>
          </div>
        ) : (
          <button type="button"
            onClick={() => onOpenStockPicker(index)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '7px 10px', background: 'var(--bg-subtle)',
              border: '1px dashed var(--border)', borderRadius: 'var(--r-sm)',
              cursor: 'pointer', fontSize: 12, color: 'var(--fg-muted)',
            }}>
            <Link2 size={13} style={{ color: 'var(--fg-subtle)' }} />
            <span>Choose from inventory…</span>
          </button>
        )}
      </div>

      {!item.stockId && (
        <div className="stoq-field" style={{ marginBottom: 10 }}>
          <label className="stoq-field__label">Item Name <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input className="stoq-input" value={item.itemName} onChange={e => onUpdate(index, { ...item, itemName: e.target.value })} placeholder="What is needed?" />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="stoq-field">
          <label className="stoq-field__label">Quantity <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input type="number" min="0.01" step="0.01" className="stoq-input" value={item.quantity}
            onChange={e => onUpdate(index, { ...item, quantity: e.target.value })} />
        </div>
        <div className="stoq-field">
          <label className="stoq-field__label">Unit</label>
          <UnitPicker
            value={item.unit}
            onChange={v => onUpdate(index, { ...item, unit: v })}
            placeholder="Select or create unit…"
          />
        </div>
      </div>
    </div>
  );
}

const emptyItem = () => ({ stockId: '', itemName: '', quantity: '', unit: '' });

export default function CreateRequisition() {
  const navigate = useNavigate();
  const { role } = useOutletContext() ?? {};
  const isEmployee = role === 'employee';
  const [employees, setEmployees] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [sites, setSites] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [itemView, setItemView] = useViewMode('requisition-items', 'cards');
  // stockPickerFor: index of the item currently picking stock, or null
  const [stockPickerFor, setStockPickerFor] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    employeeService.getAllEmployees().then(d => setEmployees(d.employees || d || [])).catch(() => {});
    stockService.getAll({ limit: 200 }).then(d => setStocks(d.stocks || [])).catch(() => {});
    supplierService.getForSelect().then(data => setSuppliers(data.map(s => ({ value: s.id, label: `${s.name} (${s.code})` })))).catch(() => {});
    siteService.getAll().then(d => setSites(d.sites || d || [])).catch(() => {});
  }, []);

  const handleCreateSupplier = async (name) => {
    const sup = await supplierService.create({ name });
    const opt = { value: sup.id, label: `${sup.name} (${sup.code})` };
    setSuppliers(prev => [...prev, opt]);
    showToast(`Supplier "${name}" created`);
    return sup.id;
  };

  const handleSelectStock = useCallback((stock) => {
    if (stockPickerFor === null) return;
    setItems(prev => prev.map((it, j) =>
      j === stockPickerFor ? { ...it, stockId: stock.id, itemName: stock.itemName, unit: stock.unit } : it
    ));
    setStockPickerFor(null);
  }, [stockPickerFor]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    for (const [i, item] of items.entries()) {
      if (!item.itemName.trim()) { setError(`Item ${i + 1}: name is required`); return; }
      if (!item.quantity || parseFloat(item.quantity) <= 0) { setError(`Item ${i + 1}: quantity must be > 0`); return; }
    }
    setSubmitting(true);
    try {
      await requisitionService.create({
        employeeId: employeeId || undefined,
        supplierId: supplierId || undefined,
        siteId: siteId || undefined,
        description: description.trim() || undefined,
        items: items.map(it => ({ stockId: it.stockId || undefined, itemName: it.itemName.trim(), quantity: parseFloat(it.quantity), unit: it.unit })),
      });
      showToast('Requisition created');
      setTimeout(() => navigate(isEmployee ? '/requisitions' : '/admin/requisition-management'), 900);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create requisition');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '20px 24px 40px' }}>
      {/* Stock Picker Modal */}
      {stockPickerFor !== null && (
        <StockPickerModal
          stocks={stocks}
          onSelect={handleSelectStock}
          onClose={() => setStockPickerFor(null)}
        />
      )}

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
            <h1>Create Requisition</h1>
            <div className="page-head__sub">Create a requisition — employee is optional</div>
          </div>
        </div>
        <div className="page-head__actions">
          <button className="stoq-btn" onClick={() => navigate(-1)}>Cancel</button>
          <button className="stoq-btn stoq-btn--primary" disabled={submitting} onClick={handleSubmit}
            style={{ opacity: submitting ? 0.6 : 1 }}>
            {submitting ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</> : 'Create Requisition'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--danger-soft)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--danger)', marginBottom: 14 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, alignItems: 'start' }}>
        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Items */}
          <div className="stoq-panel">
            <div className="stoq-panel__head">
              <span className="stoq-panel__title">Items ({items.length})</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="stoq-segment">
                  <button data-active={itemView === 'cards' ? 'true' : undefined} onClick={() => setItemView('cards')} title="Card view"><LayoutGrid size={13} /></button>
                  <button data-active={itemView === 'table' ? 'true' : undefined} onClick={() => setItemView('table')} title="Table view"><List size={13} /></button>
                </div>
                <button type="button" className="stoq-btn stoq-btn--sm stoq-btn--primary"
                  onClick={() => setItems(prev => [...prev, emptyItem()])}>
                  <Plus size={12} /> Add Item
                </button>
              </div>
            </div>

            {/* TABLE VIEW */}
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
                      <th className="no-sort col-actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td><span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{i + 1}</span></td>
                        <td style={{ minWidth: 180 }}>
                          {item.stockId ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Package size={12} style={{ color: 'var(--success)', flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{item.itemName}</span>
                              <button type="button" className="icon-btn" style={{ width: 18, height: 18, color: 'var(--danger)' }}
                                onClick={() => setItems(prev => prev.map((it, j) => j === i ? { ...it, stockId: '', itemName: '', unit: 'PCS' } : it))}>
                                <X size={10} />
                              </button>
                            </div>
                          ) : (
                            <input className="stoq-input" value={item.itemName}
                              onChange={e => setItems(prev => prev.map((it, j) => j === i ? { ...it, itemName: e.target.value } : it))}
                              placeholder="Item name" style={{ height: 28, fontSize: 11 }} />
                          )}
                        </td>
                        <td style={{ width: 130 }}>
                          {!item.stockId && (
                            <button type="button"
                              onClick={() => setStockPickerFor(i)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '4px 10px', background: 'var(--bg-subtle)',
                                border: '1px dashed var(--border)', borderRadius: 'var(--r-sm)',
                                cursor: 'pointer', fontSize: 11, color: 'var(--fg-muted)',
                                whiteSpace: 'nowrap',
                              }}>
                              <Link2 size={11} /> Link stock
                            </button>
                          )}
                          {item.stockId && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-subtle)' }}>
                                {stocks.find(s => s.id === item.stockId)?.sku || ''}
                              </span>
                              <button type="button" className="icon-btn" style={{ width: 16, height: 16, color: 'var(--danger)' }}
                                onClick={() => setItems(prev => prev.map((it, j) => j === i ? { ...it, stockId: '', itemName: '', unit: '' } : it))}>
                                <X size={10} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td style={{ width: 90 }}>
                          <input type="number" min="0.01" step="0.01" className="stoq-input" value={item.quantity}
                            onChange={e => setItems(prev => prev.map((it, j) => j === i ? { ...it, quantity: e.target.value } : it))}
                            style={{ height: 28, fontSize: 11 }} />
                        </td>
                        <td style={{ width: 90 }}>
                          <UnitPicker
                            value={item.unit}
                            onChange={v => setItems(prev => prev.map((it, j) => j === i ? { ...it, unit: v } : it))}
                            inputStyle={{ height: 28, fontSize: 11 }}
                          />
                        </td>
                        <td>
                          {i > 0 && (
                            <button type="button" className="icon-btn" style={{ color: 'var(--danger)' }}
                              onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* CARDS VIEW */}
            {itemView === 'cards' && (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map((item, i) => (
                  <ItemRow key={i} item={item} index={i} stocks={stocks}
                    onUpdate={(idx, updated) => setItems(prev => prev.map((it, j) => j === idx ? updated : it))}
                    onRemove={(idx) => setItems(prev => prev.filter((_, j) => j !== idx))}
                    onOpenStockPicker={(idx) => setStockPickerFor(idx)} />
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="stoq-panel">
            <div className="stoq-panel__head"><span className="stoq-panel__title">Description / Purpose</span></div>
            <div style={{ padding: 14 }}>
              <textarea className="stoq-input" value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Briefly explain what these items are needed for…" rows={3}
                style={{ height: 'auto', padding: '8px 10px', resize: 'vertical', lineHeight: 1.6 }} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Employee — only shown to admins */}
          {!isEmployee && (
            <div className="stoq-panel">
              <div className="stoq-panel__head">
                <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="kpi__icon"><User size={13} /></span>
                  Employee
                </span>
                <span className="stoq-panel__sub">optional</span>
              </div>
              <div style={{ padding: 14 }}>
                <select className="stoq-select" value={employeeId} onChange={e => setEmployeeId(e.target.value)} style={{ width: '100%' }}>
                  <option value="">No employee (admin requisition)</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} — {emp.position}</option>
                  ))}
                </select>
                {!employeeId && (
                  <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 6 }}>
                    This requisition will be created directly by admin without being linked to an employee.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Supplier */}
          <div className="stoq-panel" style={{ overflow: 'visible' }}>
            <div className="stoq-panel__head">
              <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__icon"><Truck size={13} /></span>
                Supplier
              </span>
              <span className="stoq-panel__sub">optional</span>
            </div>
            <div style={{ padding: 14, overflow: 'visible' }}>
              <SearchableSelect
                options={suppliers}
                value={supplierId}
                onChange={setSupplierId}
                placeholder="Search or create supplier…"
                onCreate={handleCreateSupplier}
                createLabel="supplier"
              />
            </div>
          </div>

          {/* Site */}
          <div className="stoq-panel">
            <div className="stoq-panel__head">
              <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__icon"><MapPin size={13} /></span>
                Site
              </span>
              <span className="stoq-panel__sub">optional</span>
            </div>
            <div style={{ padding: 14 }}>
              <select className="stoq-select" value={siteId} onChange={e => setSiteId(e.target.value)} style={{ width: '100%' }}>
                <option value="">No site</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}{s.location ? ` — ${s.location}` : ''}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
