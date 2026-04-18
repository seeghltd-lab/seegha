import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Package, Clock, CheckCircle, XCircle, CheckCheck,
  Truck, AlertCircle, History, Calendar, FileText,
} from 'lucide-react';
import requisitionService from '../../services/requisitionService';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';

const hasPerm = (employee, name) =>
  employee?.permissions?.some(p => p.permission.name === name) ?? false;

const STATUS_CONFIG = {
  PENDING:            { label: 'Pending',            color: 'bg-amber-100 text-amber-700',     icon: Clock },
  APPROVED:           { label: 'Approved',           color: 'bg-blue-100 text-blue-700',       icon: CheckCircle },
  PARTIALLY_RECEIVED: { label: 'Partially Received', color: 'bg-orange-100 text-orange-700',   icon: Truck },
  FULLY_RECEIVED:     { label: 'Fully Received',     color: 'bg-emerald-100 text-emerald-700', icon: CheckCheck },
  REJECTED:           { label: 'Rejected',           color: 'bg-red-100 text-red-600',          icon: XCircle },
};

const RECEIVING_BADGE = {
  NOT_RECEIVED:       { label: 'Not Received',       cls: 'bg-slate-100 text-slate-500' },
  PARTIALLY_RECEIVED: { label: 'Partially Received', cls: 'bg-amber-100 text-amber-700' },
  FULLY_RECEIVED:     { label: 'Fully Received',     cls: 'bg-emerald-100 text-emerald-700' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
      <Icon size={12} /> {cfg.label}
    </span>
  );
}

function ProgressBar({ received, total }) {
  const pct = total > 0 ? Math.min(100, (received / total) * 100) : 0;
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{received} / {total} received</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function EmployeeRequisitionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { employee } = useEmployeeAuth();
  const canApprove = hasPerm(employee, 'approve_requisition');
  const canReceive = hasPerm(employee, 'receive_requisition');
  const [requisition, setRequisition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { showToast('Rejection reason required', 'error'); return; }
    setActing(true);
    try {
      await requisitionService.reject(id, rejectReason);
      showToast('Requisition rejected');
      setRejectModal(false);
      setRejectReason('');
      const data = await requisitionService.getOne(id);
      setRequisition(data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject', 'error');
    } finally {
      setActing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    requisitionService.getOne(id)
      .then(data => setRequisition(data))
      .catch(() => setError('Failed to load requisition.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !requisition) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="mx-auto text-red-400 mb-3" size={40} />
        <p className="text-slate-700 font-semibold">{error || 'Requisition not found'}</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {toast.msg}
        </div>
      )}

      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors">
        <ArrowLeft size={15} /> Back to My Requisitions
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">Request Details</h1>
            <p className="text-xs font-mono text-slate-400 mt-0.5">#{requisition.id.slice(-8).toUpperCase()}</p>
          </div>
          <StatusBadge status={requisition.status} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-5 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Calendar size={11} /> Submitted</p>
            <p className="text-sm text-slate-600">
              {new Date(requisition.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <p className="text-xs text-slate-400">{new Date(requisition.createdAt).toLocaleTimeString()}</p>
          </div>
          {requisition.approvedAt && (
            <div>
              <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><CheckCircle size={11} /> Approved</p>
              <p className="text-sm text-slate-600">
                {new Date(requisition.approvedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          )}
          {requisition.completedAt && (
            <div>
              <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><CheckCheck size={11} /> Completed</p>
              <p className="text-sm text-slate-600">
                {new Date(requisition.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Rejection reason */}
      {requisition.rejectReason && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
          <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 text-sm mb-1">Rejection Reason</p>
            <p className="text-sm text-red-600">{requisition.rejectReason}</p>
          </div>
        </div>
      )}

      {/* Description */}
      {requisition.description && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
            <FileText size={12} /> Description
          </p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{requisition.description}</p>
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Package size={16} className="text-slate-400" />
          <h2 className="font-bold text-slate-800">Items ({requisition.items?.length ?? 0})</h2>
        </div>
        <div className="p-5 space-y-4">
          {requisition.items?.map((item, i) => {
            const badge = RECEIVING_BADGE[item.receivingStatus] || RECEIVING_BADGE.NOT_RECEIVED;
            return (
              <div key={item.id} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{item.itemName}</p>
                      {item.stock && (
                        <p className="text-xs text-slate-400 font-mono">SKU: {item.stock.sku}</p>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    <p className="text-slate-400 mb-0.5">Requested</p>
                    <p className="font-bold text-slate-700">{item.quantity} {item.unit}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    <p className="text-slate-400 mb-0.5">Received</p>
                    <p className={`font-bold ${item.receivedQty > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {item.receivedQty} {item.unit}
                    </p>
                  </div>
                </div>

                {item.receivedQty > 0 && (
                  <ProgressBar received={item.receivedQty} total={item.quantity} />
                )}

                {item.note && (
                  <p className="text-xs text-slate-400 italic mt-2">Note: {item.note}</p>
                )}

                {item.receivingLogs?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1">
                      <History size={11} /> Delivery History
                    </p>
                    <div className="space-y-1.5">
                      {item.receivingLogs.map((log) => (
                        <div key={log.id} className="flex flex-wrap items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-1.5">
                          <span className="font-semibold text-slate-700">{log.receivedQty} {item.unit}</span>
                          <span className="text-slate-300">·</span>
                          <span>{new Date(log.receivedAt).toLocaleString()}</span>
                          {log.note && (
                            <span className="italic text-slate-400">"{log.note}"</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Permission-based actions */}
      {(canApprove || canReceive) && (requisition.status === 'PENDING' || requisition.status === 'APPROVED' || requisition.status === 'PARTIALLY_RECEIVED') && (
        <div className="flex flex-wrap gap-3">
          {requisition.status === 'PENDING' && canApprove && (
            <>
              <button
                onClick={() => navigate(`/requisitions/approve/${id}`)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors">
                <CheckCircle size={15} /> Approve
              </button>
              <button
                onClick={() => setRejectModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
                <XCircle size={15} /> Reject
              </button>
            </>
          )}
          {(requisition.status === 'APPROVED' || requisition.status === 'PARTIALLY_RECEIVED') && canReceive && (
            <button
              onClick={() => navigate(`/requisitions/receive/${id}`)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">
              <Truck size={15} /> Receive Items
            </button>
          )}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Reject Requisition</h2>
            <p className="text-sm text-slate-500 mb-4">Provide a reason for rejection.</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(false); setRejectReason(''); }}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={handleReject} disabled={acting}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-60">
                {acting ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
