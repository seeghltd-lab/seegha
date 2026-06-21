import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Plus, X, Trash2, Package, User, Truck, AlertCircle, CheckCircle, RefreshCw, List, LayoutGrid, MapPin, Link2 } from 'lucide-react';
import requisitionService from '../../../services/requisitionService';
import stockService from '../../../services/stockService';
import categoryService from '../../../services/categoryService';
import employeeService from '../../../services/employeeService';
import supplierService from '../../../services/supplierService';
import siteService from '../../../services/siteService';
import UnitPicker from '../../../components/UnitPicker';
import PortalSelect from '../../../components/PortalSelect';
import StockPicker from '../../../components/StockPicker';
import { useViewMode } from '../../../hooks/useViewMode';
import { loadDraft, clearDraft, useFormDraft } from '../../../hooks/useFormDraft';

const DRAFT_KEY = 'create-requisition';

/* ── Item Row (cards view) ──────────────────────────────────────────── */
function ItemRow({ item, index, stocks, onUpdate, onRemove, siteSelected, categories, onCreateCategory }) {
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
          Item name <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <StockPicker
          value={item.stockId}
          itemName={item.itemName}
          stocks={stocks}
          disabled={!siteSelected}
          placeholder={siteSelected ? 'Search or type item name…' : 'Select a site first'}
          onSelect={(result) => onUpdate(index, { ...item, stockId: result.id || '', itemName: result.itemName, unit: result.unit ?? item.unit })}
          onClear={() => onUpdate(index, { ...item, stockId: '', itemName: '', unit: '' })}
        />
      </div>

      {!item.stockId && (
        <div style={{ marginBottom: 10 }}>
          <PortalSelect
            label="Category"
            options={categories}
            value={item.categoryId}
            onChange={v => onUpdate(index, { ...item, categoryId: v })}
            placeholder="Select or create…"
            onCreate={onCreateCategory}
            createLabel="category"
          />
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

const emptyItem = () => ({ stockId: '', itemName: '', quantity: '', unit: '', categoryId: '' });

export default function CreateRequisition() {
  const navigate = useNavigate();
  const { role } = useOutletContext() ?? {};
  const isEmployee = role === 'employee';
  const [employees, setEmployees] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [sites, setSites] = useState([]);
  const draft = loadDraft(DRAFT_KEY);
  const [employeeId, setEmployeeId] = useState(draft?.employeeId ?? '');
  const [supplierId, setSupplierId] = useState(draft?.supplierId ?? '');
  const [siteId, setSiteId] = useState(draft?.siteId ?? '');
  const [siteError, setSiteError] = useState('');
  const [description, setDescription] = useState(draft?.description ?? '');
  const [items, setItems] = useState(draft?.items ?? [emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [itemView, setItemView] = useViewMode('requisition-items', 'cards');

  useFormDraft(DRAFT_KEY, { employeeId, supplierId, siteId, description, items });

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    employeeService.getAllEmployees().then(d => setEmployees(d.employees || d || [])).catch(() => {});
    supplierService.getForSelect().then(data => setSuppliers(data.map(s => ({ value: s.id, label: `${s.name} (${s.code})` })))).catch(() => {});
    siteService.getAll().then(d => setSites(d.sites || d || [])).catch(() => {});
    categoryService.getAll().then(d => setCategories(d.map(c => ({ value: c.id, label: c.name })))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!siteId) { setStocks([]); return; }
    stockService.getAll({ siteId, limit: 200 }).then(d => setStocks(d.stocks || [])).catch(() => {});
  }, [siteId]);

  const handleCreateSupplier = async (name) => {
    const sup = await supplierService.create({ name });
    const opt = { value: sup.id, label: `${sup.name} (${sup.code})` };
    setSuppliers(prev => [...prev, opt]);
    showToast(`Supplier "${name}" created`);
    return sup.id;
  };

  const handleCreateCategory = async (name) => {
    const cat = await categoryService.create({ name });
    const opt = { value: cat.id, label: cat.name };
    setCategories(prev => [...prev, opt]);
    showToast(`Category "${name}" created`);
    return cat.id;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!siteId) {
      setSiteError('Site is required');
      setError('Please select a site before submitting');
      return;
    }
    setSiteError('');
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
        items: items.map(it => ({ stockId: it.stockId || undefined, itemName: it.itemName.trim(), quantity: parseFloat(it.quantity), unit: it.unit, categoryId: it.categoryId || undefined })),
      });
      clearDraft(DRAFT_KEY);
      showToast('Requisition created');
      setTimeout(() => navigate(isEmployee ? '/requisitions' : '/admin/requisition-management'), 900);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create requisition');
      setSubmitting(false);
    }
  };

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
            <h1>Create Requisition</h1>
            <div className="page-head__sub">Select a site first — stock is filtered per site</div>
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
                      <th className="no-sort">Category</th>
                      <th className="no-sort">Qty</th>
                      <th className="no-sort">Unit</th>
                      <th className="no-sort col-actions" />
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
                            placeholder={siteId ? 'Search or type item name…' : 'Select a site first'}
                            onSelect={(result) => setItems(prev => prev.map((it, j) => j === i ? { ...it, stockId: result.id || '', itemName: result.itemName, unit: result.unit ?? it.unit } : it))}
                            onClear={() => setItems(prev => prev.map((it, j) => j === i ? { ...it, stockId: '', itemName: '', unit: '' } : it))}
                          />
                        </td>
                        <td style={{ minWidth: 130 }}>
                          {item.stockId ? (
                            <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
                              {stocks.find(s => s.id === item.stockId)?.category?.name || '—'}
                            </span>
                          ) : (
                            <PortalSelect
                              options={categories}
                              value={item.categoryId}
                              onChange={v => setItems(prev => prev.map((it, j) => j === i ? { ...it, categoryId: v } : it))}
                              placeholder="Category…"
                              onCreate={handleCreateCategory}
                              createLabel="category"
                            />
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
                    siteSelected={!!siteId}
                    categories={categories}
                    onCreateCategory={handleCreateCategory} />
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
          {/* Site — REQUIRED, always first */}
          <div className="stoq-panel" style={siteError ? { outline: '2px solid var(--danger)', outlineOffset: -1 } : {}}>
            <div className="stoq-panel__head">
              <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__icon"><MapPin size={13} /></span>
                Site <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>
              </span>
            </div>
            <div style={{ padding: 14 }}>
              <select
                className="stoq-select"
                value={siteId}
                onChange={e => { setSiteId(e.target.value); setSiteError(''); }}
                style={{ width: '100%', ...(siteError ? { borderColor: 'var(--danger)' } : {}) }}>
                <option value="">Select a site…</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}{s.location ? ` — ${s.location}` : ''}</option>
                ))}
              </select>
              {siteError && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{siteError}</p>}
              {!siteId && !siteError && (
                <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 6 }}>
                  Select a site to load inventory stock.
                </p>
              )}
            </div>
          </div>

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
    </div>
  );
}
