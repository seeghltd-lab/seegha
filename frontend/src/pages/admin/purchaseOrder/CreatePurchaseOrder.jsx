import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, AlertCircle, CheckCircle, RefreshCw,
  List, LayoutGrid, Package, ShoppingCart,
} from 'lucide-react';
import purchaseOrderService from '../../../services/purchaseOrderService';
import supplierService from '../../../services/supplierService';
import stockService from '../../../services/stockService';
import categoryService from '../../../services/categoryService';
import siteService from '../../../services/siteService';
import StockPicker from '../../../components/StockPicker';
import PortalSelect from '../../../components/PortalSelect';
import UnitPicker from '../../../components/UnitPicker';
import { useViewMode } from '../../../hooks/useViewMode';

const fmt = (n) =>
  new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0 }).format(n ?? 0);

const emptyItem = () => ({
  stockId: '',
  itemName: '',
  quantity: '',
  unit: '',
  unitCost: '',
  categoryId: '',
  notes: '',
  paymentType: 'NONE',
});

/* ── Item card (cards view) ────────────────────────────────────────────── */
function ItemRow({ item, index, stocks, onUpdate, onRemove, siteSelected, categories, onCreateCategory }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Item {index + 1}
        </span>
        <button type="button" className="icon-btn" onClick={() => onRemove(index)} style={{ color: 'var(--danger)' }}>
          <Trash2 size={13} />
        </button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label className="stoq-field__label" style={{ marginBottom: 4, display: 'block' }}>
          Item name <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <StockPicker
          value={item.stockId}
          itemName={item.itemName}
          stocks={stocks}
          disabled={!siteSelected}
          placeholder={siteSelected ? 'Search or type item name…' : 'Select a site first'}
          onSelect={(result) =>
            onUpdate(index, {
              ...item,
              stockId: result.id || '',
              itemName: result.itemName,
              unit: result.unit ?? item.unit,
              unitCost: result.unitCost != null ? String(result.unitCost) : item.unitCost,
              categoryId: result.id ? item.categoryId : item.categoryId,
            })
          }
          onClear={() => onUpdate(index, { ...item, stockId: '', itemName: '', unit: '', unitCost: '' })}
        />
      </div>

      {!item.stockId && (
        <div style={{ marginBottom: 10 }}>
          <PortalSelect
            label="Category"
            options={categories}
            value={item.categoryId}
            onChange={(v) => onUpdate(index, { ...item, categoryId: v })}
            placeholder="Select or create…"
            onCreate={onCreateCategory}
            createLabel="category"
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div className="stoq-field">
          <label className="stoq-field__label">Quantity <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input
            type="number"
            min="0.001"
            step="any"
            className="stoq-input"
            value={item.quantity}
            onChange={(e) => onUpdate(index, { ...item, quantity: e.target.value })}
          />
        </div>
        <div className="stoq-field">
          <label className="stoq-field__label">Unit</label>
          <UnitPicker
            value={item.unit}
            onChange={(v) => onUpdate(index, { ...item, unit: v })}
            placeholder="Select or create unit…"
          />
        </div>
        <div className="stoq-field">
          <label className="stoq-field__label">Unit Cost (RWF)</label>
          <input
            type="number"
            min="0"
            step="any"
            className="stoq-input"
            placeholder="0"
            value={item.unitCost}
            onChange={(e) => onUpdate(index, { ...item, unitCost: e.target.value })}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="stoq-field">
          <label className="stoq-field__label">Payment Type</label>
          <select
            className="stoq-select"
            value={item.paymentType}
            onChange={(e) => onUpdate(index, { ...item, paymentType: e.target.value })}
          >
            <option value="NONE">None</option>
            <option value="CREDIT">Credit (invoice owed)</option>
            <option value="DEBIT">Debit (payment made)</option>
          </select>
        </div>
        <div className="stoq-field">
          <label className="stoq-field__label">Notes</label>
          <input
            className="stoq-input"
            placeholder="Item notes…"
            value={item.notes}
            onChange={(e) => onUpdate(index, { ...item, notes: e.target.value })}
          />
        </div>
      </div>

      {item.unitCost && item.quantity && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--fg-muted)', textAlign: 'right' }}>
          Total: <strong>{fmt(parseFloat(item.quantity) * parseFloat(item.unitCost))}</strong>
        </div>
      )}
    </div>
  );
}

