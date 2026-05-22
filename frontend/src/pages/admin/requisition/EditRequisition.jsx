import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, X, Trash2, Package, Search, User, Truck,
  AlertCircle, CheckCircle, RefreshCw, List, LayoutGrid,
  ChevronDown, MapPin, Link2, Lock,
} from 'lucide-react';
import requisitionService from '../../../services/requisitionService';
import stockService from '../../../services/stockService';
import employeeService from '../../../services/employeeService';
import supplierService from '../../../services/supplierService';
import siteService from '../../../services/siteService';
import UnitPicker from '../../../components/UnitPicker';
import { useViewMode } from '../../../hooks/useViewMode';

const STATUS_BADGE = {
  PENDING:            'stoq-badge',
  APPROVED:           'stoq-badge stoq-badge--accent',
  PARTIALLY_RECEIVED: 'stoq-badge stoq-badge--warning',
  FULLY_RECEIVED:     'stoq-badge stoq-badge--success',
  REJECTED:           'stoq-badge stoq-badge--danger',
};
const STATUS_LABEL = {
  PENDING: 'Pending', APPROVED: 'Approved',
  PARTIALLY_RECEIVED: 'Partially Received',
  FULLY_RECEIVED: 'Fully Received', REJECTED: 'Rejected',
};

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
            <input ref={inputRef} className="stoq-input" style={{ paddingLeft: 32 }} value={q}
              onChange={e => setQ(e.target.value)} placeholder="Search by name or SKU…" />
          </div>
        </div>
        <div style={{ maxHeight: 340, overflowY: 'auto', padding: '4px 8px 12px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--fg-subtle)', fontSize: 12 }}>
              <Package size={28} style={{ opacity: 0.3, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
              No matching stock items
            </div>
          ) : filtered.map(s => (
            <button key={s.id} type="button" onClick={() => { onSelect(s); onClose(); }}
              style={{ width: '100%', textAlign: 'left', padding: '9px 10px', background: 'none', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-sunk)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <div style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Package size={14} style={{ color: 'var(--accent-soft-fg)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{s.itemName}</div>
                <div style={{ fontSize: 10, color: 'var(--fg-subtle)', display: 'flex', gap: 8, marginTop: 2 }}>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{s.sku}</span>
                  {s.category?.name && <span>· {s.category.name}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: s.quantity <= (s.reorderLevel ?? 0) ? 'var(--warning)' : 'var(--success)' }}>
                  {s.quantity} {s.unit}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Item Row ───────────────────────────────────────────────────────── */
function ItemRow({ item, index, stocks, onUpdate, onRemove, onOpenStockPicker, siteSelected }) {
  const isReceived = (item.receivedQty ?? 0) > 0;

  return (
    <div style={{ border: `1px solid ${isReceived ? 'var(--border-strong)' : 'var(--border)'}`, borderRadius: 'var(--r-md)', padding: 12, background: isReceived ? 'var(--bg-subtle)' : 'var(--panel)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Item {index + 1}</span>
          {isReceived && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--success)', fontWeight: 600 }}>
              <CheckCircle size={10} /> {item.receivedQty} received
            </span>
          )}
        </div>
        {!isReceived && index > 0 && (
          <button type="button" className="icon-btn" onClick={() => onRemove(index)} style={{ color: 'var(--danger)' }}>
            <Trash2 size={13} />
          </button>
        )}
        {isReceived && (
          <span title="Cannot remove — already received" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--fg-subtle)' }}>
            <Lock size={11} /> Locked
          </span>
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
              {stocks.find(s => s.id === item.stockId)?.sku ?? item.stockId?.slice(-6)}
            </span>
            {!isReceived && (
              <button type="button" className="icon-btn" onClick={() => onUpdate(index, { ...item, stockId: '', itemName: item.stockId ? '' : item.itemName, unit: '' })}>
                <X size={12} />
              </button>
            )}
            {isReceived && <Lock size={11} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />}
          </div>
        ) : (
          <button type="button"
            onClick={() => !isReceived && siteSelected && onOpenStockPicker(index)}
            disabled={isReceived || !siteSelected}
            title={isReceived ? 'Already received — cannot re-link' : !siteSelected ? 'Select a site first' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '7px 10px', background: 'var(--bg-subtle)',
              border: '1px dashed var(--border)', borderRadius: 'var(--r-sm)',
              cursor: (isReceived || !siteSelected) ? 'not-allowed' : 'pointer',
              fontSize: 12, color: 'var(--fg-muted)',
              opacity: (isReceived || !siteSelected) ? 0.5 : 1,
            }}>
            {isReceived ? <Lock size={13} style={{ color: 'var(--fg-subtle)' }} /> : <Link2 size={13} style={{ color: 'var(--fg-subtle)' }} />}
            <span>{isReceived ? 'Received — cannot re-link' : !siteSelected ? 'Select a site first' : 'Choose from inventory…'}</span>
          </button>
        )}
      </div>

      {!item.stockId && (
        <div className="stoq-field" style={{ marginBottom: 10 }}>
          <label className="stoq-field__label">Item Name <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input className="stoq-input" value={item.itemName}
            onChange={e => onUpdate(index, { ...item, itemName: e.target.value })}
            placeholder="What is needed?" readOnly={isReceived}
            style={isReceived ? { opacity: 0.7, cursor: 'not-allowed' } : {}} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="stoq-field">
          <label className="stoq-field__label">Quantity <span style={{ color: 'var(--danger)' }}>*</span>
            {isReceived && <span style={{ color: 'var(--fg-subtle)', fontWeight: 400, marginLeft: 4 }}>(min {item.receivedQty})</span>}
          </label>
          <input type="number" min={item.receivedQty ?? 0.01} step="0.01" className="stoq-input"
            value={item.quantity}
            onChange={e => onUpdate(index, { ...item, quantity: e.target.value })} />
        </div>
        <div className="stoq-field">
          <label className="stoq-field__label">Unit</label>
          <UnitPicker value={item.unit} onChange={v => onUpdate(index, { ...item, unit: v })} placeholder="Select or create unit…" />
        </div>
      </div>
    </div>
  );
}

const emptyItem = () => ({ stockId: '', itemName: '', quantity: '', unit: '', isNew: true });

export default function EditRequisition() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [requisition, setRequisition] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [sites, setSites] = useState([]);

  const [employeeId, setEmployeeId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [siteError, setSiteError] = useState('');
  const [originalSiteId, setOriginalSiteId] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [itemView, setItemView] = useViewMode('edit-requisition-items', 'cards');
  const [stockPickerFor, setStockPickerFor] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };

  // Load the requisition and reference data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [req, empData, supData, siteData] = await Promise.all([
          requisitionService.getOne(id),
          employeeService.getAllEmployees().catch(() => ({ employees: [] })),
          supplierService.getForSelect().catch(() => []),
          siteService.getAll().catch(() => []),
        ]);
        setRequisition(req);
        setEmployeeId(req.employeeId ?? '');
        setSupplierId(req.supplierId ?? '');
        setSiteId(req.siteId ?? '');
        setOriginalSiteId(req.siteId ?? '');
        setDescription(req.description ?? '');
        setItems((req.items ?? []).map(i => ({
          id: i.id,
          stockId: i.stockId ?? '',
          itemName: i.itemName,
          quantity: i.quantity,
          unit: i.unit,
          note: i.note ?? '',
          costPrice: i.costPrice ?? '',
          paymentType: i.paymentType ?? 'NONE',
          receivedQty: i.receivedQty ?? 0,
          receivingStatus: i.receivingStatus,
          isNew: false,
        })));
        setEmployees(empData.employees ?? empData ?? []);
        setSuppliers(supData.map(s => ({ value: s.id, label: `${s.name} (${s.code})` })));
        setSites(siteData.sites ?? siteData ?? []);
      } catch {
        setError('Failed to load requisition.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // Fetch stock filtered by selected site
  useEffect(() => {
    if (!siteId) { setStocks([]); return; }
    stockService.getAll({ siteId, limit: 200 }).then(d => setStocks(d.stocks || [])).catch(() => {});
  }, [siteId]);

  // When site changes, clear stockId on items that haven't been received
  const handleSiteChange = (newSiteId) => {
    setSiteId(newSiteId);
    setSiteError('');
    if (newSiteId !== originalSiteId) {
      setItems(prev => prev.map(item =>
        (item.receivedQty ?? 0) === 0 ? { ...item, stockId: '' } : item
      ));
    }
  };

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

    if (!siteId) {
      setSiteError('Site is required');
      setError('Please select a site before saving');
      return;
    }
    setSiteError('');

    for (const [i, item] of items.entries()) {
      if (item.remove) continue;
      if (!item.itemName?.toString().trim()) { setError(`Item ${i + 1}: name is required`); return; }
      const qty = parseFloat(item.quantity);
      if (!qty || qty <= 0) { setError(`Item ${i + 1}: quantity must be > 0`); return; }
      const recvd = item.receivedQty ?? 0;
      if (qty < recvd) { setError(`Item ${i + 1}: quantity cannot be less than already received (${recvd})`); return; }
    }

    setSubmitting(true);
    try {
      // Build payload — send only changed header fields and all items
      const payload = {
        description: description.trim() || null,
        siteId: siteId || null,
        supplierId: supplierId || null,
        employeeId: employeeId || null,
        items: items.map(it => {
          if (it.remove && it.id) return { id: it.id, remove: true };
          if (it.isNew) {
            return {
              itemName: it.itemName.toString().trim(),
              quantity: parseFloat(it.quantity),
              unit: it.unit,
              note: it.note || undefined,
              stockId: it.stockId || undefined,
              costPrice: it.costPrice !== '' && it.costPrice != null ? parseFloat(it.costPrice) : undefined,
              paymentType: it.paymentType || undefined,
            };
          }
          return {
            id: it.id,
            itemName: it.itemName.toString().trim(),
            quantity: parseFloat(it.quantity),
            unit: it.unit,
            note: it.note || undefined,
            stockId: it.stockId || undefined,
            costPrice: it.costPrice !== '' && it.costPrice != null ? parseFloat(it.costPrice) : null,
            paymentType: it.paymentType || undefined,
          };
        }),
      };

      await requisitionService.update(id, payload);
      showToast('Requisition saved');
      setTimeout(() => navigate(`/admin/requisition-management/${id}`), 900);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save requisition');
      setSubmitting(false);
    }
  };

  const siteChangedWithReceivedItems = siteId !== originalSiteId &&
    items.some(i => (i.receivedQty ?? 0) > 0);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--fg-subtle)' }}>
      <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!requisition) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 10, color: 'var(--fg-subtle)' }}>
      <AlertCircle size={28} style={{ color: 'var(--danger)' }} />
      <span style={{ fontSize: 12 }}>{error || 'Requisition not found'}</span>
      <button className="stoq-btn" onClick={() => navigate(-1)}>Go Back</button>
    </div>
  );

  const activeItems = items.filter(i => !i.remove);
  const hasReceivedItems = items.some(i => (i.receivedQty ?? 0) > 0);

  return (
    <div style={{ padding: '20px 24px 40px' }}>
      {stockPickerFor !== null && (
        <StockPickerModal stocks={stocks} onSelect={handleSelectStock} onClose={() => setStockPickerFor(null)} />
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1>Edit Requisition</h1>
              <span className={STATUS_BADGE[requisition.status] ?? 'stoq-badge'}>
                {STATUS_LABEL[requisition.status] ?? requisition.status}
              </span>
            </div>
            <div className="page-head__sub">
              REQ-{requisition.id.slice(-8).toUpperCase()}
              {requisition.site && <> · <MapPin size={11} style={{ verticalAlign: 'middle' }} /> {requisition.site.name}</>}
            </div>
          </div>
        </div>
        <div className="page-head__actions">
          <button className="stoq-btn" onClick={() => navigate(-1)}>Cancel</button>
          <button className="stoq-btn stoq-btn--primary" disabled={submitting} onClick={handleSubmit}
            style={{ opacity: submitting ? 0.6 : 1 }}>
            {submitting
              ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
              : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Warnings */}
      {hasReceivedItems && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: 'var(--warning-soft, oklch(0.97 0.05 85))', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--warning, oklch(0.6 0.15 85))', marginBottom: 14, border: '1px solid oklch(0.80 0.12 85 / 0.3)' }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Some items have already been received.</strong> Those items are locked — you cannot delete them, reduce their quantity below what was received, or re-link their inventory stock.
          </div>
        </div>
      )}

      {siteChangedWithReceivedItems && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: 'var(--danger-soft)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--danger)', marginBottom: 14 }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Site cannot be changed</strong> — one or more items were already received into stock at the original site. Reset the site to save.
          </div>
        </div>
      )}

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
              <span className="stoq-panel__title">Items ({activeItems.length})</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="stoq-segment">
                  <button type="button" data-active={itemView === 'cards' ? 'true' : undefined} onClick={() => setItemView('cards')} title="Card view"><LayoutGrid size={13} /></button>
                  <button type="button" data-active={itemView === 'table' ? 'true' : undefined} onClick={() => setItemView('table')} title="Table view"><List size={13} /></button>
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
                      <th className="no-sort">Received</th>
                      <th className="no-sort col-actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => {
                      if (item.remove) return null;
                      const isReceived = (item.receivedQty ?? 0) > 0;
                      return (
                        <tr key={i} style={{ opacity: isReceived ? 0.85 : 1 }}>
                          <td><span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{i + 1}</span></td>
                          <td style={{ minWidth: 180 }}>
                            {item.stockId ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Package size={12} style={{ color: 'var(--success)', flexShrink: 0 }} />
                                <span style={{ fontSize: 12, fontWeight: 600 }}>{item.itemName}</span>
                                {!isReceived && (
                                  <button type="button" className="icon-btn" style={{ width: 18, height: 18, color: 'var(--danger)' }}
                                    onClick={() => setItems(prev => prev.map((it, j) => j === i ? { ...it, stockId: '', itemName: '', unit: '' } : it))}>
                                    <X size={10} />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <input className="stoq-input" value={item.itemName}
                                onChange={e => setItems(prev => prev.map((it, j) => j === i ? { ...it, itemName: e.target.value } : it))}
                                placeholder="Item name" style={{ height: 28, fontSize: 11 }}
                                readOnly={isReceived} />
                            )}
                          </td>
                          <td style={{ width: 130 }}>
                            {!item.stockId && (
                              <button type="button"
                                onClick={() => !isReceived && siteId && setStockPickerFor(i)}
                                disabled={isReceived || !siteId}
                                title={isReceived ? 'Already received' : !siteId ? 'Select a site first' : undefined}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'var(--bg-subtle)', border: '1px dashed var(--border)', borderRadius: 'var(--r-sm)', cursor: (isReceived || !siteId) ? 'not-allowed' : 'pointer', fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap', opacity: (isReceived || !siteId) ? 0.5 : 1 }}>
                                {isReceived ? <Lock size={11} /> : <Link2 size={11} />}
                                {isReceived ? 'Locked' : !siteId ? 'Select site' : 'Link stock'}
                              </button>
                            )}
                            {item.stockId && (
                              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-subtle)' }}>
                                {stocks.find(s => s.id === item.stockId)?.sku ?? item.stockId.slice(-6)}
                              </span>
                            )}
                          </td>
                          <td style={{ width: 90 }}>
                            <input type="number" min={item.receivedQty ?? 0.01} step="0.01" className="stoq-input" value={item.quantity}
                              onChange={e => setItems(prev => prev.map((it, j) => j === i ? { ...it, quantity: e.target.value } : it))}
                              style={{ height: 28, fontSize: 11 }} />
                          </td>
                          <td style={{ width: 90 }}>
                            <UnitPicker value={item.unit}
                              onChange={v => setItems(prev => prev.map((it, j) => j === i ? { ...it, unit: v } : it))}
                              inputStyle={{ height: 28, fontSize: 11 }} />
                          </td>
                          <td style={{ width: 70, textAlign: 'center' }}>
                            {isReceived ? (
                              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--success)' }}>{item.receivedQty}</span>
                            ) : (
                              <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>—</span>
                            )}
                          </td>
                          <td>
                            {!isReceived && i > 0 && (
                              <button type="button" className="icon-btn" style={{ color: 'var(--danger)' }}
                                onClick={() => {
                                  if (item.isNew) setItems(prev => prev.filter((_, j) => j !== i));
                                  else setItems(prev => prev.map((it, j) => j === i ? { ...it, remove: true } : it));
                                }}>
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* CARDS VIEW */}
            {itemView === 'cards' && (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map((item, i) => {
                  if (item.remove) return null;
                  return (
                    <ItemRow key={i} item={item} index={i} stocks={stocks}
                      onUpdate={(idx, updated) => setItems(prev => prev.map((it, j) => j === idx ? updated : it))}
                      onRemove={(idx) => {
                        const it = items[idx];
                        if (it.isNew) setItems(prev => prev.filter((_, j) => j !== idx));
                        else setItems(prev => prev.map((it2, j) => j === idx ? { ...it2, remove: true } : it2));
                      }}
                      onOpenStockPicker={(idx) => setStockPickerFor(idx)}
                      siteSelected={!!siteId} />
                  );
                })}
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
          {/* Site — required */}
          <div className="stoq-panel" style={siteError ? { outline: '2px solid var(--danger)', outlineOffset: -1 } : {}}>
            <div className="stoq-panel__head">
              <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__icon"><MapPin size={13} /></span>
                Site <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>
              </span>
            </div>
            <div style={{ padding: 14 }}>
              <select className="stoq-select" value={siteId}
                onChange={e => handleSiteChange(e.target.value)}
                style={{ width: '100%', ...(siteError ? { borderColor: 'var(--danger)' } : {}) }}>
                <option value="">Select a site…</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}{s.location ? ` — ${s.location}` : ''}</option>
                ))}
              </select>
              {siteError && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{siteError}</p>}
              {siteId !== originalSiteId && originalSiteId && !siteChangedWithReceivedItems && (
                <p style={{ fontSize: 11, color: 'var(--warning, oklch(0.6 0.15 85))', marginTop: 6 }}>
                  Changing site will clear inventory links on unreceived items.
                </p>
              )}
            </div>
          </div>

          {/* Employee */}
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
            </div>
          </div>

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
        </div>
      </form>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
