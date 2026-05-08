import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, PackageMinus, RefreshCw, List, LayoutGrid, AlertTriangle, CheckCircle, AlertCircle, Save } from 'lucide-react';
import siteService from '../../../services/siteService';
import stockService from '../../../services/stockService';
import { useRole } from '../../../hooks/useRole';
import { useViewMode } from '../../../hooks/useViewMode';

const today = () => new Date().toISOString().slice(0, 10);

const makeEmptyRow = () => ({
  _key: Math.random().toString(36).slice(2),
  stockId: '',
  quantity: '',
  date: today(),
  notes: '',
});

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

export default function SiteStockOut() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const { path } = useRole();

  const [site, setSite] = useState(null);
  const [siteStocks, setSiteStocks] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [rows, setRows] = useState([makeEmptyRow()]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [viewMode, setViewMode] = useViewMode('site-stockout-add');

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  useEffect(() => {
    Promise.all([
      siteService.getOne(siteId),
      stockService.getAll({ siteId, limit: 200 }),
    ]).then(([s, stk]) => {
      setSite(s);
      setSiteStocks(stk.stocks || []);
    }).catch(() => {}).finally(() => setLoadingData(false));
  }, [siteId]);

  const addRow = () => setRows(prev => [...prev, makeEmptyRow()]);
  const removeRow = (key) => setRows(prev => prev.filter(r => r._key !== key));

  const updateRow = (key, field, value) => {
    setRows(prev => prev.map(r => r._key === key
      ? { ...r, [field]: value, ...(field === 'stockId' ? { quantity: '' } : {}) }
      : r
    ));
    setErrors(prev => { const next = { ...prev }; delete next[key + '_' + field]; return next; });
  };

  const getAvailableQty = (stockId) => {
    const stock = siteStocks.find(s => s.id === stockId);
    if (!stock) return 0;
    const usedInOtherRows = rows
      .filter(r => r.stockId === stockId && r._key !== 'current')
      .reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0);
    return Math.max(0, stock.quantity - usedInOtherRows);
  };

  const usedStockIds = (currentKey) =>
    rows.filter(r => r._key !== currentKey && r.stockId).map(r => r.stockId);

  const validate = () => {
    const errs = {};
    const seenStockIds = new Set();
    rows.forEach(row => {
      if (!row.stockId) {
        errs[row._key + '_stockId'] = 'Select a stock item';
      } else if (seenStockIds.has(row.stockId)) {
        errs[row._key + '_stockId'] = 'This item is already in another row — remove the duplicate';
      } else {
        seenStockIds.add(row.stockId);
      }
      if (!row.quantity || parseFloat(row.quantity) <= 0) {
        errs[row._key + '_quantity'] = 'Enter a valid quantity';
      } else {
        const stock = siteStocks.find(s => s.id === row.stockId);
        if (stock && parseFloat(row.quantity) > stock.quantity) {
          errs[row._key + '_quantity'] = `Max available: ${stock.quantity} ${stock.unit}`;
        }
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    const results = { ok: [], failed: [] };
    for (const row of rows) {
      const stock = siteStocks.find(s => s.id === row.stockId);
      try {
        await siteService.recordStockOut(siteId, {
          stockId: row.stockId,
          quantity: parseFloat(row.quantity),
          unit: stock?.unit || '',
          notes: row.notes || undefined,
          date: row.date,
        });
        results.ok.push(stock?.itemName || row.stockId);
      } catch (err) {
        results.failed.push({ name: stock?.itemName || row.stockId, msg: err.response?.data?.message || 'Failed' });
      }
    }

    setSubmitting(false);

    if (results.failed.length === 0) {
      showToast(`${results.ok.length} item${results.ok.length !== 1 ? 's' : ''} recorded successfully`);
      setTimeout(() => navigate(path('/sites/' + siteId) + '?tab=stockout'), 900);
    } else if (results.ok.length > 0) {
      showToast(`${results.ok.length} recorded, ${results.failed.length} failed: ${results.failed.map(f => f.name).join(', ')}`, 'error');
      const failedStockIds = results.failed.map(f => rows.find(r => siteStocks.find(s => s.id === r.stockId)?.itemName === f.name)?.stockId).filter(Boolean);
      setRows(prev => prev.filter(r => failedStockIds.includes(r.stockId)));
    } else {
      showToast(results.failed.map(f => `${f.name}: ${f.msg}`).join(' · '), 'error');
    }
  };

  if (loadingData) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 10, color: 'var(--fg-subtle)' }}>
      <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ padding: '20px 24px 60px' }}>
      <Toast toast={toast} />

      {/* Page head */}
      <div className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-btn" onClick={() => navigate(path('/sites/' + siteId) + '?tab=stockout')}><ArrowLeft size={14} /></button>
          <div>
            <div className="stoq-crumbs" style={{ marginBottom: 4 }}>
              <span>Sites</span>
              <span className="stoq-crumbs__sep">/</span>
              <span style={{ cursor: 'pointer', color: 'var(--fg-subtle)' }} onClick={() => navigate(path('/sites/' + siteId))}>{site?.name || 'Site'}</span>
              <span className="stoq-crumbs__sep">/</span>
              <span className="stoq-crumbs__current">Record Stock Out</span>
            </div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PackageMinus size={18} style={{ color: 'var(--accent-soft-fg)' }} />
              Record Stock Out
            </h1>
            <div className="page-head__sub">{site?.name} — record materials consumed or dispatched from this site</div>
          </div>
        </div>
        <div className="page-head__actions">
          <div className="stoq-segment">
            <button data-active={viewMode === 'table' ? 'true' : undefined} onClick={() => setViewMode('table')}><List size={13} /></button>
            <button data-active={viewMode === 'grid' ? 'true' : undefined} onClick={() => setViewMode('grid')}><LayoutGrid size={13} /></button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Items */}
        {viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14, marginBottom: 16 }}>
            {rows.map((row, idx) => {
              const stock = siteStocks.find(s => s.id === row.stockId);
              return (
                <div key={row._key} className="stoq-panel" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Item {idx + 1}</span>
                    {rows.length > 1 && (
                      <button type="button" className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => removeRow(row._key)}><Trash2 size={13} /></button>
                    )}
                  </div>

                  <div className="stoq-field" style={{ marginBottom: 10 }}>
                    <label className="stoq-field__label">Stock Item <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <select className="stoq-select" value={row.stockId} onChange={e => updateRow(row._key, 'stockId', e.target.value)} style={{ width: '100%' }}>
                      <option value="">— Select item —</option>
                      {siteStocks.map(s => {
                        const alreadyUsed = usedStockIds(row._key).includes(s.id);
                        return (
                          <option key={s.id} value={s.id} disabled={s.quantity <= 0 || alreadyUsed}>
                            {s.itemName} — {s.quantity} {s.unit} available{alreadyUsed ? ' (already added)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {errors[row._key + '_stockId'] && <span style={{ fontSize: 11, color: 'var(--danger)' }}>{errors[row._key + '_stockId']}</span>}
                    {stock && (
                      <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 3, display: 'flex', gap: 8 }}>
                        <span>Available: <strong>{stock.quantity} {stock.unit}</strong></span>
                        {stock.quantity <= (stock.reorderLevel || 0) && <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 3 }}><AlertTriangle size={10} /> Low stock</span>}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div className="stoq-field">
                      <label className="stoq-field__label">Quantity <span style={{ color: 'var(--danger)' }}>*</span>{stock ? ` (max ${stock.quantity})` : ''}</label>
                      <input type="number" min="0.01" step="0.01" max={stock?.quantity || undefined}
                        className="stoq-input" value={row.quantity} placeholder="0"
                        onChange={e => updateRow(row._key, 'quantity', e.target.value)} />
                      {errors[row._key + '_quantity'] && <span style={{ fontSize: 11, color: 'var(--danger)' }}>{errors[row._key + '_quantity']}</span>}
                    </div>
                    <div className="stoq-field">
                      <label className="stoq-field__label">Date</label>
                      <input type="date" className="stoq-input" value={row.date} onChange={e => updateRow(row._key, 'date', e.target.value)} />
                    </div>
                  </div>

                  <div className="stoq-field">
                    <label className="stoq-field__label">Notes (optional)</label>
                    <input className="stoq-input" value={row.notes} placeholder="Usage notes, reason…"
                      onChange={e => updateRow(row._key, 'notes', e.target.value)} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table view */
          <div className="stoq-panel" style={{ marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="stoq-tbl">
                <thead>
                  <tr>
                    <th className="no-sort" style={{ minWidth: 200 }}>Stock Item <span style={{ color: 'var(--danger)' }}>*</span></th>
                    <th className="no-sort" style={{ width: 150 }}>Quantity <span style={{ color: 'var(--danger)' }}>*</span></th>
                    <th className="no-sort" style={{ width: 140 }}>Date</th>
                    <th className="no-sort">Notes</th>
                    <th className="no-sort col-actions" style={{ width: 44 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const stock = siteStocks.find(s => s.id === row.stockId);
                    return (
                      <tr key={row._key}>
                        <td>
                          <select className="stoq-select" value={row.stockId} onChange={e => updateRow(row._key, 'stockId', e.target.value)} style={{ width: '100%', minWidth: 180 }}>
                            <option value="">— Select item —</option>
                            {siteStocks.map(s => {
                              const alreadyUsed = usedStockIds(row._key).includes(s.id);
                              return (
                                <option key={s.id} value={s.id} disabled={s.quantity <= 0 || alreadyUsed}>
                                  {s.itemName} ({s.quantity} {s.unit}){alreadyUsed ? ' — already added' : ''}
                                </option>
                              );
                            })}
                          </select>
                          {errors[row._key + '_stockId'] && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>{errors[row._key + '_stockId']}</div>}
                          {stock && <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 2 }}>Available: {stock.quantity} {stock.unit}</div>}
                        </td>
                        <td>
                          <input type="number" min="0.01" step="0.01" max={stock?.quantity || undefined}
                            className="stoq-input" value={row.quantity} placeholder="0"
                            onChange={e => updateRow(row._key, 'quantity', e.target.value)} style={{ width: '100%' }} />
                          {errors[row._key + '_quantity'] && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>{errors[row._key + '_quantity']}</div>}
                        </td>
                        <td>
                          <input type="date" className="stoq-input" value={row.date} onChange={e => updateRow(row._key, 'date', e.target.value)} style={{ width: '100%' }} />
                        </td>
                        <td>
                          <input className="stoq-input" value={row.notes} placeholder="Optional…" onChange={e => updateRow(row._key, 'notes', e.target.value)} style={{ width: '100%' }} />
                        </td>
                        <td>
                          {rows.length > 1 && (
                            <button type="button" className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => removeRow(row._key)}><Trash2 size={13} /></button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button type="button" className="stoq-btn" onClick={addRow}>
            <Plus size={13} /> Add Another Item
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="stoq-btn" onClick={() => navigate(path('/sites/' + siteId) + '?tab=stockout')}>
              Cancel
            </button>
            <button type="submit" className="stoq-btn stoq-btn--primary" disabled={submitting}
              style={{ opacity: submitting ? 0.6 : 1, minWidth: 140, justifyContent: 'center' }}>
              {submitting
                ? <><RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Submitting…</>
                : <><Save size={13} /> Record {rows.length} Item{rows.length !== 1 ? 's' : ''}</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
