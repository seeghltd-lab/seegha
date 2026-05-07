import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle, Package, Clock, RefreshCw, List, LayoutGrid, ChevronDown, Plus, Link2 } from 'lucide-react';
import requisitionService from '../../../services/requisitionService';
import stockService from '../../../services/stockService';
import categoryService from '../../../services/categoryService';
import siteService from '../../../services/siteService';
import { useViewMode } from '../../../hooks/useViewMode';

const fmt = (n) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0 }).format(n ?? 0);

const RECV_BADGE = {
  NOT_RECEIVED: 'stoq-badge',
  PARTIALLY_RECEIVED: 'stoq-badge stoq-badge--warning',
  FULLY_RECEIVED: 'stoq-badge stoq-badge--success',
};
const RECV_LABEL = { NOT_RECEIVED: 'Not Received', PARTIALLY_RECEIVED: 'Partial', FULLY_RECEIVED: 'Received' };

function ProgressBar({ received, total }) {
  const pct = total > 0 ? Math.min(100, (received / total) * 100) : 0;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--fg-subtle)', marginBottom: 4 }}>
        <span>{received} / {total} received</span><span>{Math.round(pct)}%</span>
      </div>
      <div className="progress-bar" style={{ height: 6 }}>
        <span style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--success)' : 'var(--accent)' }} />
      </div>
    </div>
  );
}

