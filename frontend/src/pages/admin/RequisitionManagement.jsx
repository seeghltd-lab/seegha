import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Eye, CheckCircle, XCircle, Package, ChevronLeft, ChevronRight,
  Clock, CheckCheck, AlertCircle, Filter, User, Trash2, X, FileText,
} from 'lucide-react';
import requisitionService from '../../services/requisitionService';
import { useSocketEvent } from '../../context/SocketContext';

const PAGE_SIZE = 10;

const STATUS_CONFIG = {
  PENDING:   { label: 'Pending',   color: 'bg-amber-100 text-amber-700',    icon: Clock },
  APPROVED:  { label: 'Approved',  color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  REJECTED:  { label: 'Rejected',  color: 'bg-red-100 text-red-600',         icon: XCircle },
  COMPLETED: { label: 'Completed', color: 'bg-blue-100 text-blue-700',        icon: CheckCheck },
};

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
    <div className={`fixed top-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white transition-all ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
      {toast.msg}
    </div>
  );
}

export default function RequisitionManagement() {
  const [requisitions, setRequisitions] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);  // detail modal
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionTarget, setActionTarget] = useState(null); // { req, action: 'APPROVED'|'REJECTED'|'COMPLETED'|'DELETE' }
  const [notes, setNotes] = useState('');
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await requisitionService.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setRequisitions(data.requisitions);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      showToast('Failed to load requisitions', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  // Real-time updates
  useSocketEvent('requisition-created', () => load());
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

  const handleAction = async () => {
    if (!actionTarget) return;
    setActing(true);
    try {
      if (actionTarget.action === 'DELETE') {
        await requisitionService.remove(actionTarget.req.id);
        showToast('Requisition deleted');
      } else {
        await requisitionService.updateStatus(actionTarget.req.id, actionTarget.action, notes || undefined);
        showToast(`Requisition ${actionTarget.action.toLowerCase()}`);
      }
      setActionTarget(null);
      setNotes('');
      load();
      // Close detail modal if it was for this requisition
      if (selected?.id === actionTarget.req.id) setSelected(null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed', 'error');
    } finally {
      setActing(false);
    }
  };

  const counts = {
    PENDING: requisitions.filter(r => r.status === 'PENDING').length,
    APPROVED: requisitions.filter(r => r.status === 'APPROVED').length,
    REJECTED: requisitions.filter(r => r.status === 'REJECTED').length,
    COMPLETED: requisitions.filter(r => r.status === 'COMPLETED').length,
  };

  const actionConfig = {
    APPROVED:  { label: 'Approve',  btnClass: 'bg-emerald-500 hover:bg-emerald-600', msg: 'Approve this requisition? Stock items will be deducted.' },
    REJECTED:  { label: 'Reject',   btnClass: 'bg-red-500 hover:bg-red-600',         msg: 'Reject this requisition?' },
    COMPLETED: { label: 'Complete', btnClass: 'bg-blue-500 hover:bg-blue-600',        msg: 'Mark this requisition as completed?' },
    DELETE:    { label: 'Delete',   btnClass: 'bg-red-500 hover:bg-red-600',          msg: 'Permanently delete this requisition?' },
  };

  return (
    <div className="p-6 space-y-5">
      <Toast toast={toast} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Requisitions</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} total requests</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => { setStatusFilter(statusFilter === key ? '' : key); setPage(1); }}
              className={`p-4 rounded-xl border text-left transition-all ${statusFilter === key ? 'border-primary bg-primary/5 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} className={statusFilter === key ? 'text-primary' : 'text-slate-400'} />
                <span className="text-xs font-semibold text-slate-500">{cfg.label}</span>
              </div>
              <p className="text-2xl font-extrabold text-slate-800">{counts[key] ?? 0}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by employee name or description..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Employee</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600 hidden sm:table-cell">Description</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Items</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600 hidden md:table-cell">Date</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400">Loading...</td></tr>
            ) : requisitions.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16">
                  <FileText size={40} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-slate-400 font-medium">No requisitions found</p>
                </td>
              </tr>
            ) : requisitions.map(req => (
              <tr key={req.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {req.employee?.firstName?.charAt(0)?.toUpperCase() ?? 'E'}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">
                        {req.employee?.firstName} {req.employee?.lastName}
                      </p>
                      <p className="text-xs text-slate-400">{req.employee?.position || req.employee?.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 hidden sm:table-cell">
                  <p className="text-slate-600 text-sm max-w-xs truncate">{req.description || <span className="text-slate-300 italic">No description</span>}</p>
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
                    <Package size={13} className="text-slate-400" />
                    {req._count?.items ?? 0}
                  </span>
                </td>
                <td className="px-5 py-4"><StatusBadge status={req.status} /></td>
                <td className="px-5 py-4 hidden md:table-cell text-xs text-slate-400">
                  {new Date(req.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openDetail(req)}
                      className="p-1.5 rounded-lg hover:bg-primary/10 text-primary" title="View details">
                      <Eye size={14} />
                    </button>
                    {req.status === 'PENDING' && (
                      <>
                        <button onClick={() => setActionTarget({ req, action: 'APPROVED' })}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Approve">
                          <CheckCircle size={14} />
                        </button>
                        <button onClick={() => setActionTarget({ req, action: 'REJECTED' })}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Reject">
                          <XCircle size={14} />
                        </button>
                      </>
                    )}
                    {req.status === 'APPROVED' && (
                      <button onClick={() => setActionTarget({ req, action: 'COMPLETED' })}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Mark Complete">
                        <CheckCheck size={14} />
                      </button>
                    )}
                    <button onClick={() => setActionTarget({ req, action: 'DELETE' })}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Delete">
                      <Trash2 size={14} />
                    </button>
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

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Requisition Details</h2>
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
                  {/* Employee Info */}
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                      <User size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {selected.employee?.firstName} {selected.employee?.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{selected.employee?.position} · {selected.employee?.email}</p>
                    </div>
                    <div className="ml-auto"><StatusBadge status={selected.status} /></div>
                  </div>

                  {/* Description */}
                  {selected.description && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-xs font-semibold text-amber-700 mb-1">Description</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{selected.description}</p>
                    </div>
                  )}

                  {/* Items */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Items ({selected.items?.length ?? 0})
                    </p>
                    <div className="space-y-2">
                      {selected.items?.map((item, i) => (
                        <div key={item.id ?? i} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 text-sm">{item.itemName}</p>
                            {item.stock && (
                              <p className="text-xs text-slate-400 font-mono">SKU: {item.stock.sku}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                              <span>Qty: <strong className="text-slate-700">{item.quantity}</strong></span>
                              <span>Unit: <strong className="text-slate-700">{item.unit}</strong></span>
                              {item.stock && (
                                <span className={`font-semibold ${item.stock.quantity < item.quantity ? 'text-red-500' : 'text-emerald-600'}`}>
                                  In stock: {item.stock.quantity}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">
                    Submitted: {new Date(selected.createdAt).toLocaleString()}
                  </p>
                </>
              )}
            </div>

            {/* Modal Actions */}
            {!detailLoading && (
              <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap gap-2">
                {selected.status === 'PENDING' && (
                  <>
                    <button onClick={() => { setActionTarget({ req: selected, action: 'APPROVED' }); setSelected(null); }}
                      className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600">
                      Approve
                    </button>
                    <button onClick={() => { setActionTarget({ req: selected, action: 'REJECTED' }); setSelected(null); }}
                      className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600">
                      Reject
                    </button>
                  </>
                )}
                {selected.status === 'APPROVED' && (
                  <button onClick={() => { setActionTarget({ req: selected, action: 'COMPLETED' }); setSelected(null); }}
                    className="flex-1 py-2 rounded-xl bg-blue-500 text-white text-sm font-bold hover:bg-blue-600">
                    Mark Complete
                  </button>
                )}
                <button onClick={() => setSelected(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Confirm Modal */}
      {actionTarget && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-1">
              {actionConfig[actionTarget.action]?.label} Requisition
            </h2>
            <p className="text-sm text-slate-500 mb-4">{actionConfig[actionTarget.action]?.msg}</p>

            {(actionTarget.action === 'APPROVED' || actionTarget.action === 'REJECTED') && (
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add a note (optional)..."
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4"
              />
            )}

            <div className="flex gap-3">
              <button onClick={() => { setActionTarget(null); setNotes(''); }}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleAction} disabled={acting}
                className={`flex-1 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-60 ${actionConfig[actionTarget.action]?.btnClass}`}>
                {acting ? 'Processing...' : actionConfig[actionTarget.action]?.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
