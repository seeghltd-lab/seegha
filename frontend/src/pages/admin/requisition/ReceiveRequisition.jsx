import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle, Package, Clock } from 'lucide-react';
import requisitionService from '../../../services/requisitionService';

const fmt = (n) =>
  new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0 }).format(n ?? 0);

const RECEIVING_BADGE = {
  NOT_RECEIVED:      { label: 'Not Received',       cls: 'bg-slate-100 text-slate-600' },
  PARTIALLY_RECEIVED:{ label: 'Partially Received',  cls: 'bg-amber-100 text-amber-700' },
  FULLY_RECEIVED:    { label: 'Fully Received',       cls: 'bg-emerald-100 text-emerald-700' },
};

function ProgressBar({ received, total }) {
  const pct = total > 0 ? Math.min(100, (received / total) * 100) : 0;
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{received} / {total} received</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ReceiveRequisition() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [requisition, setRequisition] = useState(null);
  const [receiveInputs, setReceiveInputs] = useState({});  // { itemId: { qty: '', note: '' } }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const req = await requisitionService.getOne(id);
      setRequisition(req);
      // Init inputs only for non-fully-received items
      const inputs = {};
      req.items.forEach((item) => {
        if (item.receivingStatus !== 'FULLY_RECEIVED') {
          inputs[item.id] = { qty: '', note: '' };
        }
      });
      setReceiveInputs(inputs);
    } catch {
      setErrors({ load: 'Failed to load requisition.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleInput = (itemId, field, value) => {
    setReceiveInputs((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const maxFor = (item) => item.quantity - item.receivedQty;

  const validate = () => {
    const errs = {};
    let anyFilled = false;
    Object.entries(receiveInputs).forEach(([itemId, inp]) => {
      if (inp.qty === '' || inp.qty === null) return;
      const qty = Number(inp.qty);
      if (isNaN(qty) || qty <= 0) {
        errs[itemId] = 'Must be a positive number';
        return;
      }
      const item = requisition.items.find((i) => i.id === itemId);
      if (item && qty > maxFor(item)) {
        errs[itemId] = `Max receivable: ${maxFor(item)}`;
        return;
      }
      anyFilled = true;
    });
    if (!anyFilled) errs.global = 'Enter at least one quantity to receive';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const items = Object.entries(receiveInputs)
        .filter(([, inp]) => inp.qty !== '' && Number(inp.qty) > 0)
        .map(([itemId, inp]) => ({
          itemId,
          receivedQty: Number(inp.qty),
          note: inp.note || undefined,
        }));

      const updated = await requisitionService.receiveItems(id, items);
      setRequisition(updated);
      setSuccess(true);

      // Re-init inputs from updated items
      const nextInputs = {};
      updated.items.forEach((item) => {
        if (item.receivingStatus !== 'FULLY_RECEIVED') {
          nextInputs[item.id] = { qty: '', note: '' };
        }
      });
      setReceiveInputs(nextInputs);

      if (updated.status === 'FULLY_RECEIVED') {
        setTimeout(() => navigate(-1), 1800);
      } else {
        setTimeout(() => setSuccess(false), 2500);
      }
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || err.message || 'Failed to record receiving' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (errors.load || !requisition) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="mx-auto text-red-400 mb-3" size={40} />
        <p className="text-slate-700 font-semibold">{errors.load || 'Requisition not found'}</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold">Go Back</button>
      </div>
    );
  }

  const pendingItems = requisition.items.filter((i) => i.receivingStatus !== 'FULLY_RECEIVED');
  const doneItems = requisition.items.filter((i) => i.receivingStatus === 'FULLY_RECEIVED');

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary transition-colors">
        <ArrowLeft size={15} /> Back to Requisitions
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">Receive Items</h1>
            <p className="text-xs font-mono text-slate-400 mt-0.5">#{requisition.id.slice(-8).toUpperCase()}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            requisition.status === 'FULLY_RECEIVED' ? 'bg-emerald-100 text-emerald-700' :
            requisition.status === 'PARTIALLY_RECEIVED' ? 'bg-amber-100 text-amber-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {requisition.status.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-sm">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Requested by</p>
            <p className="font-semibold text-slate-700">
              {requisition.employee?.firstName} {requisition.employee?.lastName}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Approved</p>
            <p className="text-slate-600 text-xs">
              {requisition.approvedAt ? new Date(requisition.approvedAt).toLocaleString() : '—'}
            </p>
          </div>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 font-semibold">
          <CheckCircle size={18} />
          {requisition.status === 'FULLY_RECEIVED' ? 'All items received! Redirecting...' : 'Receiving recorded successfully.'}
        </div>
      )}
      {errors.submit && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
          <AlertCircle size={18} /> {errors.submit}
        </div>
      )}
      {errors.global && (
        <p className="text-sm text-red-600">{errors.global}</p>
      )}

      {/* Pending items */}
      {pendingItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">Items to Receive ({pendingItems.length})</h2>
          </div>
          <div className="p-5 space-y-4">
            {pendingItems.map((item) => {
              const badge = RECEIVING_BADGE[item.receivingStatus] || RECEIVING_BADGE.NOT_RECEIVED;
              const inp = receiveInputs[item.id] || { qty: '', note: '' };
              const remaining = maxFor(item);
              return (
                <div key={item.id} className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-primary flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{item.itemName}</p>
                        {item.stock && <p className="text-xs text-slate-400 font-mono">{item.stock.sku}</p>}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badge.cls}`}>{badge.label}</span>
                  </div>

                  <ProgressBar received={item.receivedQty} total={item.quantity} />

                  {item.costPrice && (
                    <p className="text-xs text-slate-500">Cost price: <strong>{fmt(item.costPrice)}</strong> per {item.unit}</p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Receive Qty <span className="text-slate-400 font-normal">(max: {remaining} {item.unit})</span>
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        max={remaining}
                        value={inp.qty}
                        onChange={(e) => handleInput(item.id, 'qty', e.target.value)}
                        placeholder={`0 – ${remaining}`}
                        className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors[item.id] ? 'border-red-300' : 'border-slate-200'}`}
                      />
                      {errors[item.id] && <p className="text-xs text-red-500 mt-1">{errors[item.id]}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Note (optional)</label>
                      <input
                        type="text"
                        value={inp.note}
                        onChange={(e) => handleInput(item.id, 'note', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-5 pb-5 flex gap-3 border-t border-slate-100 pt-4">
            <button onClick={() => navigate(-1)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold disabled:opacity-60 transition-colors">
              {submitting ? 'Recording...' : 'Record Receiving'}
            </button>
          </div>
        </div>
      )}

      {/* Fully received items */}
      {doneItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-500" />
            <h2 className="font-bold text-slate-800">Fully Received ({doneItems.length})</h2>
          </div>
          <div className="p-5 space-y-3">
            {doneItems.map((item) => (
              <div key={item.id} className="border border-emerald-100 bg-emerald-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500" />
                    <p className="font-semibold text-slate-700 text-sm">{item.itemName}</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Fully Received</span>
                </div>
                <ProgressBar received={item.receivedQty} total={item.quantity} />

                {/* Receiving history */}
                {item.receivingLogs?.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-semibold text-slate-500">Receiving history</p>
                    {item.receivingLogs.map((log) => (
                      <div key={log.id} className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock size={10} className="flex-shrink-0" />
                        <span>{log.receivedQty} {item.unit} by {log.receivedByName ?? log.receivedById}</span>
                        <span className="text-slate-300">·</span>
                        <span>{new Date(log.receivedAt).toLocaleString()}</span>
                        {log.note && <span className="text-slate-400 italic">"{log.note}"</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
