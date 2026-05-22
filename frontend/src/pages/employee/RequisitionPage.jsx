import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Eye, CheckCircle, XCircle, Package, ChevronLeft, ChevronRight,
  Clock, CheckCheck, FileText, Truck, Trash2, Plus, LayoutGrid, List, Shield, MapPin,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import requisitionService from '../../services/requisitionService';
import { useSocketEvent } from '../../context/SocketContext';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import { useViewMode } from '../../hooks/useViewMode';
import Sparkline, { genSpark } from '../../components/Sparkline';

const hasPerm = (employee, ...names) =>
  names.some(name => employee?.permissions?.some(p => p.permission.name === name));

const PAGE_SIZE = 10;

const STATUS_CONFIG = {
  PENDING:            { label: 'Pending',            icon: Clock },
  APPROVED:           { label: 'Approved',           icon: CheckCircle },
  PARTIALLY_RECEIVED: { label: 'Partially Received', icon: Truck },
  FULLY_RECEIVED:     { label: 'Fully Received',     icon: CheckCheck },
  REJECTED:           { label: 'Rejected',           icon: XCircle },
};

const STATUS_BADGE = {
  PENDING:            'stoq-badge',
  APPROVED:           'stoq-badge stoq-badge--accent',
  PARTIALLY_RECEIVED: 'stoq-badge stoq-badge--warning',
  FULLY_RECEIVED:     'stoq-badge stoq-badge--success',
  REJECTED:           'stoq-badge stoq-badge--danger',
};

const SPARK_SEEDS  = { PENDING: 4, APPROVED: 6, PARTIALLY_RECEIVED: 8, FULLY_RECEIVED: 2, REJECTED: 10 };
const SPARK_COLORS = { PENDING: 'var(--fg-subtle)', APPROVED: 'var(--accent)', PARTIALLY_RECEIVED: 'var(--warning)', FULLY_RECEIVED: 'var(--success)', REJECTED: 'var(--danger)' };

function StatusBadge({ status }) {
  return <span className={STATUS_BADGE[status] || 'stoq-badge'}>{STATUS_CONFIG[status]?.label ?? status}</span>;
}

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`stoq-toast ${toast.type === 'error' ? 'stoq-toast--error' : 'stoq-toast--success'}`}>{toast.msg}</div>;
}

