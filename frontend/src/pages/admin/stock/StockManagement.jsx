import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Edit2, Trash2, Eye, LayoutGrid, List, Table2,
  ChevronLeft, ChevronRight, AlertTriangle, Package, DollarSign,
  TrendingDown, X, Filter, Download, RefreshCw,
} from 'lucide-react';
import stockService from '../../../services/stockService';
import categoryService from '../../../services/categoryService';
import { useSocketEvent } from '../../../context/SocketContext';

const DATE_FILTERS = [
  { label: 'All Time', value: '' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
];

function getDateRange(filter) {
  const now = new Date();
  if (filter === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    return { dateFrom: start.toISOString(), dateTo: now.toISOString() };
  }
  if (filter === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - 7);
    return { dateFrom: start.toISOString(), dateTo: now.toISOString() };
  }
  if (filter === 'month') {
    const start = new Date(now); start.setDate(1); start.setHours(0, 0, 0, 0);
    return { dateFrom: start.toISOString(), dateTo: now.toISOString() };
  }
  return {};
}

export default function StockManagement() {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('table');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  const [showDelete, setShowDelete] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Stats
  const [stats, setStats] = useState({ total: 0, totalValue: 0, lowStock: 0 });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange(dateFilter);
      const data = await stockService.getAll({
        search: search || undefined,
        categoryId: categoryId || undefined,
        page,
        limit: 12,
        sortBy,
        sortOrder,
        ...dateRange,
      });
      setStocks(data.stocks);
      setTotal(data.total);
      setTotalPages(data.totalPages);

      // Compute stats from current page
      const totalValue = data.stocks.reduce((sum, s) => sum + parseFloat(s.totalValue || 0), 0);
      const lowStock = data.stocks.filter(s => s.quantity <= s.reorderLevel).length;
      setStats({ total: data.total, totalValue, lowStock });
    } catch {
      showToast('Failed to load stock', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, dateFilter, sortBy, sortOrder, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    categoryService.getAll().then(setCategories).catch(() => {});
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      if (page !== 1) setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Real-time socket updates
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
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (stock) => {
    try {
      const detail = await stockService.getOne(stock.id);
      setSelected(detail);
      setShowDetail(true);
    } catch {
      showToast('Failed to load details', 'error');
    }
  };

  const LowStockBadge = ({ stock }) => {
    if (stock.quantity <= stock.reorderLevel) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
          <AlertTriangle size={10} /> Low Stock
        </span>
      );
    }
    return null;
  };

  const exportCSV = () => {
    const headers = ['SKU', 'Item Name', 'Category', 'Supplier', 'Quantity', 'Unit', 'Unit Cost', 'Total Value', 'Location'];
    const rows = stocks.map(s => [
      s.sku, s.itemName, s.category?.name || '', s.supplier?.name || '',
      s.quantity, s.unit, s.unitCost, s.totalValue, s.warehouseLocation,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `stock-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Stock Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} items in inventory</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50">
            <Download size={15} /> CSV
          </button>
          <button onClick={() => navigate('/admin/stock/add')} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 shadow">
            <Plus size={16} /> Add Stock
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Package, label: 'Total Items', value: stats.total, color: 'text-blue-600 bg-blue-50' },
          { icon: DollarSign, label: 'Total Value', value: `RWF ${stats.totalValue.toLocaleString()}`, color: 'text-emerald-600 bg-emerald-50' },
          { icon: TrendingDown, label: 'Low Stock', value: stats.lowStock, color: 'text-amber-600 bg-amber-50' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{label}</p>
              <p className="text-xl font-extrabold text-slate-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by item, SKU, location..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex border border-slate-200 rounded-xl overflow-hidden text-sm">
          {DATE_FILTERS.map(f => (
            <button key={f.value} onClick={() => { setDateFilter(f.value); setPage(1); }}
              className={`px-3 py-2 ${dateFilter === f.value ? 'bg-primary text-white' : 'hover:bg-slate-50 text-slate-600'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <select value={`${sortBy}-${sortOrder}`} onChange={e => {
          const [field, order] = e.target.value.split('-');
          setSortBy(field); setSortOrder(order); setPage(1);
        }} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="createdAt-desc">Newest First</option>
          <option value="createdAt-asc">Oldest First</option>
          <option value="name-asc">Name A-Z</option>
          <option value="quantity-asc">Low Quantity</option>
          <option value="quantity-desc">High Quantity</option>
          <option value="totalValue-desc">Highest Value</option>
        </select>
        <div className="flex border border-slate-200 rounded-xl overflow-hidden">
          {[['table', Table2], ['grid', LayoutGrid], ['list', List]].map(([m, Icon]) => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`p-2 ${viewMode === m ? 'bg-primary text-white' : 'hover:bg-slate-50 text-slate-500'}`}>
              <Icon size={16} />
            </button>
          ))}
        </div>
        <button onClick={load} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Item</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Category</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Qty</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Unit Cost</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Total Value</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Location</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">Loading...</td></tr>
              ) : stocks.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">No stock items found</td></tr>
              ) : stocks.map(s => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-800">{s.itemName}</div>
                    <div className="text-xs text-slate-400 font-mono">{s.sku}</div>
                    <LowStockBadge stock={s} />
                  </td>
                  <td className="px-5 py-4 text-slate-500">{s.category?.name || '—'}</td>
                  <td className="px-5 py-4">
                    <span className={`font-bold ${s.quantity <= s.reorderLevel ? 'text-amber-600' : 'text-slate-800'}`}>{s.quantity}</span>
                    <span className="text-slate-400 text-xs ml-1">{s.unit}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-600">RWF {parseFloat(s.unitCost).toLocaleString()}</td>
                  <td className="px-5 py-4 font-semibold text-slate-800">RWF {parseFloat(s.totalValue).toLocaleString()}</td>
                  <td className="px-5 py-4 text-slate-500">{s.warehouseLocation}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openDetail(s)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Eye size={14} /></button>
                      <button onClick={() => navigate(`/admin/stock/edit/${s.id}`)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary"><Edit2 size={14} /></button>
                      <button onClick={() => { setSelected(s); setShowDelete(true); }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-slate-400">Loading...</div>
          ) : stocks.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400">No stock items found</div>
          ) : stocks.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {s.stockImg ? (
                <img src={`http://localhost:3000${s.stockImg}`} alt={s.itemName} className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-36 bg-slate-100 flex items-center justify-center text-slate-400">
                  <Package size={32} />
                </div>
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{s.itemName}</div>
                    <div className="text-xs text-slate-400 font-mono">{s.sku}</div>
                  </div>
                  <LowStockBadge stock={s} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{s.category?.name || 'No category'}</span>
                  <span className={`font-bold ${s.quantity <= s.reorderLevel ? 'text-amber-600' : 'text-slate-700'}`}>{s.quantity} {s.unit}</span>
                </div>
                <div className="text-xs text-slate-500">RWF {parseFloat(s.totalValue).toLocaleString()}</div>
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button onClick={() => openDetail(s)} className="flex-1 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">View</button>
                  <button onClick={() => navigate(`/admin/stock/edit/${s.id}`)} className="flex-1 py-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5">Edit</button>
                  <button onClick={() => { setSelected(s); setShowDelete(true); }} className="flex-1 py-1.5 text-xs font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading...</div>
          ) : stocks.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No stock items found</div>
          ) : stocks.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-3 flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <Package size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-slate-800">{s.itemName}</span>
                <span className="ml-2 text-xs text-slate-400 font-mono">{s.sku}</span>
                <LowStockBadge stock={s} />
              </div>
              <div className="text-sm text-slate-500 hidden md:block">{s.category?.name || '—'}</div>
              <div className={`text-sm font-bold hidden sm:block ${s.quantity <= s.reorderLevel ? 'text-amber-600' : 'text-slate-700'}`}>{s.quantity} {s.unit}</div>
              <div className="text-sm font-semibold text-slate-700 hidden lg:block">RWF {parseFloat(s.totalValue).toLocaleString()}</div>
              <div className="flex gap-1">
                <button onClick={() => openDetail(s)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Eye size={14} /></button>
                <button onClick={() => navigate(`/admin/stock/edit/${s.id}`)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary"><Edit2 size={14} /></button>
                <button onClick={() => { setSelected(s); setShowDelete(true); }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {page} of {totalPages} · {total} total</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"><ChevronLeft size={16} /></button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDelete && selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Delete Stock Item</h2>
            <p className="text-sm text-slate-500 mb-6">
              Delete <strong>{selected.itemName}</strong> ({selected.sku})? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={handleDelete} disabled={submitting} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-60">
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">{selected.itemName}</h2>
              <button onClick={() => setShowDetail(false)} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {selected.stockImg && <img src={`http://localhost:3000${selected.stockImg}`} alt="" className="w-full h-48 object-cover rounded-xl" />}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['SKU', selected.sku],
                  ['Category', selected.category?.name || '—'],
                  ['Supplier', selected.supplier?.name || '—'],
                  ['Quantity', `${selected.quantity} ${selected.unit}`],
                  ['Unit Cost', `RWF ${parseFloat(selected.unitCost).toLocaleString()}`],
                  ['Total Value', `RWF ${parseFloat(selected.totalValue).toLocaleString()}`],
                  ['Reorder Level', selected.reorderLevel],
                  ['Location', selected.warehouseLocation],
                  ['Received', new Date(selected.receivedDate).toLocaleDateString()],
                  ['Expiry', selected.expiryDate ? new Date(selected.expiryDate).toLocaleDateString() : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{k}</p>
                    <p className="font-semibold text-slate-800 mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
              {selected.description && (
                <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600">
                  <p className="text-xs text-slate-400 font-semibold uppercase mb-1">Description</p>
                  {selected.description}
                </div>
              )}
              {selected.history?.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-slate-700 mb-2">Recent History</p>
                  <div className="space-y-2">
                    {selected.history.slice(0, 5).map(h => (
                      <div key={h.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                        <span className={`font-bold ${h.movementType === 'IN' ? 'text-emerald-600' : h.movementType === 'OUT' ? 'text-red-500' : 'text-amber-600'}`}>
                          {h.movementType}
                        </span>
                        <span className="text-slate-500">{h.qtyBefore} → {h.qtyAfter}</span>
                        <span className="text-slate-400">{new Date(h.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
