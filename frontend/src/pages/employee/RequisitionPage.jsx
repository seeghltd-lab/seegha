import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, Trash2, Package, ChevronLeft, ChevronRight,
  Clock, CheckCircle, XCircle, CheckCheck, Search, Eye,
  FileText, AlertCircle, Truck,
} from 'lucide-react';
import requisitionService from '../../services/requisitionService';
import stockService from '../../services/stockService';
import { useSocketEvent } from '../../context/SocketContext';

const STATUS_CONFIG = {
  PENDING:            { label: 'Pending',            color: 'bg-amber-100 text-amber-700',    icon: Clock },
  APPROVED:           { label: 'Approved',           color: 'bg-blue-100 text-blue-700',      icon: CheckCircle },
  PARTIALLY_RECEIVED: { label: 'Partially Received', color: 'bg-orange-100 text-orange-700',  icon: Truck },
  FULLY_RECEIVED:     { label: 'Fully Received',     color: 'bg-emerald-100 text-emerald-700',icon: CheckCheck },
  REJECTED:           { label: 'Rejected',           color: 'bg-red-100 text-red-600',         icon: XCircle },
};

const UNITS = ['PCS', 'BOX', 'KG', 'LITERS', 'METER', 'SET', 'PAIR', 'ROLL', 'BAG', 'OTHER'];

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed top-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
      {toast.msg}
    </div>
  );
}

