import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft, AlertCircle, CheckCircle, Package, RefreshCw,
  List, LayoutGrid, ClipboardList,
} from 'lucide-react';
import purchaseOrderService from '../../../services/purchaseOrderService';
import { useViewMode } from '../../../hooks/useViewMode';

const fmt = (n) =>
  new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0 }).format(n ?? 0);

const RECV_BADGE = {
  NOT_RECEIVED: 'stoq-badge',
  PARTIALLY_RECEIVED: 'stoq-badge stoq-badge--warning',
  FULLY_RECEIVED: 'stoq-badge stoq-badge--success',
};
const RECV_LABEL = { NOT_RECEIVED: 'Not Received', PARTIALLY_RECEIVED: 'Partial', FULLY_RECEIVED: 'Received' };

function ProgressBar({ received, total }) {
  const pct = total > 0 ? Math.min(100, (received / total) * 100) : 0;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--fg-subtle)', marginBottom: 4 }}>
        <span>{Number(received).toFixed(2)} / {Number(total).toFixed(2)} received</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="progress-bar" style={{ height: 6 }}>
        <span style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--success)' : 'var(--accent)' }} />
      </div>
    </div>
  );
}

export default function ReceivePurchaseOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useOutletContext() ?? {};

  const [po, setPo] = useState(null);
  const [receiveInputs, setReceiveInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState(null);
  const [itemView, setItemView] = useViewMode('po-receive-items', 'cards');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const backPath = po
    ? (role === 'employee'
      ? `/suppliers/${po.supplierId}?tab=purchase_orders`
      : `/admin/suppliers/${po.supplierId}?tab=purchase_orders`)
    : -1;

  const load = async () => {
    setLoading(true);
    try {
      const data = await purchaseOrderService.getOne(id);
      setPo(data);
      const inputs = {};
      (data.items || []).forEach((item) => {
        if (item.receivingStatus !== 'FULLY_RECEIVED') {
          const remaining = parseFloat(item.quantity) - parseFloat(item.receivedQty || 0);
          inputs[item.id] = { qty: '', note: '' };
        }
      });
      setReceiveInputs(inputs);
    } catch {
      showToast('Failed to load purchase order', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const updateInput = (itemId, field, value) =>
    setReceiveInputs((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));

  const setAll = () => {
    const updated = { ...receiveInputs };
    (po?.items || []).forEach((item) => {
      if (item.receivingStatus !== 'FULLY_RECEIVED') {
        const remaining = parseFloat(item.quantity) - parseFloat(item.receivedQty || 0);
        updated[item.id] = { ...updated[item.id], qty: String(Math.max(0, remaining)) };
      }
    });
    setReceiveInputs(updated);
  };

  const handleSubmit = async () => {
    const newErrors = {};
    const payload = [];

    for (const item of (po?.items || [])) {
      if (item.receivingStatus === 'FULLY_RECEIVED') continue;
      const input = receiveInputs[item.id];
      const qty = parseFloat(input?.qty);
      if (!input?.qty || isNaN(qty) || qty <= 0) continue; // skip items with no qty entered
      const remaining = parseFloat(item.quantity) - parseFloat(item.receivedQty || 0);
      if (qty > remaining + 0.0001) {
        newErrors[item.id] = `Cannot receive more than remaining qty (${remaining.toFixed(2)})`;
        continue;
      }
      payload.push({ itemId: item.id, receivedQty: qty, notes: input.note?.trim() || undefined });
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Fix errors before submitting', 'error');
      return;
    }
    if (payload.length === 0) {
      showToast('Enter a quantity for at least one item', 'error');
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await purchaseOrderService.receiveItems(id, payload);
      setSuccess(true);
      showToast('Items received successfully');
      setTimeout(() => navigate(backPath), 1200);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to receive items', 'error');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-muted)' }}>
        Loading purchase order…
      </div>
    );
  }

  if (!po) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>
        Purchase order not found.
      </div>
    );
  }

  const receivableItems = (po.items || []).filter((i) => i.receivingStatus !== 'FULLY_RECEIVED');
  const totalOrdered = (po.items || []).reduce((s, i) => s + parseFloat(i.quantity || 0), 0);
  const totalReceived = (po.items || []).reduce((s, i) => s + parseFloat(i.receivedQty || 0), 0);
  const overallPct = totalOrdered > 0 ? Math.min(100, (totalReceived / totalOrdered) * 100) : 0;

  const renderItemCard = (item) => {
    const input = receiveInputs[item.id];
    const received = parseFloat(item.receivedQty || 0);
    const ordered = parseFloat(item.quantity || 0);
    const remaining = Math.max(0, ordered - received);
    const isFullyReceived = item.receivingStatus === 'FULLY_RECEIVED';

    return (
      <div
        key={item.id}
        style={{
          border: `1px solid ${isFullyReceived ? 'var(--success)' : errors[item.id] ? 'var(--danger)' : 'var(--border)'}`,
          borderRadius: 'var(--r-md)',
          padding: 14,
          opacity: isFullyReceived ? 0.65 : 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{item.itemName}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', gap: 8 }}>
              {item.unit && <span>{item.unit}</span>}
              {item.unitCost && <span>@ {fmt(parseFloat(item.unitCost))}</span>}
              {item.category?.name && (
                <span style={{ background: 'var(--surface-raised)', padding: '1px 6px', borderRadius: 10 }}>
                  {item.category.name}
                </span>
              )}
              {item.stock?.sku && (
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-subtle)' }}>
                  {item.stock.sku}
                </span>
              )}
            </div>
          </div>
          <span className={RECV_BADGE[item.receivingStatus]}>
            {RECV_LABEL[item.receivingStatus]}
          </span>
        </div>

        <ProgressBar received={received} total={ordered} />

        {!isFullyReceived && (
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="stoq-field" style={{ margin: 0 }}>
              <label className="stoq-field__label">
                Qty to Receive (max {remaining.toFixed(2)}) <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="number"
                  min="0"
                  max={remaining}
                  step="any"
                  className="stoq-input"
                  placeholder="0"
                  value={input?.qty || ''}
                  onChange={(e) => updateInput(item.id, 'qty', e.target.value)}
                  style={errors[item.id] ? { borderColor: 'var(--danger)' } : {}}
                />
                <button
                  type="button"
                  className="stoq-btn stoq-btn--sm"
                  style={{ whiteSpace: 'nowrap' }}
                  onClick={() => updateInput(item.id, 'qty', String(remaining))}
                >
                  All
                </button>
              </div>
              {errors[item.id] && (
                <span style={{ fontSize: 11, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <AlertCircle size={11} /> {errors[item.id]}
                </span>
              )}
            </div>
            <div className="stoq-field" style={{ margin: 0 }}>
              <label className="stoq-field__label">Note</label>
              <input
                className="stoq-input"
                placeholder="Optional note…"
                value={input?.note || ''}
                onChange={(e) => updateInput(item.id, 'note', e.target.value)}
              />
            </div>
          </div>
        )}

        {item.paymentType && item.paymentType !== 'NONE' && !isFullyReceived && (
          <div style={{ marginTop: 8, fontSize: 11, padding: '4px 8px', borderRadius: 6, display: 'inline-block',
            background: item.paymentType === 'CREDIT' ? 'color-mix(in oklch,var(--success) 10%,transparent)' : 'color-mix(in oklch,var(--accent) 10%,transparent)',
            color: item.paymentType === 'CREDIT' ? 'var(--success)' : 'var(--accent)' }}>
            Will auto-create {item.paymentType} payment on receive
          </div>
        )}
      </div>
    );
  };

  const renderItemTableRow = (item) => {
    const input = receiveInputs[item.id];
    const received = parseFloat(item.receivedQty || 0);
    const ordered = parseFloat(item.quantity || 0);
    const remaining = Math.max(0, ordered - received);
    const isFullyReceived = item.receivingStatus === 'FULLY_RECEIVED';

    return (
      <tr key={item.id} style={{ opacity: isFullyReceived ? 0.6 : 1 }}>
        <td style={{ fontWeight: 600, fontSize: 12 }}>{item.itemName}</td>
        <td style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{item.unit || '—'}</td>
        <td className="num-cell">{ordered.toFixed(2)}</td>
        <td className="num-cell">{received.toFixed(2)}</td>
        <td className="num-cell" style={{ color: remaining > 0 ? 'var(--accent)' : 'var(--success)' }}>
          {remaining.toFixed(2)}
        </td>
        <td style={{ width: 130 }}>
          {!isFullyReceived ? (
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                type="number" min="0" max={remaining} step="any"
                className="stoq-input" placeholder="0"
                value={input?.qty || ''}
                onChange={(e) => updateInput(item.id, 'qty', e.target.value)}
                style={{ height: 28, fontSize: 11, ...(errors[item.id] ? { borderColor: 'var(--danger)' } : {}) }}
              />
              <button type="button" className="stoq-btn stoq-btn--sm"
                style={{ whiteSpace: 'nowrap', fontSize: 10 }}
                onClick={() => updateInput(item.id, 'qty', String(remaining))}>
                All
              </button>
            </div>
          ) : null}
        </td>
        <td>
          <span className={RECV_BADGE[item.receivingStatus]}>{RECV_LABEL[item.receivingStatus]}</span>
        </td>
        <td style={{ fontSize: 11 }}>
          {item.paymentType && item.paymentType !== 'NONE' ? (
            <span style={{ fontWeight: 600,
              color: item.paymentType === 'CREDIT' ? 'var(--success)' : 'var(--accent)' }}>
              {item.paymentType}
            </span>
          ) : '—'}
        </td>
      </tr>
    );
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
          <button className="icon-btn" onClick={() => navigate(backPath)}><ArrowLeft size={14} /></button>
          <div>
            <h1>Receive Items</h1>
            <div className="page-head__sub">
              {po.reference} · {po.supplier?.name ?? 'Unknown Supplier'} · {po.site?.name ?? 'No site'}
            </div>
          </div>
        </div>
        <div className="page-head__actions">
          <div className="stoq-segment">
            <button type="button" data-active={itemView === 'cards' ? 'true' : undefined} onClick={() => setItemView('cards')} title="Cards"><LayoutGrid size={13} /></button>
            <button type="button" data-active={itemView === 'table' ? 'true' : undefined} onClick={() => setItemView('table')} title="Table"><List size={13} /></button>
          </div>
          <button className="stoq-btn" onClick={setAll}>Set All Remaining</button>
          <button className="stoq-btn" onClick={() => navigate(backPath)}>Cancel</button>
          <button
            className="stoq-btn stoq-btn--primary"
            disabled={submitting || success}
            onClick={handleSubmit}
            style={{ opacity: submitting || success ? 0.6 : 1 }}
          >
            {submitting
              ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Receiving…</>
              : success
                ? <><CheckCircle size={12} /> Done</>
                : <><ClipboardList size={13} /> Confirm Receipt</>}
          </button>
        </div>
      </div>

      {/* Overall progress */}
      <div className="stoq-panel" style={{ padding: '12px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Overall Progress</span>
          <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
            {totalReceived.toFixed(2)} / {totalOrdered.toFixed(2)} units
          </span>
        </div>
        <div className="progress-bar" style={{ height: 8 }}>
          <span style={{ width: `${overallPct}%`, background: overallPct >= 100 ? 'var(--success)' : 'var(--accent)' }} />
        </div>
      </div>

      {/* Items */}
      {itemView === 'cards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(po.items || []).map(renderItemCard)}
        </div>
      )}

      {itemView === 'table' && (
        <div className="stoq-panel">
          <div className="table-wrap">
            <table className="stoq-tbl">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Unit</th>
                  <th>Ordered</th>
                  <th>Received</th>
                  <th>Remaining</th>
                  <th>Qty to Receive</th>
                  <th>Status</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {(po.items || []).map(renderItemTableRow)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {receivableItems.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>
          <CheckCircle size={32} style={{ display: 'block', margin: '0 auto 10px' }} />
          All items have been fully received.
        </div>
      )}
    </div>
  );
}
