import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, X, Trash2, Package, User, Truck,
  AlertCircle, CheckCircle, RefreshCw, List, LayoutGrid,
  MapPin, Lock,
} from 'lucide-react';
import requisitionService from '../../../services/requisitionService';
import stockService from '../../../services/stockService';
import employeeService from '../../../services/employeeService';
import supplierService from '../../../services/supplierService';
import siteService from '../../../services/siteService';
import UnitPicker from '../../../components/UnitPicker';
import PortalSelect from '../../../components/PortalSelect';
import StockPicker from '../../../components/StockPicker';
import { useViewMode } from '../../../hooks/useViewMode';
import { loadDraft, clearDraft, useFormDraft } from '../../../hooks/useFormDraft';

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

/* ── Item Row ───────────────────────────────────────────────────────── */
function ItemRow({ item, index, stocks, onUpdate, onRemove, siteSelected }) {
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

      {/* Stock link / item name */}
      <div style={{ marginBottom: 10 }}>
        <label className="stoq-field__label" style={{ marginBottom: 4, display: 'block' }}>
          Item name <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <StockPicker
          value={item.stockId}
          itemName={item.itemName}
          stocks={stocks}
          disabled={isReceived || !siteSelected}
          placeholder={isReceived ? 'Received — cannot re-link' : !siteSelected ? 'Select a site first' : 'Search or type item name…'}
          onSelect={(result) => onUpdate(index, { ...item, stockId: result.id || '', itemName: result.itemName, unit: result.unit ?? item.unit })}
          onClear={() => onUpdate(index, { ...item, stockId: '', itemName: '', unit: '' })}
        />
      </div>

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
        <div className="stoq-field" style={{ gridColumn: '1 / -1' }}>
          <label className="stoq-field__label">
            Cost Price (RWF)
            {!item.stockId && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
            {stocks.find(s => s.id === item.stockId)?.unitCost && (
              <span style={{ color: 'var(--fg-subtle)', fontWeight: 400, marginLeft: 4 }}>
                · stock: {new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0 }).format(Number(stocks.find(s => s.id === item.stockId)?.unitCost))}
              </span>
            )}
            {isReceived && <span style={{ color: 'var(--warning, oklch(0.6 0.15 85))', fontWeight: 400, marginLeft: 6 }}>(changing this resyncs the linked payment)</span>}
          </label>
          <input type="number" min="0" step="0.01" className="stoq-input" value={item.costPrice ?? ''}
            onChange={e => onUpdate(index, { ...item, costPrice: e.target.value })}
            placeholder={!item.stockId ? 'Required' : 'e.g. 1500'} />
        </div>
      </div>
    </div>
  );
}

const emptyItem = () => ({ stockId: '', itemName: '', quantity: '', unit: '', isNew: true });

export default function EditRequisition() {
  const { id } = useParams();
  const navigate = useNavigate();
  const draftKey = `edit-requisition-${id}`;

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

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };

  useFormDraft(draftKey, { employeeId, supplierId, siteId, description, items }, !loading);

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
        const draft = loadDraft(draftKey);
        setEmployeeId(draft?.employeeId ?? req.employeeId ?? '');
        setSupplierId(draft?.supplierId ?? req.supplierId ?? '');
        setSiteId(draft?.siteId ?? req.siteId ?? '');
        setOriginalSiteId(req.siteId ?? '');
        setDescription(draft?.description ?? req.description ?? '');
        setItems(draft?.items ?? (req.items ?? []).map(i => ({
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
  }, [id, draftKey]);

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
      clearDraft(draftKey);
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
                      <th className="no-sort">Qty</th>
                      <th className="no-sort">Unit</th>
                      <th className="no-sort num-cell">Cost Price</th>
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
                          <td style={{ minWidth: 220 }}>
                            <StockPicker
                              value={item.stockId}
                              itemName={item.itemName}
                              stocks={stocks}
                              disabled={isReceived || !siteId}
                              placeholder={isReceived ? 'Received — cannot re-link' : !siteId ? 'Select a site first' : 'Search or type item name…'}
                              onSelect={(result) => setItems(prev => prev.map((it, j) => j === i ? { ...it, stockId: result.id || '', itemName: result.itemName, unit: result.unit ?? it.unit } : it))}
                              onClear={() => setItems(prev => prev.map((it, j) => j === i ? { ...it, stockId: '', itemName: '', unit: '' } : it))}
                            />
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
                          <td className="num-cell" style={{ width: 110 }}>
                            <input type="number" min="0" step="0.01" className="stoq-input" value={item.costPrice ?? ''}
                              onChange={e => setItems(prev => prev.map((it, j) => j === i ? { ...it, costPrice: e.target.value } : it))}
                              placeholder={!item.stockId ? 'Required' : '0'}
                              style={{ height: 28, fontSize: 11, textAlign: 'right' }} />
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
          <div className="stoq-panel">
            <div className="stoq-panel__head">
              <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__icon"><Truck size={13} /></span>
                Supplier
              </span>
              <span className="stoq-panel__sub">optional</span>
            </div>
            <div style={{ padding: 14 }}>
              <PortalSelect
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