// Item row in the create form
function ItemRow({ item, index, stocks, onUpdate, onRemove }) {
  const [stockSearch, setStockSearch] = useState('');
  const [showStockPicker, setShowStockPicker] = useState(false);

  const filteredStocks = stocks.filter(s =>
    s.itemName.toLowerCase().includes(stockSearch.toLowerCase()) ||
    s.sku.toLowerCase().includes(stockSearch.toLowerCase())
  );

  const selectStock = (stock) => {
    onUpdate(index, {
      ...item,
      stockId: stock.id,
      itemName: stock.itemName,
      unit: stock.unit,
    });
    setStockSearch('');
    setShowStockPicker(false);
  };

  const clearStock = () => {
    onUpdate(index, { ...item, stockId: '', itemName: '', unit: 'PCS' });
  };

  return (
    <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Item {index + 1}</span>
        {index > 0 && (
          <button onClick={() => onRemove(index)} className="p-1 rounded-lg hover:bg-red-50 text-red-400">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Stock link (optional) */}
      <div className="relative">
        <label className="text-xs font-semibold text-slate-500 mb-1 block">
          Link to inventory item <span className="text-slate-300 font-normal">(optional)</span>
        </label>
        {item.stockId ? (
          <div className="flex items-center gap-2 px-3 py-2 border border-emerald-200 rounded-xl bg-emerald-50">
            <Package size={13} className="text-emerald-600" />
            <span className="text-sm text-emerald-700 font-semibold flex-1">{item.itemName}</span>
            <button onClick={clearStock} className="text-slate-400 hover:text-red-500">
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={stockSearch}
              onChange={e => { setStockSearch(e.target.value); setShowStockPicker(true); }}
              onFocus={() => setShowStockPicker(true)}
              placeholder="Search stock by name or SKU..."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {showStockPicker && stockSearch && (
              <div className="absolute top-full left-0 right-0 z-20 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                {filteredStocks.length === 0 ? (
                  <p className="text-xs text-slate-400 px-3 py-2 text-center">No matching stock items</p>
                ) : filteredStocks.slice(0, 8).map(s => (
                  <button key={s.id} onMouseDown={() => selectStock(s)}
                    className="w-full text-left px-3 py-2 hover:bg-primary/5 text-sm flex items-center gap-2">
                    <Package size={12} className="text-slate-400 flex-shrink-0" />
                    <span className="font-medium text-slate-700">{s.itemName}</span>
                    <span className="text-xs text-slate-400 font-mono ml-auto">{s.sku}</span>
                    <span className="text-xs text-slate-400">({s.quantity} {s.unit})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Item name (free-text if no stock linked) */}
      {!item.stockId && (
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Item Name <span className="text-red-400">*</span></label>
          <input
            value={item.itemName}
            onChange={e => onUpdate(index, { ...item, itemName: e.target.value })}
            placeholder="What do you need?"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}

      {/* Quantity + Unit */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Quantity <span className="text-red-400">*</span></label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={item.quantity}
            onChange={e => onUpdate(index, { ...item, quantity: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Unit</label>
          <select
            value={item.unit}
            onChange={e => onUpdate(index, { ...item, unit: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

const emptyItem = () => ({ stockId: '', itemName: '', quantity: '', unit: 'PCS' });

export default function EmployeeRequisitionPage() {
  const [tab, setTab] = useState('list'); // 'list' | 'create'
  const [requisitions, setRequisitions] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Create form
  const [description, setDescription] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [stocks, setStocks] = useState([]);

  // Detail modal
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await requisitionService.getAll({
        status: statusFilter || undefined,
        page,
        limit: 10,
      });
      setRequisitions(data.requisitions);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      showToast('Failed to load requisitions', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  // Load stocks for picker
  useEffect(() => {
    stockService.getAll({ limit: 200 })
      .then(d => setStocks(d.stocks || []))
      .catch(() => {});
  }, []);

  // Real-time updates
  useSocketEvent('requisition-updated', () => load());
  useSocketEvent('requisition-deleted', () => load());

  const openDetail = async (req) => {
    setDetailLoading(true);
    setSelected(req);
    try {
      const full = await requisitionService.getOne(req.id);
      setSelected(full);
    } catch {
      showToast('Failed to load details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const updateItem = (index, updated) => {
    setItems(prev => prev.map((it, i) => i === index ? updated : it));
  };

  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate
    for (const [i, item] of items.entries()) {
      if (!item.itemName.trim()) {
        showToast(`Item ${i + 1}: name is required`, 'error');
        return;
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        showToast(`Item ${i + 1}: quantity must be > 0`, 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      await requisitionService.create({
        description: description.trim() || undefined,
        items: items.map(it => ({
          stockId: it.stockId || undefined,
          itemName: it.itemName.trim(),
          quantity: parseFloat(it.quantity),
          unit: it.unit,
        })),
      });
      showToast('Requisition submitted successfully');
      setDescription('');
      setItems([emptyItem()]);
      setTab('list');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Submission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await requisitionService.remove(deleteTarget.id);
      showToast('Requisition deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <Toast toast={toast} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">My Requisitions</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} total requests submitted</p>
        </div>
        <button
          onClick={() => setTab(tab === 'create' ? 'list' : 'create')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow transition-all ${tab === 'create' ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-primary text-white hover:opacity-90'}`}
        >
          {tab === 'create' ? <><X size={15} /> Cancel</> : <><Plus size={15} /> New Request</>}
        </button>
      </div>

      {/* Create Form */}
      {tab === 'create' && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-800">New Requisition Request</h2>

          {/* Description */}
          <div>
            <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Description / Purpose</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Briefly explain what these items are needed for..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Items Requested</p>
              <button type="button" onClick={addItem}
                className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                <Plus size={13} /> Add Item
              </button>
            </div>
            {items.map((item, i) => (
              <ItemRow
                key={i}
                item={item}
                index={i}
                stocks={stocks}
                onUpdate={updateItem}
                onRemove={removeItem}
              />
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setTab('list')}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-60">
              {submitting ? 'Submitting...' : 'Submit Requisition'}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {tab === 'list' && (
        <>
          {/* Status filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {[['', 'All'], ...Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])].map(([val, label]) => (
              <button
                key={val}
                onClick={() => { setStatusFilter(val); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${statusFilter === val ? 'bg-primary text-white border-primary shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Requisition List */}
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading...</div>
          ) : requisitions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
              <FileText size={48} className="mx-auto text-slate-200 mb-3" />
              <p className="font-semibold text-slate-400">No requisitions yet</p>
              <p className="text-sm text-slate-300 mt-1">Click "New Request" to submit one.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requisitions.map(req => (
                <div key={req.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    req.status === 'APPROVED' ? 'bg-blue-100 text-blue-600' :
                    req.status === 'REJECTED' ? 'bg-red-100 text-red-500' :
                    req.status === 'FULLY_RECEIVED' ? 'bg-emerald-100 text-emerald-600' :
                    req.status === 'PARTIALLY_RECEIVED' ? 'bg-orange-100 text-orange-600' :
                    'bg-amber-100 text-amber-600'
                  }`}>
                    {req.status === 'APPROVED' ? <CheckCircle size={18} /> :
                     req.status === 'REJECTED' ? <XCircle size={18} /> :
                     req.status === 'FULLY_RECEIVED' ? <CheckCheck size={18} /> :
                     req.status === 'PARTIALLY_RECEIVED' ? <Truck size={18} /> :
                     <Clock size={18} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm">
                        {req.description || <span className="text-slate-400 font-normal italic">No description</span>}
                      </p>
                      <StatusBadge status={req.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Package size={11} /> {req._count?.items ?? 0} item{req._count?.items !== 1 ? 's' : ''}
                      </span>
                      <span>{new Date(req.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openDetail(req)}
                      className="p-1.5 rounded-lg hover:bg-primary/10 text-primary" title="View details">
                      <Eye size={14} />
                    </button>
                    {req.status === 'PENDING' && (
                      <button onClick={() => setDeleteTarget(req)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                  <ChevronLeft size={16} />
                </button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Request Details</h2>
                <p className="text-xs text-slate-400 font-mono">#{selected.id?.slice(-8).toUpperCase()}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              {detailLoading ? (
                <div className="text-center py-8 text-slate-400">Loading...</div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <StatusBadge status={selected.status} />
                    <span className="text-xs text-slate-400">
                      {new Date(selected.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {selected.description && (
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Description</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{selected.description}</p>
                    </div>
                  )}

                  {selected.status === 'REJECTED' && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                      <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">
                        {selected.rejectReason
                          ? <>Rejected: <strong>{selected.rejectReason}</strong></>
                          : 'Your request was rejected. Contact your manager for more info.'}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Items ({selected.items?.length ?? 0})
                    </p>
                    <div className="space-y-2">
                      {selected.items?.map((item, i) => (
                        <div key={item.id ?? i} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-slate-800 text-sm">{item.itemName}</p>
                              {item.receivingStatus && item.receivingStatus !== 'NOT_RECEIVED' && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                  item.receivingStatus === 'FULLY_RECEIVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {item.receivingStatus === 'FULLY_RECEIVED' ? 'Received' : `${item.receivedQty}/${item.quantity}`}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {item.quantity} {item.unit}
                              {item.stock && <span className="ml-2 font-mono text-slate-400">· {item.stock.sku}</span>}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100">
              <button onClick={() => setSelected(null)}
                className="w-full py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Delete Request?</h2>
            <p className="text-sm text-slate-500 mb-6">This pending requisition will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-60">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