export default function CreatePurchaseOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role } = useOutletContext() ?? {};
  const supplierId = searchParams.get('supplierId') || '';
  const backPath = role === 'employee'
    ? `/suppliers/${supplierId}?tab=purchase_orders`
    : `/admin/suppliers/${supplierId}?tab=purchase_orders`;

  const [supplier, setSupplier] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sites, setSites] = useState([]);

  const [siteId, setSiteId] = useState('');
  const [siteError, setSiteError] = useState('');
  const [notes, setNotes] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [itemView, setItemView] = useViewMode('po-items', 'cards');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!supplierId) { navigate(-1); return; }
    supplierService.getOne(supplierId).then(setSupplier).catch(() => navigate(-1));
    siteService.getAll().then((d) => setSites(d.sites || d || [])).catch(() => {});
    categoryService.getAll().then((d) =>
      setCategories((Array.isArray(d) ? d : d.categories || []).map((c) => ({ value: c.id, label: c.name })))
    ).catch(() => {});
  }, [supplierId]);

  useEffect(() => {
    if (!siteId) { setStocks([]); return; }
    stockService.getAll({ siteId, supplierId, limit: 300 })
      .then((d) => setStocks(d.stocks || []))
      .catch(() => {});
  }, [siteId, supplierId]);

  const handleCreateCategory = async (name) => {
    const cat = await categoryService.create({ name });
    const opt = { value: cat.id, label: cat.name };
    setCategories((prev) => [...prev, opt]);
    showToast(`Category "${name}" created`);
    return cat.id;
  };

  const updateItem = (idx, updated) =>
    setItems((prev) => prev.map((it, j) => (j === idx ? updated : it)));

  const removeItem = (idx) =>
    setItems((prev) => prev.filter((_, j) => j !== idx));

  const totalValue = items.reduce((s, it) => {
    const q = parseFloat(it.quantity) || 0;
    const c = parseFloat(it.unitCost) || 0;
    return s + q * c;
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!siteId) { setSiteError('Site is required'); setError('Please select a site before submitting'); return; }
    setSiteError('');
    for (const [i, item] of items.entries()) {
      if (!item.itemName.trim()) { setError(`Item ${i + 1}: name is required`); return; }
      if (!item.quantity || parseFloat(item.quantity) <= 0) { setError(`Item ${i + 1}: quantity must be > 0`); return; }
    }
    setSubmitting(true);
    try {
      const po = await purchaseOrderService.create({
        supplierId,
        siteId,
        notes: notes.trim() || undefined,
        expectedDate: expectedDate || undefined,
        items: items.map((it) => ({
          stockId: it.stockId || undefined,
          itemName: it.itemName.trim(),
          quantity: parseFloat(it.quantity),
          unit: it.unit || undefined,
          unitCost: it.unitCost ? parseFloat(it.unitCost) : undefined,
          categoryId: it.categoryId || undefined,
          notes: it.notes.trim() || undefined,
          paymentType: it.paymentType || 'NONE',
        })),
      });
      showToast(`Purchase order ${po.reference} created`);
      setTimeout(() => navigate(backPath), 900);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create purchase order');
      setSubmitting(false);
    }
  };

  if (!supplier) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-muted)' }}>
        Loading supplier…
      </div>
    );
  }

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
          <button className="icon-btn" onClick={() => navigate(backPath)}><ArrowLeft size={14} /></button>
          <div>
            <h1>Create Purchase Order</h1>
            <div className="page-head__sub">{supplier.name} · Select a site to filter available stock</div>
          </div>
        </div>
        <div className="page-head__actions">
          <button className="stoq-btn" onClick={() => navigate(backPath)}>Cancel</button>
          <button
            className="stoq-btn stoq-btn--primary"
            disabled={submitting}
            onClick={handleSubmit}
            style={{ opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</> : <><ShoppingCart size={13} /> Create PO</>}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--danger-soft)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--danger)', marginBottom: 14 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, alignItems: 'start' }}>
        {/* Left: Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="stoq-panel">
            <div className="stoq-panel__head">
              <span className="stoq-panel__title">Items ({items.length})</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="stoq-segment">
                  <button type="button" data-active={itemView === 'cards' ? 'true' : undefined} onClick={() => setItemView('cards')} title="Card view"><LayoutGrid size={13} /></button>
                  <button type="button" data-active={itemView === 'table' ? 'true' : undefined} onClick={() => setItemView('table')} title="Table view"><List size={13} /></button>
                </div>
                <button type="button" className="stoq-btn stoq-btn--sm stoq-btn--primary"
                  onClick={() => setItems((prev) => [...prev, emptyItem()])}>
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
                      <th>#</th>
                      <th>Item Name</th>
                      <th>Category</th>
                      <th>Qty</th>
                      <th>Unit</th>
                      <th>Unit Cost</th>
                      <th>Total</th>
                      <th>Pay Type</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td><span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{i + 1}</span></td>
                        <td style={{ minWidth: 220 }}>
                          <StockPicker
                            value={item.stockId}
                            itemName={item.itemName}
                            stocks={stocks}
                            disabled={!siteId}
                            placeholder={siteId ? 'Search or type…' : 'Select site first'}
                            onSelect={(result) => updateItem(i, {
                              ...item,
                              stockId: result.id || '',
                              itemName: result.itemName,
                              unit: result.unit ?? item.unit,
                              unitCost: result.unitCost != null ? String(result.unitCost) : item.unitCost,
                            })}
                            onClear={() => updateItem(i, { ...item, stockId: '', itemName: '', unit: '', unitCost: '' })}
                          />
                        </td>
                        <td style={{ minWidth: 130 }}>
                          {item.stockId ? (
                            <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
                              {stocks.find((s) => s.id === item.stockId)?.category?.name || '—'}
                            </span>
                          ) : (
                            <PortalSelect
                              options={categories}
                              value={item.categoryId}
                              onChange={(v) => updateItem(i, { ...item, categoryId: v })}
                              placeholder="Category…"
                              onCreate={handleCreateCategory}
                              createLabel="category"
                            />
                          )}
                        </td>
                        <td style={{ width: 80 }}>
                          <input type="number" min="0.001" step="any" className="stoq-input" value={item.quantity}
                            onChange={(e) => updateItem(i, { ...item, quantity: e.target.value })}
                            style={{ height: 28, fontSize: 11 }} />
                        </td>
                        <td style={{ width: 90 }}>
                          <UnitPicker
                            value={item.unit}
                            onChange={(v) => updateItem(i, { ...item, unit: v })}
                            inputStyle={{ height: 28, fontSize: 11 }}
                          />
                        </td>
                        <td style={{ width: 110 }}>
                          <input type="number" min="0" step="any" className="stoq-input" value={item.unitCost}
                            placeholder="0"
                            onChange={(e) => updateItem(i, { ...item, unitCost: e.target.value })}
                            style={{ height: 28, fontSize: 11 }} />
                        </td>
                        <td className="num-cell" style={{ fontSize: 12, fontWeight: 600 }}>
                          {item.unitCost && item.quantity
                            ? fmt(parseFloat(item.quantity) * parseFloat(item.unitCost))
                            : '—'}
                        </td>
                        <td style={{ width: 100 }}>
                          <select className="stoq-select" value={item.paymentType}
                            onChange={(e) => updateItem(i, { ...item, paymentType: e.target.value })}
                            style={{ height: 28, fontSize: 11 }}>
                            <option value="NONE">None</option>
                            <option value="CREDIT">Credit</option>
                            <option value="DEBIT">Debit</option>
                          </select>
                        </td>
                        <td>
                          {items.length > 1 && (
                            <button type="button" className="icon-btn" style={{ color: 'var(--danger)' }}
                              onClick={() => removeItem(i)}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {totalValue > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, padding: '8px 12px' }}>Grand Total</td>
                        <td className="num-cell" style={{ fontWeight: 700, fontSize: 13 }}>{fmt(totalValue)}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {/* CARDS VIEW */}
            {itemView === 'cards' && (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map((item, i) => (
                  <ItemRow
                    key={i}
                    item={item}
                    index={i}
                    stocks={stocks}
                    onUpdate={updateItem}
                    onRemove={removeItem}
                    siteSelected={!!siteId}
                    categories={categories}
                    onCreateCategory={handleCreateCategory}
                  />
                ))}
                {totalValue > 0 && (
                  <div style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600, fontSize: 14 }}>
                    Grand Total: <span style={{ color: 'var(--accent)' }}>{fmt(totalValue)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Details sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Supplier (read-only) */}
          <div className="stoq-panel" style={{ padding: 14 }}>
            <div className="stoq-panel__title" style={{ marginBottom: 10 }}>Supplier</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={16} style={{ color: 'var(--fg-muted)' }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{supplier.name}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{supplier.code}</div>
              </div>
            </div>
          </div>

          {/* Site (required) */}
          <div className="stoq-panel" style={{ padding: 14 }}>
            <div className="stoq-field" style={{ margin: 0 }}>
              <label className="stoq-field__label">
                Delivery Site <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <select
                className={`stoq-select${siteError ? ' stoq-select--error' : ''}`}
                value={siteId}
                onChange={(e) => { setSiteId(e.target.value); setSiteError(''); }}
              >
                <option value="">— Select a site —</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {siteError && (
                <span style={{ fontSize: 11, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <AlertCircle size={11} /> {siteError}
                </span>
              )}
              {siteId && (
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>
                  Showing stock available at this site
                </div>
              )}
            </div>
          </div>

          {/* Order details */}
          <div className="stoq-panel" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="stoq-panel__title">Order Details</div>
            <div className="stoq-field" style={{ margin: 0 }}>
              <label className="stoq-field__label">Expected Delivery Date</label>
              <input
                className="stoq-input"
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
            <div className="stoq-field" style={{ margin: 0 }}>
              <label className="stoq-field__label">Notes</label>
              <textarea
                className="stoq-input"
                rows={3}
                style={{ resize: 'vertical' }}
                placeholder="Internal notes or instructions…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Summary */}
          {totalValue > 0 && (
            <div className="stoq-panel" style={{ padding: 14 }}>
              <div className="stoq-panel__title" style={{ marginBottom: 8 }}>Summary</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--fg-muted)' }}>Items</span>
                <span>{items.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                <span>Total Value</span>
                <span style={{ color: 'var(--accent)' }}>{fmt(totalValue)}</span>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
