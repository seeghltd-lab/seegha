import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Package, Clock, CheckCircle, XCircle, CheckCheck,
  Truck, AlertCircle, History, Calendar, FileText, RefreshCw, X,
  Hash, Activity, List, LayoutGrid,
} from 'lucide-react';
import requisitionService from '../../services/requisitionService';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import Sparkline, { genSpark } from '../../components/Sparkline';
import { SupplierReceiptModal, buildRequisitionReceipt } from '../../components/ReceiptModal';

const hasPerm = (employee, ...names) =>
  names.some(name => employee?.permissions?.some(p => p.permission.name === name));

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtTime = d => d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const STATUS_CFG = {
  PENDING:            { label: 'Pending',            cls: 'stoq-badge stoq-badge--warning',  icon: Clock },
  APPROVED:           { label: 'Approved',           cls: 'stoq-badge stoq-badge--accent',   icon: CheckCircle },
  PARTIALLY_RECEIVED: { label: 'Partially Received', cls: 'stoq-badge stoq-badge--warning',  icon: Truck },
  FULLY_RECEIVED:     { label: 'Fully Received',     cls: 'stoq-badge stoq-badge--success',  icon: CheckCheck },
  REJECTED:           { label: 'Rejected',           cls: 'stoq-badge stoq-badge--danger',   icon: XCircle },
};

const RECV_CFG = {
  NOT_RECEIVED:       { label: 'Not received', cls: 'stoq-badge' },
  PARTIALLY_RECEIVED: { label: 'Partial',      cls: 'stoq-badge stoq-badge--warning' },
  FULLY_RECEIVED:     { label: 'Received',     cls: 'stoq-badge stoq-badge--success' },
};

const TABS = [
  { key: 'overview', label: 'Overview',  icon: FileText },
  { key: 'items',    label: 'Items',     icon: Package },
  { key: 'timeline', label: 'Timeline',  icon: Activity },
];

