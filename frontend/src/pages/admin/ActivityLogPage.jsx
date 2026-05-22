import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, Search, RefreshCw, ChevronLeft, ChevronRight,
  Filter, AlertCircle, User, Package, Truck, FileText,
  Users, Clock, BarChart2, Trash2, X, List, LayoutGrid,
} from 'lucide-react';
import activityLogService from '../../services/activityLogService';
import { useViewMode } from '../../hooks/useViewMode';

// ─── helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const ACTION_META = {
  // Stock
  STOCK_CREATED:    { label: 'Stock Created',    tone: 'success', entity: 'Stock' },
  STOCK_UPDATED:    { label: 'Stock Updated',    tone: 'accent',  entity: 'Stock' },
  STOCK_DELETED:    { label: 'Stock Deleted',    tone: 'danger',  entity: 'Stock' },
  // Employee
  EMPLOYEE_CREATED: { label: 'Employee Created', tone: 'success', entity: 'Employee' },
  EMPLOYEE_UPDATED: { label: 'Employee Updated', tone: 'accent',  entity: 'Employee' },
  EMPLOYEE_DELETED: { label: 'Employee Deleted', tone: 'danger',  entity: 'Employee' },
  // Supplier
  SUPPLIER_CREATED: { label: 'Supplier Created', tone: 'success', entity: 'Supplier' },
  SUPPLIER_UPDATED: { label: 'Supplier Updated', tone: 'accent',  entity: 'Supplier' },
  SUPPLIER_DELETED: { label: 'Supplier Deleted', tone: 'danger',  entity: 'Supplier' },
  // Requisition
  REQUISITION_CREATED:           { label: 'Requisition Created',           tone: 'success', entity: 'Requisition' },
  REQUISITION_APPROVED:          { label: 'Requisition Approved',          tone: 'success', entity: 'Requisition' },
  REQUISITION_REJECTED:          { label: 'Requisition Rejected',          tone: 'danger',  entity: 'Requisition' },
  REQUISITION_FULLY_RECEIVED:    { label: 'Fully Received',                tone: 'success', entity: 'Requisition' },
  REQUISITION_PARTIALLY_RECEIVED:{ label: 'Partially Received',            tone: 'warning', entity: 'Requisition' },
  REQUISITION_DELETED:           { label: 'Requisition Deleted',           tone: 'danger',  entity: 'Requisition' },
};

const ENTITY_ICONS = {
  Stock:       Package,
  Employee:    Users,
  Supplier:    Truck,
  Requisition: FileText,
};

const TONE_CLASS = {
  success: 'stoq-badge--success',
  accent:  'stoq-badge--accent',
  danger:  'stoq-badge--danger',
  warning: 'stoq-badge--warning',
};

function ActionBadge({ action }) {
  const meta = ACTION_META[action] || { label: action, tone: 'plain' };
  return (
    <span className={`stoq-badge ${TONE_CLASS[meta.tone] || ''}`} style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
      {meta.label}
    </span>
  );
}

function EntityIcon({ entityType }) {
  const Icon = ENTITY_ICONS[entityType] || Activity;
  return (
    <span className="kpi__icon" style={{ width: 28, height: 28, flexShrink: 0 }}>
      <Icon size={13} />
    </span>
  );
}

// ─── main component ─────────────────────────────────────────────────────────

