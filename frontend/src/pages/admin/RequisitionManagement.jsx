import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Eye, CheckCircle, XCircle, Package, ChevronLeft, ChevronRight,
  Clock, CheckCheck, FileText, Truck, Trash2, Plus, LayoutGrid, List, MapPin,
  Download, RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import requisitionService from '../../services/requisitionService';
import { useRole } from '../../hooks/useRole';
import { useSocketEvent } from '../../context/SocketContext';
import Sparkline, { genSpark } from '../../components/Sparkline';
import { useViewMode } from '../../hooks/useViewMode';
import { exportToExcel } from '../../lib/exportExcel';

const SPARK_SEEDS  = { PENDING: 4, APPROVED: 6, PARTIALLY_RECEIVED: 8, FULLY_RECEIVED: 2, REJECTED: 10 };
const SPARK_COLORS = { PENDING: 'var(--fg-subtle)', APPROVED: 'var(--accent)', PARTIALLY_RECEIVED: 'var(--warning)', FULLY_RECEIVED: 'var(--success)', REJECTED: 'var(--danger)' };

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

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return <span className={STATUS_BADGE[status] || 'stoq-badge'}>{cfg.label}</span>;
}

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`stoq-toast ${toast.type === 'error' ? 'stoq-toast--error' : 'stoq-toast--success'}`}>{toast.msg}</div>;
}