export default function ReceiveRequisition() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useOutletContext() ?? {};
  const backBase = role === 'employee' ? '/requisitions' : '/admin/requisition-management';
  const [requisition, setRequisition] = useState(null);
  const [receiveInputs, setReceiveInputs] = useState({});
  // newStockInputs: { [itemId]: { unitCost, siteId, categoryId, warehouseLocation, reorderLevel, open } }
  const [newStockInputs, setNewStockInputs] = useState({});
  const [sites, setSites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState(null);
  const [itemView, setItemView] = useViewMode('requisition-items', 'cards');

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const [req, sitesData, catsData] = await Promise.all([
        requisitionService.getOne(id),
        siteService.getAll().catch(() => []),
        categoryService.getAll().catch(() => []),
      ]);
      setRequisition(req);
      setSites((sitesData || []).map(s => ({ value: s.id, label: s.name })));
      setCategories((Array.isArray(catsData) ? catsData : catsData.categories || []).map(c => ({ value: c.id, label: c.name })));
      const inputs = {};
      const stockInputs = {};
      req.items.forEach(item => {
        if (item.receivingStatus !== 'FULLY_RECEIVED') {
          inputs[item.id] = { qty: '', note: '' };
          // Pre-fill newStockInputs for unlinked items
          if (!item.stockId) {
            stockInputs[item.id] = {
              open: false,
              unitCost: item.costPrice ?? '',
              // Pre-fill siteId from the requisition's site so the user doesn't have to re-select it
              siteId: req.siteId ?? '',
              categoryId: '',
              warehouseLocation: '',
              reorderLevel: 5,
            };
          }
        }
      });
      setReceiveInputs(inputs);
      setNewStockInputs(stockInputs);
    } catch { setErrors({ load: 'Failed to load requisition.' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleInput = (itemId, field, value) => setReceiveInputs(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
  const handleStockInput = (itemId, field, value) => setNewStockInputs(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
  const toggleStockForm = (itemId) => setNewStockInputs(prev => ({ ...prev, [itemId]: { ...prev[itemId], open: !prev[itemId]?.open } }));
  const maxFor = (item) => item.quantity - item.receivedQty;

  const validate = () => {
    const errs = {};
    let anyFilled = false;
    Object.entries(receiveInputs).forEach(([itemId, inp]) => {
      if (inp.qty === '' || inp.qty === null) return;
      const qty = Number(inp.qty);
      if (isNaN(qty) || qty <= 0) { errs[itemId] = 'Must be a positive number'; return; }
      const item = requisition.items.find(i => i.id === itemId);
      if (item && qty > maxFor(item)) { errs[itemId] = `Max: ${maxFor(item)}`; return; }
      // If item has no stock link, require unit cost
      if (item && !item.stockId) {
        const sd = newStockInputs[itemId];
        if (!sd?.unitCost || Number(sd.unitCost) <= 0) {
          errs[`${itemId}_cost`] = 'Unit cost required to create stock entry';
          return;
        }
      }
      anyFilled = true;
    });
    if (!anyFilled) errs.global = 'Enter at least one quantity to receive';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const items = Object.entries(receiveInputs)
        .filter(([, inp]) => inp.qty !== '' && Number(inp.qty) > 0)
        .map(([itemId, inp]) => {
          const item = requisition.items.find(i => i.id === itemId);
          const payload = { itemId, receivedQty: Number(inp.qty), note: inp.note || undefined };
          // Attach newStockData for unlinked items
          if (item && !item.stockId) {
            const sd = newStockInputs[itemId];
            if (sd?.unitCost && Number(sd.unitCost) > 0) {
              payload.newStockData = {
                unit: item.unit,
                unitCost: Number(sd.unitCost),
                siteId: sd.siteId || undefined,
                categoryId: sd.categoryId || undefined,
                warehouseLocation: sd.warehouseLocation || undefined,
                reorderLevel: sd.reorderLevel ? Number(sd.reorderLevel) : 5,
              };
            }
          }
          return payload;
        });
      const updated = await requisitionService.receiveItems(id, items);
      setRequisition(updated);
      setSuccess(true);
      showToast(updated.status === 'FULLY_RECEIVED' ? 'All items received!' : 'Receiving recorded');
      const nextInputs = {};
      const nextStockInputs = {};
      updated.items.forEach(item => {
        if (item.receivingStatus !== 'FULLY_RECEIVED') {
          nextInputs[item.id] = { qty: '', note: '' };
          if (!item.stockId) {
            nextStockInputs[item.id] = {
              open: false,
              unitCost: item.costPrice ?? '',
              // Keep the requisition's siteId as default
              siteId: updated.siteId ?? '',
              categoryId: '',
              warehouseLocation: '',
              reorderLevel: 5,
            };
          }
        }
      });
      setReceiveInputs(nextInputs);
      setNewStockInputs(nextStockInputs);
      if (updated.status === 'FULLY_RECEIVED') setTimeout(() => navigate(`${backBase}/${id}`), 1800);
      else setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || 'Failed to record receiving' });
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

  const pendingItems = requisition.items.filter(i => i.receivingStatus !== 'FULLY_RECEIVED');
  const doneItems = requisition.items.filter(i => i.receivingStatus === 'FULLY_RECEIVED');

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
            <h1>Receive Items</h1>
            <div className="page-head__sub">
              {requisition.employee?.firstName} {requisition.employee?.lastName}
            </div>
          </div>
        </div>
        <div className="page-head__actions">
          <button className="stoq-btn" onClick={() => navigate(-1)}>Cancel</button>
          {pendingItems.length > 0 && (
            <button className="stoq-btn stoq-btn--primary" disabled={submitting} onClick={handleSubmit}
              style={{ opacity: submitting ? 0.6 : 1 }}>
              {submitting ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Recording…</> : 'Record Receiving'}
            </button>
          )}
        </div>
      </div>

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--success-soft)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--success)', marginBottom: 14 }}>
          <CheckCircle size={14} />
          {requisition.status === 'FULLY_RECEIVED' ? 'All items received! Redirecting…' : 'Receiving recorded successfully.'}
        </div>
      )}
      {errors.submit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--danger-soft)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--danger)', marginBottom: 14 }}>
          <AlertCircle size={14} /> {errors.submit}
        </div>
      )}
      {errors.global && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 14 }}>{errors.global}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Pending items */}
        {pendingItems.length > 0 && (
          <div className="stoq-panel">
            <div className="stoq-panel__head">
              <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__icon"><Package size={13} /></span>
                Items to Receive ({pendingItems.length})
              </span>
              <div className="stoq-segment">
                <button data-active={itemView === 'cards' ? 'true' : undefined} onClick={() => setItemView('cards')} title="Card view"><LayoutGrid size={13} /></button>
                <button data-active={itemView === 'table' ? 'true' : undefined} onClick={() => setItemView('table')} title="Table view"><List size={13} /></button>
              </div>
            </div>

            {/* TABLE VIEW */}
            {itemView === 'table' && (
              <div className="table-wrap">
                <table className="stoq-tbl">
                  <thead>
                    <tr>
                      <th className="no-sort">Item</th>
                      <th className="no-sort">Stock</th>
                      <th className="no-sort">Status</th>
                      <th className="no-sort num-cell">Requested</th>
                      <th className="no-sort num-cell">Received</th>
                      <th className="no-sort num-cell">Remaining</th>
                      <th className="no-sort" style={{ width: 130 }}>Receive Qty</th>
                      <th className="no-sort" style={{ width: 140 }}>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingItems.map(item => {
                      const inp = receiveInputs[item.id] || { qty: '', note: '' };
                      const remaining = maxFor(item);
                      const sd = newStockInputs[item.id];
                      const isOpen = sd?.open;
                      return (
                        <React.Fragment key={item.id}>
                          <tr>
                            <td>
                              <span className="cell-stack__main">{item.itemName}</span>
                              {item.costPrice && (
                                <span className="cell-stack__sub">{fmt(item.costPrice)} / {item.unit}</span>
                              )}
                            </td>
                            <td>
                              {item.stock ? (
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>
                                  {item.stock.sku}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toggleStockForm(item.id)}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    background: isOpen ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                                    border: `1px solid ${isOpen ? 'var(--accent)' : 'var(--border)'}`,
                                    borderRadius: 'var(--r-sm)', padding: '3px 8px',
                                    fontSize: 10, fontWeight: 600, cursor: 'pointer',
                                    color: isOpen ? 'var(--accent-soft-fg)' : 'var(--fg-muted)',
                                    whiteSpace: 'nowrap',
                                  }}>
                                  <Link2 size={10} />
                                  {isOpen ? 'Hide' : 'New Stock'}
                                  <ChevronDown size={9} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                                </button>
                              )}
                            </td>
                            <td>
                              <span className={RECV_BADGE[item.receivingStatus] || 'stoq-badge'}>{RECV_LABEL[item.receivingStatus]}</span>
                            </td>
                            <td className="num-cell">{item.quantity} <span style={{ color: 'var(--fg-subtle)', fontSize: 10 }}>{item.unit}</span></td>
                            <td className="num-cell" style={{ color: item.receivedQty > 0 ? 'var(--success)' : 'var(--fg-subtle)' }}>
                              {item.receivedQty} <span style={{ fontSize: 10 }}>{item.unit}</span>
                            </td>
                            <td className="num-cell">
                              <span style={{ fontWeight: 600, color: remaining > 0 ? 'var(--warning)' : 'var(--success)' }}>
                                {remaining} <span style={{ fontSize: 10, fontWeight: 400 }}>{item.unit}</span>
                              </span>
                            </td>
                            <td>
                              <input type="number" min="0.01" step="0.01" max={remaining}
                                value={inp.qty} onChange={e => handleInput(item.id, 'qty', e.target.value)}
                                placeholder={`0–${remaining}`} className="stoq-input"
                                style={{ height: 28, fontSize: 11, ...(errors[item.id] ? { borderColor: 'var(--danger)' } : {}) }} />
                              {errors[item.id] && <div style={{ fontSize: 10, color: 'var(--danger)' }}>{errors[item.id]}</div>}
                            </td>
                            <td>
                              <input type="text" value={inp.note} onChange={e => handleInput(item.id, 'note', e.target.value)}
                                className="stoq-input" placeholder="Optional" style={{ height: 28, fontSize: 11 }} />
                            </td>
                          </tr>

                          {/* Expandable new-stock row for unlinked items */}
                          {!item.stockId && isOpen && (
                            <tr style={{ background: 'var(--accent-soft)' }}>
                              <td colSpan={8} style={{ padding: '10px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--accent-soft-fg)', marginBottom: 10 }}>
                                  <Plus size={11} /> New stock entry will be created and linked to this item
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                                  <div className="stoq-field">
                                    <label className="stoq-field__label">
                                      Unit Cost (RWF) <span style={{ color: 'var(--danger)' }}>*</span>
                                    </label>
                                    <input type="number" min="0.01" step="0.01" className="stoq-input"
                                      value={sd?.unitCost ?? ''}
                                      onChange={e => handleStockInput(item.id, 'unitCost', e.target.value)}
                                      placeholder="e.g. 1500"
                                      style={errors[`${item.id}_cost`] ? { borderColor: 'var(--danger)' } : {}} />
                                    {errors[`${item.id}_cost`] && (
                                      <span style={{ fontSize: 10, color: 'var(--danger)' }}>{errors[`${item.id}_cost`]}</span>
                                    )}
                                  </div>
                                  <div className="stoq-field">
                                    <label className="stoq-field__label">Reorder Level</label>
                                    <input type="number" min="0" className="stoq-input"
                                      value={sd?.reorderLevel ?? 5}
                                      onChange={e => handleStockInput(item.id, 'reorderLevel', e.target.value)} />
                                  </div>
                                  <div className="stoq-field">
                                    <label className="stoq-field__label">Site</label>
                                    <select className="stoq-select" style={{ width: '100%' }}
                                      value={sd?.siteId ?? ''}
                                      onChange={e => handleStockInput(item.id, 'siteId', e.target.value)}>
                                      <option value="">— None —</option>
                                      {sites.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                  </div>
                                  <div className="stoq-field">
                                    <label className="stoq-field__label">Category</label>
                                    <select className="stoq-select" style={{ width: '100%' }}
                                      value={sd?.categoryId ?? ''}
                                      onChange={e => handleStockInput(item.id, 'categoryId', e.target.value)}>
                                      <option value="">— None —</option>
                                      {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                  </div>
                                  <div className="stoq-field" style={{ gridColumn: 'span 2' }}>
                                    <label className="stoq-field__label">Warehouse Location</label>
                                    <input className="stoq-input"
                                      value={sd?.warehouseLocation ?? ''}
                                      onChange={e => handleStockInput(item.id, 'warehouseLocation', e.target.value)}
                                      placeholder="e.g. Shelf A-3 (optional)" />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* CARDS VIEW */}
            {itemView === 'cards' && (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pendingItems.map(item => {
                  const inp = receiveInputs[item.id] || { qty: '', note: '' };
                  const remaining = maxFor(item);
                  return (
                    <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Package size={14} style={{ color: 'var(--accent-soft-fg)', flexShrink: 0 }} />
                          <div>
                            <span className="cell-stack__main">{item.itemName}</span>
                            {item.stock && <span className="cell-stack__sub">{item.stock.sku}</span>}
                          </div>
                        </div>
                        <span className={RECV_BADGE[item.receivingStatus] || 'stoq-badge'}>{RECV_LABEL[item.receivingStatus]}</span>
                      </div>

                      <ProgressBar received={item.receivedQty} total={item.quantity} />
                      {item.costPrice && <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 6 }}>Cost: <strong>{fmt(item.costPrice)}</strong> / {item.unit}</p>}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                        <div className="stoq-field">
                          <label className="stoq-field__label">Receive Qty (max: {remaining} {item.unit})</label>
                          <input type="number" min="0.01" step="0.01" max={remaining}
                            value={inp.qty} onChange={e => handleInput(item.id, 'qty', e.target.value)}
                            placeholder={`0 – ${remaining}`} className="stoq-input"
                            style={errors[item.id] ? { borderColor: 'var(--danger)' } : {}} />
                          {errors[item.id] && <span style={{ fontSize: 11, color: 'var(--danger)' }}>{errors[item.id]}</span>}
                        </div>
                        <div className="stoq-field">
                          <label className="stoq-field__label">Note (optional)</label>
                          <input type="text" value={inp.note} onChange={e => handleInput(item.id, 'note', e.target.value)} className="stoq-input" />
                        </div>
                      </div>

                      {/* ── Create & Link Stock (for unlinked items) ── */}
                      {!item.stockId && (
                        <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                          <button type="button"
                            onClick={() => toggleStockForm(item.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: newStockInputs[item.id]?.open ? 'var(--accent-soft-fg)' : 'var(--fg-muted)', padding: 0 }}>
                            <Link2 size={12} />
                            {newStockInputs[item.id]?.open ? 'Hide stock details' : 'Create & link to stock'}
                            <ChevronDown size={11} style={{ transform: newStockInputs[item.id]?.open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                          </button>
                          {newStockInputs[item.id]?.open && (
                            <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--accent-soft)', borderRadius: 'var(--r-sm)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <div style={{ fontSize: 11, color: 'var(--accent-soft-fg)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <Plus size={11} /> A new stock entry will be created and linked to this item
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <div className="stoq-field">
                                  <label className="stoq-field__label">Unit Cost (RWF) <span style={{ color: 'var(--danger)' }}>*</span></label>
                                  <input type="number" min="0.01" step="0.01" className="stoq-input"
                                    value={newStockInputs[item.id]?.unitCost ?? ''}
                                    onChange={e => handleStockInput(item.id, 'unitCost', e.target.value)}
                                    placeholder="e.g. 1500"
                                    style={errors[`${item.id}_cost`] ? { borderColor: 'var(--danger)' } : {}} />
                                  {errors[`${item.id}_cost`] && <span style={{ fontSize: 10, color: 'var(--danger)' }}>{errors[`${item.id}_cost`]}</span>}
                                </div>
                                <div className="stoq-field">
                                  <label className="stoq-field__label">Reorder Level</label>
                                  <input type="number" min="0" className="stoq-input"
                                    value={newStockInputs[item.id]?.reorderLevel ?? 5}
                                    onChange={e => handleStockInput(item.id, 'reorderLevel', e.target.value)} />
                                </div>
                                <div className="stoq-field">
                                  <label className="stoq-field__label">Site</label>
                                  <select className="stoq-select" style={{ width: '100%' }}
                                    value={newStockInputs[item.id]?.siteId ?? ''}
                                    onChange={e => handleStockInput(item.id, 'siteId', e.target.value)}>
                                    <option value="">— None —</option>
                                    {sites.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                  </select>
                                </div>
                                <div className="stoq-field">
                                  <label className="stoq-field__label">Category</label>
                                  <select className="stoq-select" style={{ width: '100%' }}
                                    value={newStockInputs[item.id]?.categoryId ?? ''}
                                    onChange={e => handleStockInput(item.id, 'categoryId', e.target.value)}>
                                    <option value="">— None —</option>
                                    {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                  </select>
                                </div>
                                <div className="stoq-field" style={{ gridColumn: '1 / -1' }}>
                                  <label className="stoq-field__label">Warehouse Location</label>
                                  <input className="stoq-input"
                                    value={newStockInputs[item.id]?.warehouseLocation ?? ''}
                                    onChange={e => handleStockInput(item.id, 'warehouseLocation', e.target.value)}
                                    placeholder="e.g. Shelf A-3 (optional)" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Done items */}
        {doneItems.length > 0 && (
          <div className="stoq-panel">
            <div className="stoq-panel__head">
              <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__icon"><CheckCircle size={13} /></span>
                Fully Received ({doneItems.length})
              </span>
            </div>

            {/* TABLE VIEW for done items */}
            {itemView === 'table' && (
              <div className="table-wrap">
                <table className="stoq-tbl">
                  <thead>
                    <tr>
                      <th className="no-sort">Item</th>
                      <th className="no-sort num-cell">Qty</th>
                      <th className="no-sort">Receiving History</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doneItems.map(item => (
                      <tr key={item.id}>
                        <td>
                          <span className="cell-stack__main">{item.itemName}</span>
                          <span className="stoq-badge stoq-badge--success" style={{ marginLeft: 6 }}>Done</span>
                        </td>
                        <td className="num-cell">
                          {item.receivedQty} / {item.quantity} <span style={{ color: 'var(--fg-subtle)', fontSize: 10 }}>{item.unit}</span>
                        </td>
                        <td>
                          {item.receivingLogs?.map(log => (
                            <div key={log.id} style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
                              <Clock size={9} style={{ flexShrink: 0 }} />
                              <span>{log.receivedQty} {item.unit} by {log.receivedByName ?? log.receivedById}</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-subtle)' }}>{new Date(log.receivedAt).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* CARDS VIEW for done items */}
            {itemView === 'cards' && (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {doneItems.map(item => (
                  <div key={item.id} style={{ border: '1px solid var(--success-soft)', borderRadius: 'var(--r-md)', padding: 12, background: 'var(--success-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle size={14} style={{ color: 'var(--success)' }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{item.itemName}</span>
                      </div>
                      <span className="stoq-badge stoq-badge--success">Fully Received</span>
                    </div>
                    <ProgressBar received={item.receivedQty} total={item.quantity} />
                    {item.receivingLogs?.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        {item.receivingLogs.map(log => (
                          <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>
                            <Clock size={10} style={{ flexShrink: 0 }} />
                            <span>{log.receivedQty} {item.unit} by {log.receivedByName ?? log.receivedById}</span>
                            <span style={{ color: 'var(--fg-subtle)' }}>·</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{new Date(log.receivedAt).toLocaleString()}</span>
                            {log.note && <span style={{ fontStyle: 'italic', color: 'var(--fg-subtle)' }}>"{log.note}"</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