export default function EmployeeRequisitionPage() {
  const navigate = useNavigate();
  const { employee } = useEmployeeAuth();
  const canCreate  = hasPerm(employee, 'create_requisition');
  const canApprove = hasPerm(employee, 'approve_requisition');
  const canReceive = hasPerm(employee, 'receive_requisition');

  const [requisitions, setRequisitions] = useState([]);
  const [total, setTotal]               = useState(0);
  const [totalPages, setTotalPages]     = useState(1);
  const [page, setPage]                 = useState(1);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading]           = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [acting, setActing]             = useState(false);
  const [toast, setToast]               = useState(null);
  const [viewMode, setViewMode, isSmallScreen] = useViewMode('employee-requisitions');

  if (!canCreate && !canApprove && !canReceive) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: 32 }}>
        <div style={{ width: 52, height: 52, borderRadius: 'var(--r-md)', background: 'var(--bg-sunk)', display: 'grid', placeItems: 'center', marginBottom: 16 }}>
          <Shield size={24} style={{ color: 'var(--fg-subtle)' }} />
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No Access</div>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', maxWidth: 280 }}>You don't have permission to manage requisitions. Contact your admin.</p>
      </div>
    );
  }

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };

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
    } catch { showToast('Failed to load requisitions', 'error'); }
    finally { setLoading(false); }
  }, [search, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  useSocketEvent('requisition-created', () => load());
  useSocketEvent('requisition-updated', () => load());
  useSocketEvent('requisition-deleted', () => load());

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActing(true);
    try {
      await requisitionService.remove(deleteTarget.id);
      showToast('Requisition deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    } finally { setActing(false); }
  };

  const counts = Object.keys(STATUS_CONFIG).reduce((acc, key) => {
    acc[key] = requisitions.filter(r => r.status === key).length;
    return acc;
  }, {});

  return (
    <div>
      <Toast toast={toast} />

      {/* Page Head */}
      <div className="page-head">
        <div>
          <h1>My Requisitions</h1>
          <div className="page-head__sub">{total} total requests</div>
        </div>
        <div className="page-head__actions">
          {canCreate && (
            <button className="stoq-btn stoq-btn--primary" onClick={() => navigate('/requisitions/create')}>
              <Plus size={13} /> New Request
            </button>
          )}
        </div>
      </div>

      {/* Status KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 'var(--gap-card)' }}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const active = statusFilter === key;
          return (
            <div
              key={key}
              className="kpi"
              style={{ cursor: 'pointer', outline: active ? '2px solid var(--accent)' : 'none', outlineOffset: -2 }}
              onClick={() => { setStatusFilter(active ? '' : key); setPage(1); }}
            >
              <div className="kpi__label">
                <span className="kpi__icon"><Icon size={11} /></span>
                {cfg.label}
              </div>
              <div className="kpi__value">{counts[key] ?? 0}</div>
              <div className="kpi__foot"><span>{active ? 'filtered' : 'click to filter'}</span></div>
              <Sparkline data={genSpark(SPARK_SEEDS[key], 14, 0)} color={SPARK_COLORS[key]} />
            </div>
          );
        })}
      </div>

      {/* Panel */}
      <div className="stoq-panel">
        {/* Toolbar */}
        <div className="stoq-toolbar">
          <div className="stoq-toolbar__search">
            <input
              className="stoq-input stoq-input--search"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search requisitions…"
            />
          </div>
          <select className="stoq-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ width: 160 }}>
            <option value="">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <div style={{ flex: 1 }} />
          {!isSmallScreen && (
            <div className="stoq-segment">
              <button data-active={viewMode === 'table' ? 'true' : undefined} onClick={() => setViewMode('table')} title="Table"><List size={13} /></button>
              <button data-active={viewMode === 'grid' ? 'true' : undefined} onClick={() => setViewMode('grid')} title="Grid"><LayoutGrid size={13} /></button>
            </div>
          )}
        </div>

        {/* Table view */}
        {viewMode === 'table' && (
          <div className="table-wrap">
            <table className="stoq-tbl">
              <thead>
                <tr>
                  <th className="no-sort">Description</th>
                  <th className="no-sort">Site</th>
                  <th className="no-sort">Items</th>
                  <th className="no-sort">Status</th>
                  <th className="no-sort">Date</th>
                  <th className="no-sort col-actions" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="stoq-empty">Loading…</td></tr>
                ) : requisitions.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="stoq-empty">
                        <div className="stoq-empty__icon"><FileText size={32} /></div>
                        <div className="stoq-empty__title">No requisitions found</div>
                        {canCreate && <p>Click "New Request" to submit one.</p>}
                      </div>
                    </td>
                  </tr>
                ) : requisitions.map(req => (
                  <tr key={req.id} onClick={() => navigate(`/requisitions/${req.id}`)}>
                    <td>
                      <span className="cell-stack__main">{req.description || <em style={{ fontWeight: 400, color: 'var(--fg-subtle)' }}>No description</em>}</span>
                      <span className="cell-stack__sub">#{req.id.slice(-8).toUpperCase()}</span>
                    </td>
                    <td>
                      {req.site ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                          <MapPin size={11} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />
                          <span style={{ fontWeight: 500 }}>{req.site.name}</span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--fg-subtle)', fontSize: 11 }}>—</span>
                      )}
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600 }}>
                        <Package size={12} style={{ color: 'var(--fg-subtle)' }} />
                        {req._count?.items ?? req.items?.length ?? 0}
                      </span>
                    </td>
                    <td><StatusBadge status={req.status} /></td>
                    <td style={{ color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {new Date(req.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="col-actions" onClick={e => e.stopPropagation()}>
                      <div className="stoq-btn-group" style={{ justifyContent: 'flex-end' }}>
                        <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="View" onClick={() => navigate(`/requisitions/${req.id}`)}><Eye size={13} /></button>
                        {req.status === 'PENDING' && canApprove && (
                          <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="Approve" style={{ color: 'var(--success)' }} onClick={() => navigate(`/requisitions/approve/${req.id}`)}><CheckCircle size={13} /></button>
                        )}
                        {(req.status === 'APPROVED' || req.status === 'PARTIALLY_RECEIVED') && canReceive && (
                          <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="Receive" style={{ color: 'var(--accent-soft-fg)' }} onClick={() => navigate(`/requisitions/receive/${req.id}`)}><Truck size={13} /></button>
                        )}
                        {req.status === 'PENDING' && req.employeeId === employee?.id && (
                          <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="Delete" style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(req)}><Trash2 size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Grid view */}
        {viewMode === 'grid' && (
          <div style={{ padding: 'var(--gap-card)' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--fg-subtle)', fontSize: 12 }}>Loading…</div>
            ) : requisitions.length === 0 ? (
              <div className="stoq-empty">
                <div className="stoq-empty__icon"><FileText size={32} /></div>
                <div className="stoq-empty__title">No requisitions found</div>
                {canCreate && <p>Click "New Request" to submit one.</p>}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {requisitions.map(req => (
                  <div key={req.id} onClick={() => navigate(`/requisitions/${req.id}`)}
                    style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 14, cursor: 'pointer', background: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>
                          #{req.id.slice(-8).toUpperCase()}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {req.description || <em style={{ fontWeight: 400, color: 'var(--fg-subtle)' }}>No description</em>}
                        </div>
                      </div>
                      <StatusBadge status={req.status} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--fg-muted)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Package size={11} style={{ color: 'var(--fg-subtle)' }} />
                        <strong style={{ color: 'var(--fg)' }}>{req._count?.items ?? req.items?.length ?? 0}</strong> items
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-subtle)' }}>
                        {new Date(req.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      {req.site && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                          <MapPin size={10} style={{ color: 'var(--fg-subtle)' }} /> {req.site.name}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4, borderTop: '1px solid var(--border)', paddingTop: 8 }} onClick={e => e.stopPropagation()}>
                      <button className="stoq-btn stoq-btn--ghost stoq-btn--sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate(`/requisitions/${req.id}`)}><Eye size={12} /></button>
                      {req.status === 'PENDING' && canApprove && (
                        <button className="stoq-btn stoq-btn--ghost stoq-btn--sm" style={{ flex: 1, justifyContent: 'center', color: 'var(--success)' }} onClick={() => navigate(`/requisitions/approve/${req.id}`)}><CheckCircle size={12} /></button>
                      )}
                      {(req.status === 'APPROVED' || req.status === 'PARTIALLY_RECEIVED') && canReceive && (
                        <button className="stoq-btn stoq-btn--ghost stoq-btn--sm" style={{ flex: 1, justifyContent: 'center', color: 'var(--accent-soft-fg)' }} onClick={() => navigate(`/requisitions/receive/${req.id}`)}><Truck size={12} /></button>
                      )}
                      {req.status === 'PENDING' && req.employeeId === employee?.id && (
                        <button className="stoq-btn stoq-btn--ghost stoq-btn--sm" style={{ flex: 1, justifyContent: 'center', color: 'var(--danger)' }} onClick={() => setDeleteTarget(req)}><Trash2 size={12} /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Page {page} of {totalPages} · {total} total</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="stoq-btn stoq-btn--icon" disabled={page <= 1} style={{ opacity: page <= 1 ? 0.4 : 1 }} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
              <button className="stoq-btn stoq-btn--icon" disabled={page >= totalPages} style={{ opacity: page >= totalPages ? 0.4 : 1 }} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="stoq-modal-backdrop">
          <div className="stoq-modal" style={{ maxWidth: 400 }}>
            <div className="stoq-modal__head">
              <div>
                <div className="stoq-modal__title">Delete Request?</div>
                <div className="stoq-modal__sub">This pending requisition will be permanently removed.</div>
              </div>
              <button className="stoq-btn stoq-btn--ghost stoq-btn--icon" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <div className="stoq-modal__foot">
              <button className="stoq-btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="stoq-btn stoq-btn--primary" style={{ background: 'var(--danger)', borderColor: 'transparent' }} onClick={handleDelete} disabled={acting}>
                {acting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