export default function RequisitionManagement() {
  const navigate = useNavigate();
  const { path } = useRole();
  const [requisitions, setRequisitions] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState(null);
  const [viewMode, setViewMode, isSmallScreen] = useViewMode('admin-requisitions');

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

  useSocketEvent('requisition-created', () => load());
  useSocketEvent('requisition-updated', () => load());
  useSocketEvent('requisition-deleted', () => load());

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) { showToast('Rejection reason required', 'error'); return; }
    setActing(true);
    try {
      await requisitionService.reject(rejectTarget.id, rejectReason);
      showToast('Requisition rejected');
      setRejectTarget(null);
      setRejectReason('');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject', 'error');
    } finally {
      setActing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActing(true);
    try {
      await requisitionService.remove(deleteTarget.id);
      showToast('Requisition deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete', 'error');
    } finally {
      setActing(false);
    }
  };

  const counts = Object.keys(STATUS_CONFIG).reduce((acc, key) => {
    acc[key] = requisitions.filter(r => r.status === key).length;
    return acc;
  }, {});

  const [exporting, setExporting] = useState(false);
  const exportExcelFile = async () => {
    setExporting(true);
    try {
      const data = await requisitionService.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
        page: 1,
        limit: 100000,
      });
      const headers = ['Reference', 'Status', 'Employee', 'Site', 'Supplier', 'Item Count', 'Description', 'Created Date', 'Approved Date'];
      const rows = data.requisitions.map(r => [
        `REQ-${r.id.slice(-8).toUpperCase()}`,
        STATUS_CONFIG[r.status]?.label ?? r.status,
        r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : 'Admin',
        r.site?.name || '',
        r.supplier?.name || '',
        r._count?.items ?? r.items?.length ?? 0,
        r.description || '',
        new Date(r.createdAt).toLocaleDateString('en-GB'),
        r.approvedAt ? new Date(r.approvedAt).toLocaleDateString('en-GB') : '',
      ]);
      exportToExcel(`requisitions-${new Date().toISOString().slice(0, 10)}`, headers, rows, 'Requisitions');
    } catch { showToast('Failed to export requisitions', 'error'); }
    finally { setExporting(false); }
  };

  return (
    <div>
      <Toast toast={toast} />

      {/* Page Head */}
      <div className="page-head">
        <div>
          <h1>Requisitions</h1>
          <div className="page-head__sub">{total} total requests</div>
        </div>
        <div className="page-head__actions">
          <button className="stoq-btn" onClick={exportExcelFile} disabled={exporting}>
            {exporting ? <RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Download size={13} />} Export
          </button>
          <button className="stoq-btn stoq-btn--primary" onClick={() => navigate(path('/requisition-management/create'))}>
            <Plus size={13} /> New Requisition
          </button>
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
              placeholder="Search by employee or description..."
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
                  <th className="no-sort">Employee</th>
                  <th className="no-sort">Description</th>
                  <th className="no-sort">Site</th>
                  <th className="no-sort">Items</th>
                  <th className="no-sort">Status</th>
                  <th className="no-sort">Date</th>
                  <th className="no-sort col-actions" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="stoq-empty">Loading...</td></tr>
                ) : requisitions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="stoq-empty">
                      <div className="stoq-empty__icon"><FileText size={28} /></div>
                      <div className="stoq-empty__title">No requisitions found</div>
                    </td>
                  </tr>
                ) : requisitions.map(req => (
                  <tr key={req.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', background: req.employee ? 'var(--accent-soft)' : 'var(--bg-sunk)', color: req.employee ? 'var(--accent-soft-fg)' : 'var(--fg-subtle)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {req.employee?.firstName?.charAt(0)?.toUpperCase() ?? 'A'}
                        </div>
                        <div>
                          {req.employee ? (
                            <>
                              <span className="cell-stack__main">{req.employee.firstName} {req.employee.lastName}</span>
                              <span className="cell-stack__sub">{req.employee.position || req.employee.email}</span>
                            </>
                          ) : (
                            <>
                              <span className="cell-stack__main">Admin Requisition</span>
                              <span className="cell-stack__sub">Created directly by admin</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--fg-muted)', maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {req.description || <em style={{ color: 'var(--fg-subtle)' }}>No description</em>}
                      </span>
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
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                        <Package size={12} style={{ color: 'var(--fg-subtle)' }} />
                        <strong>{req._count?.items ?? req.items?.length ?? 0}</strong>
                      </span>
                    </td>
                    <td><StatusBadge status={req.status} /></td>
                    <td style={{ fontSize: 11, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(req.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="col-actions" style={{ textAlign: 'right' }}>
                      <div className="stoq-btn-group" style={{ justifyContent: 'flex-end' }}>
                        <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="View" onClick={() => navigate(path(`/requisition-management/${req.id}`))}>
                          <Eye size={13} />
                        </button>
                        {req.status === 'PENDING' && (
                          <>
                            <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="Approve" style={{ color: 'var(--success)' }} onClick={() => navigate(path(`/requisition-management/approve/${req.id}`))}>
                              <CheckCircle size={13} />
                            </button>
                            <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="Reject" style={{ color: 'var(--danger)' }} onClick={() => { setRejectTarget(req); setRejectReason(''); }}>
                              <XCircle size={13} />
                            </button>
                          </>
                        )}
                        {(req.status === 'APPROVED' || req.status === 'PARTIALLY_RECEIVED') && (
                          <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="Receive Items" onClick={() => navigate(path(`/requisition-management/receive/${req.id}`))}>
                            <Truck size={13} />
                          </button>
                        )}
                        <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="Delete" style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(req)}>
                          <Trash2 size={13} />
                        </button>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, padding: 14 }}>
            {loading ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 32, color: 'var(--fg-subtle)', fontSize: 12 }}>Loading...</div>
            ) : requisitions.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 32, color: 'var(--fg-subtle)', fontSize: 12 }}>No requisitions found</div>
            ) : requisitions.map(req => (
              <div key={req.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 14, background: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', background: req.employee ? 'var(--accent-soft)' : 'var(--bg-sunk)', color: req.employee ? 'var(--accent-soft-fg)' : 'var(--fg-subtle)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {req.employee?.firstName?.charAt(0)?.toUpperCase() ?? 'A'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{req.employee ? `${req.employee.firstName} ${req.employee.lastName}` : 'Admin Requisition'}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{req.employee?.position ?? 'No employee assigned'}</div>
                    </div>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
                {req.description && (
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.description}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--fg-subtle)', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Package size={10} /> {req._count?.items ?? 0} items</span>
                  <span>{new Date(req.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  {req.site && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={10} /> {req.site.name}</span>}
                </div>
                <div style={{ display: 'flex', gap: 4, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                  <button className="stoq-btn stoq-btn--ghost stoq-btn--sm" style={{ flex: 1 }} onClick={() => navigate(path(`/requisition-management/${req.id}`))}><Eye size={12} /> View</button>
                  {req.status === 'PENDING' && (
                    <button className="stoq-btn stoq-btn--sm" style={{ flex: 1, background: 'var(--success)', color: '#fff', borderColor: 'transparent' }} onClick={() => navigate(path(`/requisition-management/approve/${req.id}`))}>
                      <CheckCircle size={12} /> Approve
                    </button>
                  )}
                  {(req.status === 'APPROVED' || req.status === 'PARTIALLY_RECEIVED') && (
                    <button className="stoq-btn stoq-btn--sm" style={{ flex: 1 }} onClick={() => navigate(path(`/requisition-management/receive/${req.id}`))}>
                      <Truck size={12} /> Receive
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', fontSize: 12, color: 'var(--fg-muted)' }}>
          <span>Page {page} of {totalPages} - {total} total</span>
          <div className="stoq-btn-group">
            <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={14} />
            </button>
            <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="stoq-modal-backdrop">
          <div className="stoq-modal" style={{ maxWidth: 420 }}>
            <div className="stoq-modal__head">
              <div>
                <div className="stoq-modal__title">Reject Requisition</div>
                <div className="stoq-modal__sub">Provide a reason for the employee.</div>
              </div>
              <button className="stoq-btn stoq-btn--ghost stoq-btn--icon" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>X</button>
            </div>
            <div className="stoq-modal__body">
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                rows={3}
                className="stoq-input"
                style={{ width: '100%', resize: 'vertical', minHeight: 80 }}
              />
            </div>
            <div className="stoq-modal__foot">
              <button className="stoq-btn" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>Cancel</button>
              <button className="stoq-btn stoq-btn--primary" style={{ background: 'var(--danger)', borderColor: 'transparent' }} onClick={handleReject} disabled={acting}>
                {acting ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="stoq-modal-backdrop">
          <div className="stoq-modal" style={{ maxWidth: 400 }}>
            <div className="stoq-modal__head">
              <div>
                <div className="stoq-modal__title">Delete Requisition</div>
                <div className="stoq-modal__sub">This action cannot be undone.</div>
              </div>
              <button className="stoq-btn stoq-btn--ghost stoq-btn--icon" onClick={() => setDeleteTarget(null)}>X</button>
            </div>
            <div className="stoq-modal__body">
              <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Are you sure you want to delete this requisition?</p>
            </div>
            <div className="stoq-modal__foot">
              <button className="stoq-btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="stoq-btn stoq-btn--primary" style={{ background: 'var(--danger)', borderColor: 'transparent' }} onClick={handleDelete} disabled={acting}>
                {acting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}


