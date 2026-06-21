import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { Plus, Trash2, X, ArrowLeft, CheckCircle, AlertCircle, Truck, RefreshCw, List, LayoutGrid, MapPin } from 'lucide-react';
import requisitionService from '../../../services/requisitionService';
import stockService from '../../../services/stockService';
import supplierService from '../../../services/supplierService';
import UnitPicker from '../../../components/UnitPicker';
import PortalSelect from '../../../components/PortalSelect';
import StockPicker from '../../../components/StockPicker';
import { useViewMode } from '../../../hooks/useViewMode';
import { loadDraft, clearDraft, useFormDraft } from '../../../hooks/useFormDraft';

const fmt = (n) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0 }).format(n ?? 0);

export default function ApproveRequisition() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useOutletContext() ?? {};
  const backBase = role === 'employee' ? '/requisitions' : '/admin/requisition-management';
  const draftKey = `approve-requisition-${id}`;

  const [requisition, setRequisition] = useState(null);
  const [items, setItems] = useState([]);
  const [allStocks, setAllStocks] = useState([]);
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

  useFormDraft(draftKey, { items, notes, supplierId }, !loading);

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
        const draft = loadDraft(draftKey);
        setSupplierId(draft?.supplierId ?? req.supplierId ?? '');
        setNotes(draft?.notes ?? '');
        setSuppliers(supplierList ?? []);
        setItems(draft?.items ?? req.items.map(item => ({ ...item, costPrice: item.costPrice ?? (item.stock ? Number(item.stock.unitCost) : ''), paymentType: item.paymentType ?? 'NONE', isNew: false, remove: false })));
        setAllStocks(stockData.stocks ?? stockData);
      } catch { setErrors({ load: 'Failed to load requisition.' }); }
      finally { setLoading(false); }
    };
    load();
  }, [id, draftKey]);

  const getStock = (stockId) => allStocks.find(s => s.id === stockId) || null;
  const isAlreadySelected = (stockId, currentIdx) => items.some((item, i) => i !== currentIdx && item.stockId === stockId && !item.remove);

  const selectStockForItem = (index, result) => {
    if (result.id && isAlreadySelected(result.id, index)) { showToast('That stock is already linked to another item', 'error'); return; }
    const next = [...items];
    next[index] = result.id
      ? { ...next[index], stockId: result.id, itemName: result.itemName, unit: result.unit, costPrice: Number(result.unitCost) || '' }
      : { ...next[index], stockId: '', itemName: result.itemName };
    setItems(next);
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
      clearDraft(draftKey);
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
              <PortalSelect
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
                    if (item.remove) return (
                      <tr key={idx} style={{ opacity: 0.4, background: 'var(--danger-soft)' }}>
                        <td><span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{idx + 1}</span></td>
                        <td colSpan={5}><span style={{ fontSize: 12, color: 'var(--danger)', fontStyle: 'italic' }}>Marked for removal: {item.itemName}</span></td>
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
                        <td style={{ minWidth: 200 }}>
                          <StockPicker
                            value={item.stockId}
                            itemName={item.itemName}
                            stocks={allStocks}
                            onSelect={(result) => selectStockForItem(idx, result)}
                            onClear={() => clearStock(idx)}
                          />
                          {errors[`items.${idx}.itemName`] && <div style={{ fontSize: 10, color: 'var(--danger)' }}>{errors[`items.${idx}.itemName`]}</div>}
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
                          <label className="stoq-field__label" style={{ marginBottom: 4, display: 'block' }}>
                            Item name <span style={{ color: 'var(--danger)' }}>*</span>
                          </label>
                          <StockPicker
                            value={item.stockId}
                            itemName={item.itemName}
                            stocks={allStocks}
                            onSelect={(result) => selectStockForItem(idx, result)}
                            onClear={() => clearStock(idx)}
                          />
                          {errors[`items.${idx}.itemName`] && <span style={{ fontSize: 11, color: 'var(--danger)' }}>{errors[`items.${idx}.itemName`]}</span>}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
    </div>
  );
}
