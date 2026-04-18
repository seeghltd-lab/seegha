import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, Trash2, Package, ChevronLeft, ChevronRight,
  Clock, CheckCircle, XCircle, CheckCheck, Search, Eye,
  FileText, Truck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import requisitionService from '../../services/requisitionService';
import stockService from '../../services/stockService';
import { useSocketEvent } from '../../context/SocketContext';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';

const hasPerm = (employee, name) =>
  employee?.permissions?.some(p => p.permission.name === name) ?? false;

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

function ItemRow({ item, index, stocks, onUpdate, onRemove }) {
  const [stockSearch, setStockSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const filtered = stocks.filter(s =>
    s.itemName.toLowerCase().includes(stockSearch.toLowerCase()) ||
    s.sku.toLowerCase().includes(stockSearch.toLowerCase())
  );

  const selectStock = (stock) => {
    onUpdate(index, { ...item, stockId: stock.id, itemName: stock.itemName, unit: stock.unit });
    setStockSearch('');
    setShowPicker(false);
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

      <div className="relative">
        <label className="text-xs font-semibold text-slate-500 mb-1 block">
          Link to inventory <span className="text-slate-300 font-normal">(optional)</span>
        </label>
        {item.stockId ? (
          <div className="flex items-center gap-2 px-3 py-2 border border-emerald-200 rounded-xl bg-emerald-50">
            <Package size={13} className="text-emerald-600" />
            <span className="text-sm text-emerald-700 font-semibold flex-1">{item.itemName}</span>
            <button onClick={() => onUpdate(index, { ...item, stockId: '', itemName: '', unit: 'PCS' })} className="text-slate-400 hover:text-red-500">
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={stockSearch}
              onChange={e => { setStockSearch(e.target.value); setShowPicker(true); }}
              onFocus={() => setShowPicker(true)}
              placeholder="Search stock by name or SKU..."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {showPicker && stockSearch && (
              <div className="absolute top-full left-0 right-0 z-20 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="text-xs text-slate-400 px-3 py-2 text-center">No matching items</p>
                ) : filtered.slice(0, 8).map(s => (
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Quantity <span className="text-red-400">*</span></label>
          <input
            type="number" min="0.01" step="0.01"
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
  const navigate = useNavigate();
  const { employee } = useEmployeeAuth();
  const canCreate = hasPerm(employee, 'create_requisition');
  const canApprove = hasPerm(employee, 'approve_requisition');
  const canReceive = hasPerm(employee, 'receive_requisition');
  const [showCreate, setShowCreate] = useState(false);
  const [requisitions, setRequisitions] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const [description, setDescription] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [stocks, setStocks] = useState([]);

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
      const data = await requisitionService.getAll({ status: statusFilter || undefined, page, limit: 10 });
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

  useEffect(() => {
    stockService.getAll({ limit: 200 }).then(d => setStocks(d.stocks || [])).catch(() => {});
  }, []);

  useSocketEvent('requisition-updated', () => load());
  useSocketEvent('requisition-deleted', () => load());

  const handleSubmit = async (e) => {
    e.preventDefault();
    for (const [i, item] of items.entries()) {
      if (!item.itemName.trim()) { showToast(`Item ${i + 1}: name is required`, 'error'); return; }
      if (!item.quantity || parseFloat(item.quantity) <= 0) { showToast(`Item ${i + 1}: quantity must be > 0`, 'error'); return; }
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
      setShowCreate(false);
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

  const counts = Object.keys(STATUS_CONFIG).reduce((acc, key) => {
    acc[key] = requisitions.filter(r => r.status === key).length;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-5">
      <Toast toast={toast} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">My Requisitions</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} total requests</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow transition-all ${showCreate ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-primary text-white hover:opacity-90'}`}
          >
            {showCreate ? <><X size={15} /> Cancel</> : <><Plus size={15} /> New Request</>}
          </button>
        )}
      </div>

      {/* Create Form */}
      {showCreate && canCreate && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-800">New Requisition Request</h2>
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Items Requested</p>
              <button type="button" onClick={() => setItems(prev => [...prev, emptyItem()])}
                className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                <Plus size={13} /> Add Item
              </button>
            </div>
            {items.map((item, i) => (
              <ItemRow
                key={i} item={item} index={i} stocks={stocks}
                onUpdate={(idx, updated) => setItems(prev => prev.map((it, j) => j === idx ? updated : it))}
                onRemove={(idx) => setItems(prev => prev.filter((_, j) => j !== idx))}
              />
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)}
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => { setStatusFilter(statusFilter === key ? '' : key); setPage(1); }}
              className={`p-4 rounded-xl border text-left transition-all ${statusFilter === key ? 'border-primary bg-primary/5 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={15} className={statusFilter === key ? 'text-primary' : 'text-slate-400'} />
                <span className="text-xs font-semibold text-slate-500 leading-tight">{cfg.label}</span>
              </div>
              <p className="text-2xl font-extrabold text-slate-800">{counts[key] ?? 0}</p>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-slate-600 hidden sm:table-cell">Description</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Items</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600 hidden md:table-cell">Date</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400">Loading...</td></tr>
            ) : requisitions.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16">
                  <FileText size={40} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-slate-400 font-medium">No requisitions found</p>
                  <p className="text-sm text-slate-300 mt-1">Click "New Request" to submit one.</p>
                </td>
              </tr>
            ) : requisitions.map(req => (
              <tr key={req.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-4 hidden sm:table-cell">
                  <p className="text-slate-700 text-sm font-medium max-w-xs truncate">
                    {req.description || <span className="text-slate-300 italic font-normal">No description</span>}
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">#{req.id.slice(-8).toUpperCase()}</p>
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
                    <Package size={13} className="text-slate-400" />
                    {req._count?.items ?? req.items?.length ?? 0}
                  </span>
                </td>
                <td className="px-5 py-4"><StatusBadge status={req.status} /></td>
                <td className="px-5 py-4 hidden md:table-cell text-xs text-slate-400">
                  {new Date(req.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => navigate(`/requisitions/${req.id}`)}
                      className="p-1.5 rounded-lg hover:bg-primary/10 text-primary" title="View details">
                      <Eye size={14} />
                    </button>
                    {req.status === 'PENDING' && canApprove && (
                      <button
                        onClick={() => navigate(`/requisitions/approve/${req.id}`)}
                        className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Approve">
                        <CheckCircle size={14} />
                      </button>
                    )}
                    {(req.status === 'APPROVED' || req.status === 'PARTIALLY_RECEIVED') && canReceive && (
                      <button
                        onClick={() => navigate(`/requisitions/receive/${req.id}`)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Receive Items">
                        <Truck size={14} />
                      </button>
                    )}
                    {req.status === 'PENDING' && req.employeeId === employee?.id && (
                      <button
                        onClick={() => setDeleteTarget(req)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {page} of {totalPages} · {total} total</p>
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
