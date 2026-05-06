import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import { useSocketEvent } from '../../context/SocketContext';
import dashboardService from '../../services/dashboardService';
import {
  ShieldCheck, ClipboardList, Plus, Clock, CheckCircle,
  Truck, CheckCheck, XCircle, RefreshCw, FileText,
} from 'lucide-react';

const hasPerm = (employee, name) =>
  employee?.permissions?.some(p => p.permission.name === name) ?? false;

const STATUS_CONFIG = {
  PENDING:            { label: 'Pending',            cls: 'stoq-badge', icon: Clock },
  APPROVED:           { label: 'Approved',           cls: 'stoq-badge stoq-badge--accent', icon: CheckCircle },
  PARTIALLY_RECEIVED: { label: 'Partly Received',    cls: 'stoq-badge stoq-badge--warning', icon: Truck },
  FULLY_RECEIVED:     { label: 'Fully Received',     cls: 'stoq-badge stoq-badge--success', icon: CheckCheck },
  REJECTED:           { label: 'Rejected',           cls: 'stoq-badge stoq-badge--danger', icon: XCircle },
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const EmployeeDashboard = () => {
  const { employee } = useEmployeeAuth();
  const navigate = useNavigate();

  const canCreate  = hasPerm(employee, 'create_requisition');
  const canApprove = hasPerm(employee, 'approve_requisition');
  const canReceive = hasPerm(employee, 'receive_requisition');
  const hasReqPerm = canCreate || canApprove || canReceive;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const result = await dashboardService.getEmployeeDashboard();
      setData(result);
    } catch (err) {
      console.error('Employee dashboard fetch error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  useSocketEvent('requisition-created',  fetchDashboard);
  useSocketEvent('requisition-updated',  fetchDashboard);

  const kpi = data?.kpi ?? {};
  const recentRequisitions = data?.recentRequisitions ?? [];

  const kpiItems = [
    { label: 'Total Requests', value: kpi.total ?? 0, icon: FileText, tone: null },
    { label: 'Pending',        value: kpi.pending ?? 0, icon: Clock,         tone: 'warn' },
    { label: 'Approved',       value: kpi.approved ?? 0, icon: CheckCircle,   tone: 'success' },
    { label: 'In Progress',    value: kpi.inProgress ?? 0, icon: Truck,         tone: 'accent' },
    { label: 'Rejected',       value: kpi.rejected ?? 0, icon: XCircle,       tone: 'danger' },
  ];

  return (
    <div style={{ padding: '20px 24px 40px' }}>
      {/* Page head */}
      <div className="page-head">
        <div>
          <h1>Welcome back, {employee?.firstName || 'User'}</h1>
          <div className="page-head__sub">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        <div className="page-head__actions">
          {loading && <RefreshCw size={14} style={{ color: 'var(--fg-subtle)', animation: 'spin 1s linear infinite' }} />}
          {canCreate && (
            <button className="stoq-btn stoq-btn--primary" onClick={() => navigate('/requisitions/new')}>
              <Plus size={13} /> New Request
            </button>
          )}
        </div>
      </div>

      {/* KPI row — only if employee has any requisition permission */}
      {hasReqPerm && (
        <div className="kpi-grid" style={{ gridTemplateColumns: `repeat(${kpiItems.length}, 1fr)`, marginBottom: 'var(--gap-card)' }}>
          {kpiItems.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="kpi">
                <div className="kpi__label">
                  <span className="kpi__icon" data-tone={item.tone}><Icon size={12} /></span>
                  {item.label}
                </div>
                <div className="kpi__value" style={{ fontSize: 22 }}>
                  {loading ? '—' : item.value}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: hasReqPerm ? '1fr 280px' : '1fr', gap: 14, alignItems: 'start' }}>
        {/* Main — Recent Requisitions */}
        {hasReqPerm && (
          <div className="stoq-panel">
            <div className="stoq-panel__head">
              <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__icon"><ClipboardList size={13} /></span>
                Recent Requests
              </span>
              <button className="stoq-btn stoq-btn--sm" onClick={() => navigate('/requisitions')}>
                View All
              </button>
            </div>

            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 12 }}>
                <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite', marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                Loading…
              </div>
            ) : recentRequisitions.length === 0 ? (
              <div className="stoq-empty" style={{ minHeight: 160 }}>
                <FileText size={24} className="stoq-empty__icon" />
                <div className="stoq-empty__title">No requests yet</div>
                <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>Submit your first requisition to get started</div>
                {canCreate && (
                  <button className="stoq-btn stoq-btn--primary" style={{ marginTop: 12 }} onClick={() => navigate('/requisitions/new')}>
                    <Plus size={13} /> Create Request
                  </button>
                )}
              </div>
            ) : (
              <div className="table-wrap">
                <table className="stoq-tbl">
                  <thead>
                    <tr>
                      <th className="no-sort">Request ID</th>
                      <th className="no-sort">Status</th>
                      <th className="no-sort">Items</th>
                      <th className="no-sort">Supplier</th>
                      <th className="no-sort">Submitted</th>
                      <th className="no-sort col-actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {recentRequisitions.map(r => {
                      const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.PENDING;
                      return (
                        <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/requisitions/${r.id}`)}>
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>
                              #{r.id.slice(-6).toUpperCase()}
                            </span>
                          </td>
                          <td><span className={cfg.cls}>{cfg.label}</span></td>
                          <td style={{ color: 'var(--fg-muted)', fontSize: 12 }}>{r.itemCount} items</td>
                          <td style={{ color: 'var(--fg-muted)', fontSize: 12 }}>{r.supplier?.name || '—'}</td>
                          <td style={{ color: 'var(--fg-subtle)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                            {timeAgo(r.createdAt)}
                          </td>
                          <td className="col-actions" onClick={e => e.stopPropagation()}>
                            <Link to={`/requisitions/${r.id}`} className="icon-btn" style={{ textDecoration: 'none' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Sidebar — Permissions */}
        <div className="stoq-panel">
          <div className="stoq-panel__head">
            <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="kpi__icon"><ShieldCheck size={13} /></span>
              My Permissions
            </span>
          </div>
          <div style={{ padding: 14 }}>
            {employee?.permissions?.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {employee.permissions.map((p, i) => (
                  <span key={i} className="stoq-badge stoq-badge--accent stoq-badge--plain">
                    {p.permission.name.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            ) : (
              <div className="stoq-empty" style={{ padding: '20px 0' }}>
                <ShieldCheck size={20} className="stoq-empty__icon" />
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Standard access only</div>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '8px 0' }}>
            {canCreate && (
              <button onClick={() => navigate('/requisitions/new')} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '8px 14px', fontSize: 12, color: 'var(--fg-muted)',
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              }}>
                <Plus size={12} /> New Requisition
              </button>
            )}
            {hasReqPerm && (
              <button onClick={() => navigate('/requisitions')} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '8px 14px', fontSize: 12, color: 'var(--fg-muted)',
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              }}>
                <ClipboardList size={12} /> My Requests
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