export default function ActivityLogPage() {
  const [logs, setLogs]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [stats, setStats]         = useState(null);
  const [tab, setTab]             = useState('logs');
  const [toast, setToast]         = useState(null);
  const [showPurge, setShowPurge] = useState(false);
  const [purging, setPurging]     = useState(false);
  const [viewMode, setViewMode]   = useViewMode('activity-log', 'table');

  // filters
  const [search, setSearch]               = useState('');
  const [entityType, setEntityType]       = useState('');
  const [performedByType, setPerformedByType] = useState('');
  const [dateFrom, setDateFrom]           = useState('');
  const [dateTo, setDateTo]               = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const load = useCallback(async (pg = page) => {
    setLoading(true);
    try {
      const data = await activityLogService.getAll({
        page: pg,
        limit: 20,
        search: search || undefined,
        entityType: entityType || undefined,
        performedByType: performedByType || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(pg);
    } catch {
      showToast('Failed to load activity logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, entityType, performedByType, dateFrom, dateTo, page]);

  const loadStats = useCallback(async () => {
    try {
      const data = await activityLogService.getStats();
      setStats(data);
    } catch {}
  }, []);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => load(1), 400);
    return () => clearTimeout(t);
  }, [search, entityType, performedByType, dateFrom, dateTo]);

  useEffect(() => { if (tab === 'stats') loadStats(); }, [tab, loadStats]);

  const handlePurge = async (days) => {
    setPurging(true);
    try {
      const res = await activityLogService.purge(days);
      showToast(`Deleted ${res.deleted} log entries older than ${days} days`);
      setShowPurge(false);
      load(1);
      loadStats();
    } catch {
      showToast('Failed to purge logs', 'error');
    } finally {
      setPurging(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setEntityType('');
    setPerformedByType('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = search || entityType || performedByType || dateFrom || dateTo;

  return (
    <div style={{ padding: '20px 24px 40px' }}>
      {toast && (
        <div className={`stoq-toast ${toast.type === 'error' ? 'stoq-toast--error' : 'stoq-toast--success'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'error' ? <AlertCircle size={13} /> : <Activity size={13} />}
          {toast.msg}
        </div>
      )}

      {/* Page head */}
      <div className="page-head">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} style={{ color: 'var(--accent-soft-fg)' }} />
            Activity Log
          </h1>
          <div className="page-head__sub">{total.toLocaleString()} total events recorded</div>
        </div>
        <div className="page-head__actions">
          <button className="stoq-btn" onClick={() => setShowPurge(true)}>
            <Trash2 size={13} /> Purge old logs
          </button>
          <button className="stoq-btn stoq-btn--icon" onClick={() => load(page)} title="Refresh">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="stoq-tabs" style={{ marginBottom: 16 }}>
        {[
          { key: 'logs',  icon: Activity,  label: 'Event Log' },
          { key: 'stats', icon: BarChart2, label: 'Summary' },
        ].map(({ key, icon: Icon, label }) => (
          <button key={key} className="stoq-tab" data-active={tab === key ? 'true' : 'false'} onClick={() => setTab(key)}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ── EVENT LOG TAB ── */}
      {tab === 'logs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Toolbar */}
          <div className="stoq-toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div className="stoq-toolbar__search" style={{ position: 'relative', minWidth: 220, flex: '1 1 220px' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
              <input
                className="stoq-input stoq-input--search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search action, entity, performer…"
              />
            </div>

            <select className="stoq-select" value={entityType} onChange={e => setEntityType(e.target.value)} style={{ width: 140 }}>
              <option value="">All entities</option>
              <option value="Stock">Stock</option>
              <option value="Employee">Employee</option>
              <option value="Supplier">Supplier</option>
              <option value="Requisition">Requisition</option>
            </select>

            <select className="stoq-select" value={performedByType} onChange={e => setPerformedByType(e.target.value)} style={{ width: 130 }}>
              <option value="">All actors</option>
              <option value="ADMIN">Admin</option>
              <option value="EMPLOYEE">Employee</option>
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Filter size={12} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />
              <input type="date" className="stoq-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                style={{ width: 140 }} title="From date" />
              <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>–</span>
              <input type="date" className="stoq-input" value={dateTo} onChange={e => setDateTo(e.target.value)}
                style={{ width: 140 }} title="To date" />
            </div>

            {hasFilters && (
              <button className="stoq-btn stoq-btn--sm" onClick={clearFilters} style={{ color: 'var(--fg-subtle)' }}>
                <X size={11} /> Clear
              </button>
            )}

            {/* View toggle */}
            <div className="stoq-segment" style={{ marginLeft: 'auto' }}>
              <button data-active={viewMode === 'table' ? 'true' : undefined} onClick={() => setViewMode('table')} title="Table view">
                <List size={13} />
              </button>
              <button data-active={viewMode === 'cards' ? 'true' : undefined} onClick={() => setViewMode('cards')} title="Card view">
                <LayoutGrid size={13} />
              </button>
            </div>
          </div>

          {/* ── TABLE VIEW ── */}
          {viewMode === 'table' && (
            <div className="stoq-panel" style={{ borderRadius: 'var(--r-md)' }}>
              <div className="table-wrap">
                <table className="stoq-tbl">
                  <thead>
                    <tr>
                      <th className="no-sort">Action</th>
                      <th className="no-sort">Entity</th>
                      <th className="no-sort">Performed By</th>
                      <th className="no-sort">Details</th>
                      <th className="no-sort">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '48px 0' }}>
                          <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)', margin: '0 auto' }} />
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--fg-subtle)' }}>
                          <Activity size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                          <div style={{ fontSize: 12 }}>No activity found</div>
                        </td>
                      </tr>
                    ) : logs.map(log => (
                      <tr key={log.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <ActionBadge action={log.action} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <EntityIcon entityType={log.entityType} />
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>
                                {log.entityLabel || log.entityType}
                              </div>
                              {log.entityId && (
                                <div style={{ fontSize: 10, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>
                                  {log.entityId.slice(-8).toUpperCase()}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="kpi__icon" style={{ width: 24, height: 24, flexShrink: 0 }}>
                              <User size={11} />
                            </span>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)' }}>
                                {log.performedByName || log.performedById.slice(0, 8)}
                              </div>
                              <span className={`stoq-badge ${log.performedByType === 'ADMIN' ? 'stoq-badge--accent' : 'stoq-badge--warning'}`}
                                style={{ fontSize: 9 }}>
                                {log.performedByType === 'ADMIN' ? 'Admin' : 'Employee'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td style={{ maxWidth: 260 }}>
                          {log.metadata && Object.keys(log.metadata).length > 0 ? (
                            <div style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
                              {Object.entries(log.metadata)
                                .filter(([k]) => !['changes'].includes(k))
                                .slice(0, 3)
                                .map(([k, v]) => (
                                  <span key={k} style={{ marginRight: 8 }}>
                                    <span style={{ color: 'var(--fg-subtle)' }}>{k}:</span>{' '}
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                    </span>
                                  </span>
                                ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--fg-subtle)', fontSize: 11 }}>—</span>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--fg-subtle)', fontSize: 11 }}>
                            <Clock size={10} />
                            <span title={new Date(log.createdAt).toLocaleString()}>{timeAgo(log.createdAt)}</span>
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                            {new Date(log.createdAt).toLocaleDateString('en-GB')}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
                    Page {page} of {totalPages} · {total.toLocaleString()} events
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="stoq-btn stoq-btn--icon" disabled={page <= 1}
                      style={{ opacity: page <= 1 ? 0.4 : 1 }} onClick={() => load(page - 1)}>
                      <ChevronLeft size={14} />
                    </button>
                    <button className="stoq-btn stoq-btn--icon" disabled={page >= totalPages}
                      style={{ opacity: page >= totalPages ? 0.4 : 1 }} onClick={() => load(page + 1)}>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── CARDS VIEW ── */}
          {viewMode === 'cards' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                  <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
                </div>
              ) : logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--fg-subtle)' }}>
                  <Activity size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                  <div style={{ fontSize: 12 }}>No activity found</div>
                  {hasFilters && (
                    <button className="stoq-btn stoq-btn--sm" style={{ marginTop: 10 }} onClick={clearFilters}>
                      Clear filters
                    </button>
                  )}
                </div>
              ) : logs.map(log => {
                const meta = ACTION_META[log.action] || { label: log.action, tone: 'plain' };
                const EntityIconComp = ENTITY_ICONS[log.entityType] || Activity;
                return (
                  <div key={log.id} className="stoq-panel" style={{ padding: 0 }}>
                    <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      {/* Entity icon */}
                      <span className="kpi__icon" style={{ width: 34, height: 34, flexShrink: 0, marginTop: 2 }}>
                        <EntityIconComp size={15} />
                      </span>

                      {/* Main content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Top row: action badge + time */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                          <ActionBadge action={log.action} />
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--fg-subtle)', fontSize: 11, whiteSpace: 'nowrap' }}>
                            <Clock size={10} />
                            <span title={new Date(log.createdAt).toLocaleString()}>{timeAgo(log.createdAt)}</span>
                            <span style={{ color: 'var(--border)' }}>·</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                              {new Date(log.createdAt).toLocaleDateString('en-GB')}
                            </span>
                          </div>
                        </div>

                        {/* Entity label */}
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>
                          {log.entityLabel || log.entityType}
                          {log.entityId && (
                            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-subtle)', marginLeft: 8, fontWeight: 400 }}>
                              #{log.entityId.slice(-8).toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Performer row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span className="kpi__icon" style={{ width: 20, height: 20 }}><User size={10} /></span>
                          <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                            {log.performedByName || log.performedById.slice(0, 8)}
                          </span>
                          <span className={`stoq-badge ${log.performedByType === 'ADMIN' ? 'stoq-badge--accent' : 'stoq-badge--warning'}`}
                            style={{ fontSize: 9 }}>
                            {log.performedByType === 'ADMIN' ? 'Admin' : 'Employee'}
                          </span>
                        </div>

                        {/* Metadata */}
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-sm)', display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                            {Object.entries(log.metadata)
                              .filter(([k]) => !['changes'].includes(k))
                              .slice(0, 4)
                              .map(([k, v]) => (
                                <span key={k} style={{ fontSize: 10, color: 'var(--fg-muted)' }}>
                                  <span style={{ color: 'var(--fg-subtle)' }}>{k}:</span>{' '}
                                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>
                                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                  </span>
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pagination for cards */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px' }}>
                  <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
                    Page {page} of {totalPages} · {total.toLocaleString()} events
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="stoq-btn stoq-btn--icon" disabled={page <= 1}
                      style={{ opacity: page <= 1 ? 0.4 : 1 }} onClick={() => load(page - 1)}>
                      <ChevronLeft size={14} />
                    </button>
                    <button className="stoq-btn stoq-btn--icon" disabled={page >= totalPages}
                      style={{ opacity: page >= totalPages ? 0.4 : 1 }} onClick={() => load(page + 1)}>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SUMMARY TAB ── */}
      {tab === 'stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!stats ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
            </div>
          ) : (
            <>
              {/* KPI row */}
              <div className="kpi-grid kpi-grid--3">
                <div className="kpi">
                  <div className="kpi__label"><span className="kpi__icon"><Activity size={12} /></span>Total Events</div>
                  <div className="kpi__value">{stats.total.toLocaleString()}</div>
                </div>
                {stats.byPerformerType.map(r => (
                  <div className="kpi" key={r.type}>
                    <div className="kpi__label">
                      <span className="kpi__icon"><User size={12} /></span>
                      By {r.type === 'ADMIN' ? 'Admins' : 'Employees'}
                    </div>
                    <div className="kpi__value">{r.count.toLocaleString()}</div>
                  </div>
                ))}
              </div>

              {/* By entity type */}
              <div className="stoq-panel">
                <div className="stoq-panel__head">
                  <span className="stoq-panel__title">Events by Entity Type</span>
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {stats.byEntityType.map(r => {
                    const pct = stats.total > 0 ? Math.round((r.count / stats.total) * 100) : 0;
                    const Icon = ENTITY_ICONS[r.entity] || Activity;
                    return (
                      <div key={r.entity} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className="kpi__icon" style={{ flexShrink: 0 }}><Icon size={13} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{r.entity}</span>
                            <span style={{ fontSize: 11, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>
                              {r.count.toLocaleString()} ({pct}%)
                            </span>
                          </div>
                          <div style={{ height: 6, background: 'var(--bg-sunk)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width 0.4s' }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent actions */}
              <div className="stoq-panel">
                <div className="stoq-panel__head">
                  <span className="stoq-panel__title">Recent Activity</span>
                </div>
                {stats.recentActions.map(log => (
                  <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                    <EntityIcon entityType={log.entityType} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <ActionBadge action={log.action} />
                        <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                          {log.entityLabel || log.entityType}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>
                        by {log.performedByName || log.performedById.slice(0, 8)}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-subtle)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={10} /> {timeAgo(log.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Purge modal */}
      {showPurge && (
        <div className="stoq-modal-backdrop">
          <div className="stoq-modal" style={{ maxWidth: 420 }}>
            <div className="stoq-modal__head">
              <div>
                <div className="stoq-modal__title">Purge Old Logs</div>
                <div className="stoq-modal__sub">Remove activity logs older than a set number of days</div>
              </div>
              <button className="stoq-btn stoq-btn--ghost stoq-btn--icon" onClick={() => setShowPurge(false)}><X size={14} /></button>
            </div>
            <div className="stoq-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
                This permanently deletes log entries. Choose a retention window:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[30, 60, 90, 180].map(days => (
                  <button key={days} className="stoq-btn" disabled={purging}
                    onClick={() => handlePurge(days)}
                    style={{ justifyContent: 'center', opacity: purging ? 0.6 : 1 }}>
                    {purging ? <RefreshCw size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
                    Older than {days} days
                  </button>
                ))}
              </div>
            </div>
            <div className="stoq-modal__foot">
              <button className="stoq-btn" onClick={() => setShowPurge(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