export default function EmployeeRequisitionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { employee } = useEmployeeAuth();
  const canApprove = hasPerm(employee, 'approve_requisition');
  const canReceive = hasPerm(employee, 'receive_requisition');

  const [requisition, setRequisition] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [tab, setTab]                 = useState('overview');
  const [itemsView, setItemsView]     = useState('table');
  const [receipt, setReceipt]         = useState(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing]           = useState(false);
  const [toast, setToast]             = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };

  const load = async () => {
    setLoading(true);
    try { setRequisition(await requisitionService.getOne(id)); }
    catch { setError('Failed to load requisition.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleReject = async () => {
    if (!rejectReason.trim()) { showToast('Rejection reason required', 'error'); return; }
    setActing(true);
    try {
      await requisitionService.reject(id, rejectReason);
      showToast('Requisition rejected');
      setRejectModal(false);
      setRejectReason('');
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Failed to reject', 'error'); }
    finally { setActing(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--fg-subtle)' }}>
      <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error || !requisition) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 10, color: 'var(--fg-subtle)' }}>
      <AlertCircle size={28} style={{ color: 'var(--danger)' }} />
      <span style={{ fontSize: 12 }}>{error || 'Requisition not found'}</span>
      <button className="stoq-btn" onClick={() => navigate('/requisitions')}>Go Back</button>
    </div>
  );

  const items     = requisition.items ?? [];
  const totalRecv = items.reduce((s, i) => s + (i.receivedQty ?? 0), 0);
  const totalReqd = items.reduce((s, i) => s + (i.quantity ?? 0), 0);
  const statusCfg  = STATUS_CFG[requisition.status] || STATUS_CFG.PENDING;
  const StatusIcon = statusCfg.icon;

  const allLogs = items.flatMap(item =>
    (item.receivingLogs ?? []).map(log => ({ ...log, itemName: item.itemName, unit: item.unit }))
  ).sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

  return (
    <div>
      {receipt && <SupplierReceiptModal data={receipt} onClose={() => setReceipt(null)} />}
      {toast && (
        <div className={`stoq-toast ${toast.type === 'error' ? 'stoq-toast--error' : 'stoq-toast--success'}`}>
          {toast.type === 'error' ? <AlertCircle size={13} /> : <CheckCircle size={13} />}
          {toast.msg}
        </div>
      )}

      {/* Page head */}
      <div style={{ marginBottom: 18 }}>
        <button className="stoq-btn stoq-btn--ghost stoq-btn--sm" style={{ marginBottom: 12 }} onClick={() => navigate('/requisitions')}>
          <ArrowLeft size={12} /> My Requisitions
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              REQ-{requisition.id.slice(-8).toUpperCase()}
              <span className={statusCfg.cls}><StatusIcon size={10} /> {statusCfg.label}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 5, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={11} />{fmtDate(requisition.createdAt)}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Package size={11} />{items.length} items</span>
              {requisition.supplier && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Truck size={11} />{requisition.supplier.name}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="stoq-btn" onClick={() => setReceipt(buildRequisitionReceipt(requisition))}>
              <FileText size={13} /> Receipt
            </button>
            {requisition.status === 'PENDING' && canApprove && (
              <>
                <button className="stoq-btn" style={{ color: 'var(--danger)', borderColor: 'var(--danger-soft)' }} onClick={() => setRejectModal(true)}>
                  <XCircle size={13} /> Reject
                </button>
                <button className="stoq-btn stoq-btn--primary" onClick={() => navigate(`/requisitions/approve/${id}`)}>
                  <CheckCircle size={13} /> Approve
                </button>
              </>
            )}
            {(requisition.status === 'APPROVED' || requisition.status === 'PARTIALLY_RECEIVED') && canReceive && (
              <button className="stoq-btn stoq-btn--primary" onClick={() => navigate(`/requisitions/receive/${id}`)}>
                <Truck size={13} /> Receive Items
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Rejection banner */}
      {requisition.rejectReason && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: 'var(--danger-soft)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--danger)', marginBottom: 16, border: '1px solid oklch(0.60 0.20 25 / 0.15)' }}>
          <XCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <div><div style={{ fontWeight: 700, marginBottom: 2 }}>Rejection Reason</div>{requisition.rejectReason}</div>
        </div>
      )}

      {/* KPI row */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 'var(--gap-card)' }}>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><Package size={12} /></span>Items requested</div>
          <div className="kpi__value">{items.length}</div>
          <div className="kpi__foot"><span>line items</span></div>
          <Sparkline data={genSpark(1, 14, 0)} />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><Hash size={12} /></span>Total qty</div>
          <div className="kpi__value">{totalReqd}</div>
          <div className="kpi__foot"><span>units requested</span></div>
          <Sparkline data={genSpark(3, 14, 0)} />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><CheckCheck size={12} /></span>Received</div>
          <div className="kpi__value" style={{ color: totalRecv >= totalReqd && totalReqd > 0 ? 'var(--success)' : 'var(--fg)' }}>{totalRecv}</div>
          <div className="kpi__foot">
            <span>{totalReqd > 0 ? `${Math.round((totalRecv / totalReqd) * 100)}% fulfilled` : 'pending'}</span>
          </div>
          <Sparkline data={genSpark(5, 14, 0.3)} color="var(--success)" />
        </div>
      </div>

      {/* Tabs */}
      <div className="stoq-tabs" style={{ marginBottom: 16 }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const count = t.key === 'items' ? items.length : t.key === 'timeline' ? allLogs.length : null;
          return (
            <button key={t.key} className="stoq-tab" data-active={tab === t.key ? 'true' : undefined} onClick={() => setTab(t.key)}>
              <Icon size={13} /> {t.label}
              {count != null && <span style={{ fontSize: 10, color: 'var(--fg-subtle)', marginLeft: 2 }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 'var(--gap-card)', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-card)' }}>
            <div className="stoq-panel">
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="kpi__icon"><FileText size={12} /></span>Description
                </span>
              </div>
              <div style={{ padding: '14px 16px' }}>
                {requisition.description
                  ? <p style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.7, margin: 0 }}>{requisition.description}</p>
                  : <p style={{ fontSize: 12, color: 'var(--fg-subtle)', fontStyle: 'italic', margin: 0 }}>No description provided.</p>}
              </div>
            </div>

            {requisition.supplier && (
              <div className="stoq-panel">
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                  <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="kpi__icon"><Truck size={12} /></span>Supplier
                  </span>
                </div>
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: 'var(--accent-soft)', color: 'var(--accent-soft-fg)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Truck size={17} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{requisition.supplier.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-subtle)' }}>{requisition.supplier.code}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Items summary */}
            <div className="stoq-panel">
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="kpi__icon"><Package size={12} /></span>Items summary
                </span>
                <button className="stoq-btn stoq-btn--ghost stoq-btn--sm" onClick={() => setTab('items')}>
                  View all <Package size={11} />
                </button>
              </div>
              <div className="table-wrap">
                <table className="stoq-tbl">
                  <thead>
                    <tr>
                      <th className="no-sort">Item</th>
                      <th className="no-sort num-cell">Qty</th>
                      <th className="no-sort num-cell">Received</th>
                      <th className="no-sort">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        <td>
                          <span className="cell-stack__main">{item.itemName}</span>
                          {item.stock && <span className="cell-stack__sub">{item.stock.sku}</span>}
                        </td>
                        <td className="num-cell">{item.quantity} <span style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{item.unit}</span></td>
                        <td className="num-cell" style={{ color: item.receivedQty > 0 ? 'var(--success)' : 'var(--fg-subtle)' }}>
                          {item.receivedQty ?? 0}
                        </td>
                        <td>
                          <span className={(RECV_CFG[item.receivingStatus] || RECV_CFG.NOT_RECEIVED).cls}>
                            {(RECV_CFG[item.receivingStatus] || RECV_CFG.NOT_RECEIVED).label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right: meta details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-card)' }}>
            <div className="stoq-panel">
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <span className="stoq-panel__title">Details</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[
                  requisition.employee && { label: 'Employee', icon: User, value: `${requisition.employee.firstName ?? ''} ${requisition.employee.lastName ?? ''}`.trim() || '—', sub: requisition.employee.position },
                  { label: 'Submitted', icon: Calendar, value: fmtDate(requisition.createdAt) },
                  requisition.approvedAt && { label: 'Approved',  icon: CheckCircle, value: fmtDate(requisition.approvedAt) },
                  requisition.completedAt && { label: 'Completed', icon: CheckCheck,  value: fmtDate(requisition.completedAt) },
                  requisition.rejectReason && { label: 'Rejected', icon: XCircle, value: fmtDate(requisition.updatedAt), tone: 'danger' },
                ].filter(Boolean).map((row, i, arr) => (
                  <div key={i} style={{ padding: '10px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <row.icon size={11} style={{ color: row.tone === 'danger' ? 'var(--danger)' : undefined }} /> {row.label}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: row.tone === 'danger' ? 'var(--danger)' : 'var(--fg)' }}>{row.value}</div>
                    {row.sub && <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>{row.sub}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ITEMS TAB ── */}
      {tab === 'items' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{items.length} line items</span>
            <div className="stoq-segment">
              <button data-active={itemsView === 'table' ? 'true' : undefined} onClick={() => setItemsView('table')} title="Table"><List size={13} /></button>
              <button data-active={itemsView === 'cards' ? 'true' : undefined} onClick={() => setItemsView('cards')} title="Cards"><LayoutGrid size={13} /></button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="stoq-panel">
              <div className="stoq-empty"><div className="stoq-empty__icon"><Package size={28} /></div><div className="stoq-empty__title">No items</div></div>
            </div>
          ) : itemsView === 'table' ? (
            <div className="stoq-panel">
              <div className="table-wrap">
                <table className="stoq-tbl">
                  <thead>
                    <tr>
                      <th className="no-sort">#</th>
                      <th className="no-sort">Item</th>
                      <th className="no-sort num-cell">Requested</th>
                      <th className="no-sort num-cell">Received</th>
                      <th className="no-sort">Progress</th>
                      <th className="no-sort">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={item.id}>
                        <td style={{ color: 'var(--fg-subtle)', fontSize: 11, fontFamily: 'var(--font-mono)', width: 32 }}>{i + 1}</td>
                        <td>
                          <span className="cell-stack__main">{item.itemName}</span>
                          {item.stock && <span className="cell-stack__sub">{item.stock.sku}</span>}
                          {item.note && <span className="cell-stack__sub" style={{ fontStyle: 'italic' }}>"{item.note}"</span>}
                        </td>
                        <td className="num-cell">{item.quantity} <span style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{item.unit}</span></td>
                        <td className="num-cell" style={{ color: item.receivedQty > 0 ? 'var(--success)' : 'var(--fg-subtle)' }}>
                          {item.receivedQty ?? 0} <span style={{ fontSize: 10 }}>{item.unit}</span>
                        </td>
                        <td style={{ minWidth: 100 }}>
                          {item.quantity > 0 && (
                            <div>
                              <div style={{ height: 4, background: 'var(--bg-sunk)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(100, ((item.receivedQty ?? 0) / item.quantity) * 100)}%`, background: item.receivedQty >= item.quantity ? 'var(--success)' : 'var(--accent)', borderRadius: 2 }} />
                              </div>
                              <div style={{ fontSize: 9, color: 'var(--fg-subtle)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                                {Math.round(Math.min(100, ((item.receivedQty ?? 0) / item.quantity) * 100))}%
                              </div>
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={(RECV_CFG[item.receivingStatus] || RECV_CFG.NOT_RECEIVED).cls}>
                            {(RECV_CFG[item.receivingStatus] || RECV_CFG.NOT_RECEIVED).label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--gap-card)' }}>
              {items.map((item, i) => {
                const pct = item.quantity > 0 ? Math.min(100, ((item.receivedQty ?? 0) / item.quantity) * 100) : 0;
                const recvCfg = RECV_CFG[item.receivingStatus] || RECV_CFG.NOT_RECEIVED;
                return (
                  <div key={item.id} className="stoq-panel">
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 26, height: 26, borderRadius: 'var(--r-sm)', background: 'var(--accent-soft)', color: 'var(--accent-soft-fg)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{item.itemName}</div>
                            {item.stock && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-subtle)' }}>{item.stock.sku}</div>}
                          </div>
                        </div>
                        <span className={recvCfg.cls}>{recvCfg.label}</span>
                      </div>
                      <div className="detail-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 12 }}>
                        <div className="detail-cell">
                          <div className="detail-cell__label">Requested</div>
                          <div className="detail-cell__value">{item.quantity} <span style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{item.unit}</span></div>
                        </div>
                        <div className="detail-cell">
                          <div className="detail-cell__label">Received</div>
                          <div className="detail-cell__value" style={{ color: item.receivedQty > 0 ? 'var(--success)' : 'var(--fg-subtle)' }}>
                            {item.receivedQty ?? 0} <span style={{ fontSize: 10 }}>{item.unit}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div style={{ height: 5, background: 'var(--bg-sunk)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--success)' : 'var(--accent)', borderRadius: 3, transition: 'width 0.4s ease' }} />
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>{Math.round(pct)}% fulfilled</div>
                      </div>
                      {item.note && (
                        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--fg-subtle)', fontStyle: 'italic', padding: '5px 8px', background: 'var(--bg-sunk)', borderRadius: 'var(--r-xs)' }}>
                          "{item.note}"
                        </div>
                      )}
                      {item.receivingLogs?.length > 0 && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <History size={10} /> {item.receivingLogs.length} log{item.receivingLogs.length !== 1 ? 's' : ''}
                          </div>
                          {item.receivingLogs.slice(0, 2).map(log => (
                            <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--fg-muted)', padding: '4px 8px', background: 'var(--bg-sunk)', borderRadius: 'var(--r-xs)', marginBottom: 3 }}>
                              <CheckCircle size={10} style={{ color: 'var(--success)', flexShrink: 0 }} />
                              <span style={{ fontWeight: 600 }}>{log.receivedQty} {item.unit}</span>
                              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9 }}>{fmtTime(log.receivedAt)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TIMELINE TAB ── */}
      {tab === 'timeline' && (
        <div className="stoq-panel">
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="kpi__icon"><Activity size={12} /></span>Activity timeline
            </span>
            <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{allLogs.length} events</span>
          </div>

          {/* Status milestones */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 12 }}>Status milestones</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Submitted',  date: requisition.createdAt,   icon: FileText,    done: true },
                { label: 'Approved',   date: requisition.approvedAt,  icon: CheckCircle, done: !!requisition.approvedAt,  color: 'var(--success)' },
                { label: 'Receiving',  date: null,                    icon: Truck,       done: totalRecv > 0, color: 'var(--accent)' },
                { label: 'Completed',  date: requisition.completedAt, icon: CheckCheck,  done: !!requisition.completedAt, color: 'var(--success)' },
                requisition.rejectReason && { label: 'Rejected', date: requisition.updatedAt, icon: XCircle, done: true, color: 'var(--danger)' },
              ].filter(Boolean).map((step, i, arr) => {
                const Icon = step.icon;
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: step.done ? (step.color ? `${step.color}22` : 'var(--accent-soft)') : 'var(--bg-sunk)', border: `2px solid ${step.done ? (step.color || 'var(--accent)') : 'var(--border)'}`, color: step.done ? (step.color || 'var(--accent)') : 'var(--fg-subtle)', flexShrink: 0 }}>
                        <Icon size={12} />
                      </div>
                      {i < arr.length - 1 && <div style={{ width: 2, height: 24, background: step.done ? 'var(--border-strong)' : 'var(--border)', margin: '3px 0' }} />}
                    </div>
                    <div style={{ paddingTop: 4, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: step.done ? 'var(--fg)' : 'var(--fg-subtle)' }}>{step.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>{step.date ? fmtTime(step.date) : '—'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Receiving log events */}
          {allLogs.length > 0 ? (
            <div>
              <div style={{ padding: '10px 16px', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--fg-subtle)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Receiving events</div>
              {allLogs.map((log, i) => (
                <div key={log.id} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: i < allLogs.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'flex-start' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Truck size={13} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>
                      Received {log.receivedQty} {log.unit} of <span style={{ color: 'var(--accent-soft-fg)' }}>{log.itemName}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 3 }}>by {log.receivedByName ?? log.receivedById}</div>
                    {log.note && <div style={{ fontSize: 11, color: 'var(--fg-subtle)', fontStyle: 'italic', marginTop: 3 }}>"{log.note}"</div>}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-subtle)', whiteSpace: 'nowrap', marginTop: 2 }}>{fmtTime(log.receivedAt)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="stoq-empty" style={{ padding: '30px 20px' }}>
              <div style={{ fontSize: 12 }}>No receiving events yet</div>
            </div>
          )}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="stoq-modal-backdrop">
          <div className="stoq-modal" style={{ maxWidth: 440 }}>
            <div className="stoq-modal__head">
              <div>
                <div className="stoq-modal__title">Reject Requisition</div>
                <div className="stoq-modal__sub">Provide a reason for rejection</div>
              </div>
              <button className="stoq-btn stoq-btn--ghost stoq-btn--icon" onClick={() => { setRejectModal(false); setRejectReason(''); }}><X size={14} /></button>
            </div>
            <div className="stoq-modal__body">
              <textarea
                className="stoq-input"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Reason for rejection…"
                rows={3}
                style={{ height: 'auto', padding: '8px 10px', resize: 'none', width: '100%' }}
              />
            </div>
            <div className="stoq-modal__foot">
              <button className="stoq-btn" onClick={() => { setRejectModal(false); setRejectReason(''); }}>Cancel</button>
              <button className="stoq-btn stoq-btn--primary" disabled={acting} onClick={handleReject}
                style={{ background: 'var(--danger)', borderColor: 'transparent', opacity: acting ? 0.6 : 1 }}>
                {acting ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Rejecting…</> : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
