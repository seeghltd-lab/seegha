import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Edit2, Trash2, Eye, LayoutGrid, List, Table2,
  ChevronLeft, ChevronRight, AlertTriangle, Package, DollarSign,
  TrendingDown, X, RefreshCw, Download, CreditCard, ArrowUpCircle, ArrowDownCircle, History,
} from 'lucide-react';
import stockService from '../../../services/stockService';
import categoryService from '../../../services/categoryService';
import { useSocketEvent } from '../../../context/SocketContext';
import Sparkline, { genSpark } from '../../../components/Sparkline';
import { useViewMode } from '../../../hooks/useViewMode';
import { useRole } from '../../../hooks/useRole';

const STATUS_FILTERS = [
  { label: 'All',      value: '' },
  { label: 'In stock', value: 'ok' },
  { label: 'Low',      value: 'low' },
  { label: 'Out',      value: 'out' },
];

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`stoq-toast ${toast.type === 'error' ? 'stoq-toast--error' : 'stoq-toast--success'}`}>{toast.message}</div>;
}

function PaymentModal({ stock, onClose, onSuccess }) {
  const [type, setType] = useState('DEBIT');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount'); return; }
    setError('');
    setSubmitting(true);
    try {
      await stockService.recordPayment(stock.id, { type, amount: parseFloat(amount), reference, notes, date });
      onSuccess(`Payment recorded for ${stock.itemName}`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record payment');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="stoq-modal-backdrop">
      <div className="stoq-modal">
        <div className="stoq-modal__head">
          <div>
            <div className="stoq-modal__title">Record Payment</div>
            <div className="stoq-modal__sub">{stock.itemName} - {stock.sku}</div>
          </div>
          <button className="stoq-btn stoq-btn--ghost stoq-btn--icon" onClick={onClose}><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="stoq-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div className="stoq-field__label" style={{ marginBottom: 8 }}>Payment Type</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { val: 'CREDIT', label: 'Credit', desc: 'Amount owed to supplier', icon: ArrowUpCircle, tone: 'warning' },
                  { val: 'DEBIT',  label: 'Debit',  desc: 'Payment made to supplier', icon: ArrowDownCircle, tone: 'success' },
                ].map(({ val, label, desc, icon: Icon, tone }) => (
                  <button key={val} type="button" onClick={() => setType(val)}
                    style={{
                      padding: '10px 12px', borderRadius: 'var(--r-sm)', textAlign: 'left', cursor: 'pointer',
                      border: `2px solid ${type === val ? (tone === 'warning' ? 'var(--warning)' : 'var(--success)') : 'var(--border)'}`,
                      background: type === val ? (tone === 'warning' ? 'var(--warning-soft)' : 'var(--success-soft)') : 'var(--panel)',
                    }}>
                    <Icon size={16} style={{ color: tone === 'warning' ? 'var(--warning)' : 'var(--success)', marginBottom: 4 }} />
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{label}</div>
                    <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="stoq-field">
              <label className="stoq-field__label">Amount (RWF) *</label>
              <input type="number" min="0.01" step="0.01" className="stoq-input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="stoq-field">
                <label className="stoq-field__label">Reference</label>
                <input className="stoq-input" value={reference} onChange={e => setReference(e.target.value)} placeholder="Invoice #..." />
              </div>
              <div className="stoq-field">
                <label className="stoq-field__label">Date</label>
                <input type="date" className="stoq-input" value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </div>
            <div className="stoq-field">
              <label className="stoq-field__label">Notes</label>
              <textarea className="stoq-input" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional notes..." style={{ height: 'auto', paddingTop: 8, paddingBottom: 8, resize: 'none' }} />
            </div>
            {error && <p style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</p>}
          </div>
          <div className="stoq-modal__foot">
            <button type="button" className="stoq-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="stoq-btn stoq-btn--primary" disabled={submitting}>
              {submitting && <RefreshCw size={12} style={{ animation: 'spin 0.8s linear infinite' }} />}
              Record {type === 'CREDIT' ? 'Credit' : 'Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StockManagement() {
  const navigate = useNavigate();
  const { path, isAdmin } = useRole();
  const [stocks, setStocks] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode, isSmallScreen] = useViewMode('stock');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showDelete, setShowDelete] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [stats, setStats] = useState({ total: 0, totalValue: 0, lowStock: 0 });

  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await stockService.getAll({ search: search || undefined, categoryId: categoryId || undefined, page, limit: 12, sortBy, sortOrder });
      setStocks(data.stocks);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      const totalValue = data.stocks.reduce((sum, s) => sum + parseFloat(s.totalValue || 0), 0);
      const lowStock = data.stocks.filter(s => s.quantity <= s.reorderLevel).length;
      setStats({ total: data.total, totalValue, lowStock });
    } catch { showToast('Failed to load stock', 'error'); }
    finally { setLoading(false); }
  }, [search, categoryId, sortBy, sortOrder, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { categoryService.getAll().then(setCategories).catch(() => {}); }, []);
  useEffect(() => { const t = setTimeout(() => { if (page !== 1) setPage(1); }, 400); return () => clearTimeout(t); }, [search]);

  const visibleStocks = stockStatus === ''
    ? stocks
    : stockStatus === 'ok'
      ? stocks.filter(s => s.quantity > s.reorderLevel)
      : stockStatus === 'low'
        ? stocks.filter(s => s.quantity > 0 && s.quantity <= s.reorderLevel)
        : stocks.filter(s => s.quantity === 0);

  useSocketEvent('stock-created', load);
  useSocketEvent('stock-updated', load);
  useSocketEvent('stock-deleted', load);

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await stockService.remove(selected.id);
      showToast('Stock item deleted');
      setShowDelete(false);
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Failed to delete', 'error'); }
    finally { setSubmitting(false); }
  };

  const openDetail = (stock) => {
    navigate(path(`/stock/${stock.id}`));
  };

  const exportCSV = () => {
    const headers = ['SKU','Item Name','Category','Supplier','Quantity','Unit','Unit Cost','Total Value','Site','Location'];
    const rows = stocks.map(s => [s.sku,s.itemName,s.category?.name||'',s.supplier?.name||'',s.quantity,s.unit,s.unitCost,s.totalValue,s.site?.name||'',s.warehouseLocation||'']);
    const csv = [headers,...rows].map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`stock-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const LowBadge = ({ stock }) => stock.quantity <= stock.reorderLevel
    ? <span className="stoq-badge stoq-badge--warning" style={{ marginLeft: 4 }}><AlertTriangle size={9} />Low</span>
    : null;

  const ActionBtns = ({ s }) => (
    <div className="stoq-btn-group" style={{ justifyContent: 'flex-end' }}>
      {s.supplierId && <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="Payment" onClick={e => { e.stopPropagation(); setSelected(s); setShowPayment(true); }}><CreditCard size={13} /></button>}
      <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="Details" onClick={e => { e.stopPropagation(); openDetail(s); }}><Eye size={13} /></button>
      <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="Edit" onClick={e => { e.stopPropagation(); navigate(path(`/stock/edit/${s.id}`)); }}><Edit2 size={13} /></button>
      <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="Delete" style={{ color: 'var(--danger)' }} onClick={e => { e.stopPropagation(); setSelected(s); setShowDelete(true); }}><Trash2 size={13} /></button>
    </div>
  );

  return (
    <div>
      <Toast toast={toast} />

      {/* Page Head */}
      <div className="page-head">
        <div>
          <h1>Stock</h1>
          <div className="page-head__sub">{total} SKUs across all sites</div>
        </div>
        <div className="page-head__actions">
          <button className="stoq-btn" onClick={exportCSV}><Download size={13} /> CSV</button>
          <button className="stoq-btn" onClick={() => navigate(path('/stock/history'))}>
            <History size={13} /> History
          </button>
          <button className="stoq-btn" onClick={() => navigate(path('/stock/direct-receipt'))}>
            <ArrowDownCircle size={13} /> Direct receipt
          </button>
          <button className="stoq-btn stoq-btn--primary" onClick={() => navigate(path('/stock/add'))}><Plus size={13} /> Add stock</button>
        </div>
      </div>

      {/* KPI */}
      <div className="kpi-grid kpi-grid--3" style={{ marginBottom: 'var(--gap-card)' }}>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><DollarSign size={12} /></span>Total stock value</div>
          <div className="kpi__value" style={{ fontSize: 20 }}>RWF {(stats.totalValue / 1_000_000).toFixed(1)}M</div>
          <div className="kpi__foot"><span>across all sites</span><span className="kpi__delta kpi__delta--up">+4.2%</span></div>
          <Sparkline data={genSpark(1, 14, 0.4)} />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><Package size={12} /></span>Units on hand</div>
          <div className="kpi__value">{stats.total}</div>
          <div className="kpi__foot"><span>all SKUs combined</span><span className="kpi__delta kpi__delta--up">+{Math.max(1, Math.round(stats.total * 0.08))}</span></div>
          <Sparkline data={genSpark(3, 14, 0.2)} />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon" data-tone="warning"><TrendingDown size={12} /></span>Low / out of stock</div>
          <div className="kpi__value">{stats.lowStock}</div>
          <div className="kpi__foot"><span>below minimum threshold</span>{stats.lowStock > 0 && <span className="kpi__delta kpi__delta--down">+1</span>}</div>
          <Sparkline data={genSpark(7, 14, 0)} color="var(--warning)" />
        </div>
      </div>

      {/* Panel */}
      <div className="stoq-panel">
        <div className="stoq-toolbar">
          <div className="stoq-toolbar__search">
            <input className="stoq-input stoq-input--search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by item, SKU, location..." />
          </div>
          <select className="stoq-select" value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1); }} style={{ width: 160 }}>
            <option value="">All categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="stoq-segment">
            {STATUS_FILTERS.map(f => (
              <button key={f.value} data-active={stockStatus === f.value ? 'true' : undefined}
                onClick={() => setStockStatus(f.value)}>{f.label}</button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          {!isSmallScreen && (
            <div className="stoq-segment">
              <button data-active={viewMode==='table'?'true':undefined} onClick={()=>setViewMode('table')}><List size={13}/></button>
              <button data-active={viewMode==='grid'?'true':undefined} onClick={()=>setViewMode('grid')}><LayoutGrid size={13}/></button>
            </div>
          )}
          <button className="stoq-btn stoq-btn--icon" onClick={load} title="Refresh"><RefreshCw size={13} /></button>
        </div>

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="table-wrap">
            <table className="stoq-tbl">
              <thead>
                <tr>
                  <th className="no-sort">SKU / Item</th>
                  <th className="no-sort">Category</th>
                  <th className="no-sort">Site</th>
                  <th className="no-sort">Supplier</th>
                  <th className="no-sort num-cell">On hand</th>
                  <th className="no-sort num-cell">Unit cost</th>
                  <th className="no-sort num-cell">Total</th>
                  <th className="no-sort">Status</th>
                  <th className="no-sort col-actions" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="stoq-empty">Loading...</td></tr>
                ) : visibleStocks.length === 0 ? (
                  <tr><td colSpan={9} className="stoq-empty">No stock items found</td></tr>
                ) : visibleStocks.map(s => (
                  <tr key={s.id}>
                    <td>
                      <span className="cell-stack__main">{s.itemName}</span>
                      <span className="cell-stack__sub">{s.sku}</span>
                    </td>
                    <td><span className="stoq-badge stoq-badge--plain">{s.category?.name || '-'}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>{s.site?.name || '-'}</td>
                    <td style={{ color: 'var(--fg-muted)', fontSize: 12 }}>{s.supplier?.name || '-'}</td>
                    <td className="num-cell">
                      <span style={{ fontWeight: 600, color: s.quantity <= s.reorderLevel ? 'var(--warning)' : 'var(--fg)' }}>{s.quantity}</span>
                      <span style={{ color: 'var(--fg-subtle)', fontSize: 10, marginLeft: 4 }}>{s.unit}</span>
                    </td>
                    <td className="num-cell">{parseInt(s.unitCost).toLocaleString()}</td>
                    <td className="num-cell" style={{ fontWeight: 600 }}>RWF {parseFloat(s.totalValue).toLocaleString()}</td>
                    <td>
                      {s.quantity === 0
                        ? <span className="stoq-badge stoq-badge--danger">Out</span>
                        : s.quantity <= s.reorderLevel
                          ? <span className="stoq-badge stoq-badge--warning">Low - {s.quantity}/{s.reorderLevel}</span>
                          : <span className="stoq-badge stoq-badge--success">In stock</span>}
                    </td>
                    <td className="col-actions"><ActionBtns s={s} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--gap-card)' }}>
            {loading ? <div className="stoq-empty" style={{ gridColumn: '1/-1' }}>Loading...</div>
              : visibleStocks.length === 0 ? <div className="stoq-empty" style={{ gridColumn: '1/-1' }}>No stock items found</div>
              : visibleStocks.map(s => (
              <div key={s.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--panel)' }}>
                {s.stockImg
                  ? <img src={`http://localhost:3000${s.stockImg}`} alt={s.itemName} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: 120, background: 'var(--bg-sunk)', display: 'grid', placeItems: 'center', color: 'var(--fg-subtle)' }}><Package size={28} /></div>}
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{s.itemName}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-subtle)' }}>{s.sku}</div>
                    </div>
                    <LowBadge stock={s} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--fg-muted)' }}>{s.category?.name || '-'}</span>
                    <span style={{ fontWeight: 700, color: s.quantity <= s.reorderLevel ? 'var(--warning)' : 'var(--fg)' }}>{s.quantity} {s.unit}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>RWF {parseFloat(s.totalValue).toLocaleString()}</div>
                  <div style={{ display: 'flex', gap: 4, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    {s.supplierId && <button className="stoq-btn stoq-btn--sm" style={{ flex: 1, justifyContent: 'center', fontSize: 10 }} onClick={() => { setSelected(s); setShowPayment(true); }}><CreditCard size={10} /> Pay</button>}
                    <button className="stoq-btn stoq-btn--sm" style={{ flex: 1, justifyContent: 'center', fontSize: 10 }} onClick={() => openDetail(s)}>View</button>
                    <button className="stoq-btn stoq-btn--sm" style={{ flex: 1, justifyContent: 'center', fontSize: 10 }} onClick={() => navigate(path(`/stock/edit/${s.id}`))}>Edit</button>
                    <button className="stoq-btn stoq-btn--ghost stoq-btn--sm stoq-btn--icon" style={{ color: 'var(--danger)' }} onClick={() => { setSelected(s); setShowDelete(true); }}><Trash2 size={11} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}


        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Page {page} of {totalPages} - {total} total</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="stoq-btn stoq-btn--icon" disabled={page<=1} style={{ opacity: page<=1?0.4:1 }} onClick={() => setPage(p=>p-1)}><ChevronLeft size={14}/></button>
              <button className="stoq-btn stoq-btn--icon" disabled={page>=totalPages} style={{ opacity: page>=totalPages?0.4:1 }} onClick={() => setPage(p=>p+1)}><ChevronRight size={14}/></button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPayment && selected && (
        <PaymentModal stock={selected} onClose={() => { setShowPayment(false); setSelected(null); }} onSuccess={msg => showToast(msg)} />
      )}

      {/* Delete Modal */}
      {showDelete && selected && (
        <div className="stoq-modal-backdrop">
          <div className="stoq-modal" style={{ maxWidth: 400 }}>
            <div className="stoq-modal__head">
              <div>
                <div className="stoq-modal__title">Delete Stock Item</div>
                <div className="stoq-modal__sub">{selected.itemName} - {selected.sku}</div>
              </div>
              <button className="stoq-btn stoq-btn--ghost stoq-btn--icon" onClick={() => setShowDelete(false)}><X size={14} /></button>
            </div>
            <div className="stoq-modal__body">
              <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>This cannot be undone.</p>
            </div>
            <div className="stoq-modal__foot">
              <button className="stoq-btn" onClick={() => setShowDelete(false)}>Cancel</button>
              <button className="stoq-btn stoq-btn--primary" style={{ background: 'var(--danger)', borderColor: 'transparent' }} onClick={handleDelete} disabled={submitting}>
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selected && (
        <div className="stoq-modal-backdrop">
          <div className="stoq-modal stoq-modal--wide">
            <div className="stoq-modal__head">
              <div>
                <div className="stoq-modal__title">{selected.itemName}</div>
                <div className="stoq-modal__sub stoq-badge stoq-badge--plain" style={{ fontFamily: 'var(--font-mono)', marginTop: 2 }}>{selected.sku}</div>
              </div>
              <button className="stoq-btn stoq-btn--ghost stoq-btn--icon" onClick={() => setShowDetail(false)}><X size={14} /></button>
            </div>
            <div className="stoq-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {selected.stockImg && <img src={`http://localhost:3000${selected.stockImg}`} alt="" style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 'var(--r-sm)' }} />}
              <div className="detail-grid">
                {[
                  ['SKU', selected.sku],
                  ['Category', selected.category?.name||'-'],
                  ['Supplier', selected.supplier?.name||'-'],
                  ['Site', selected.site?.name||'-'],
                  ['Quantity', `${selected.quantity} ${selected.unit}`],
                  ['Unit Cost', `RWF ${parseFloat(selected.unitCost).toLocaleString()}`],
                  ['Total Value', `RWF ${parseFloat(selected.totalValue).toLocaleString()}`],
                  ['Reorder Level', selected.reorderLevel],
                  ['Location', selected.warehouseLocation||'-'],
                  ['Received', new Date(selected.receivedDate).toLocaleDateString()],
                  ['Expiry', selected.expiryDate ? new Date(selected.expiryDate).toLocaleDateString() : '-'],
                ].map(([k,v]) => (
                  <div className="detail-cell" key={k}>
                    <div className="detail-cell__label">{k}</div>
                    <div className="detail-cell__value">{v}</div>
                  </div>
                ))}
              </div>
              {selected.description && (
                <div style={{ background: 'var(--bg-sunk)', borderRadius: 'var(--r-sm)', padding: '10px 14px', fontSize: 12, color: 'var(--fg-muted)' }}>
                  <div className="stoq-field__label" style={{ marginBottom: 4 }}>Description</div>
                  {selected.description}
                </div>
              )}
              {selected.history?.length > 0 && (
                <div>
                  <div className="stoq-panel__title" style={{ marginBottom: 8 }}>Recent History</div>
                  {selected.history.slice(0, 5).map(h => (
                    <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--bg-sunk)', borderRadius: 'var(--r-xs)', marginBottom: 4, fontSize: 11 }}>
                      <span style={{ fontWeight: 700, color: h.movementType==='IN'?'var(--success)':h.movementType==='OUT'?'var(--danger)':'var(--warning)' }}>{h.movementType}</span>
                      <span style={{ color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}>{h.qtyBefore} → {h.qtyAfter}</span>
                      <span style={{ color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>{new Date(h.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="stoq-modal__foot">
              {selected.supplierId && (
                <button className="stoq-btn" onClick={() => { setShowDetail(false); setShowPayment(true); }}><CreditCard size={13} /> Record Payment</button>
              )}
              <button className="stoq-btn stoq-btn--primary" onClick={() => navigate(path(`/stock/edit/${selected.id}`))}>Edit Stock</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}


