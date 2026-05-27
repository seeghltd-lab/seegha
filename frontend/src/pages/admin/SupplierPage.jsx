import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Eye, ChevronLeft, ChevronRight, Truck, Phone, Mail, MapPin, User, Package, LayoutGrid, List, Table2, DollarSign, Star } from 'lucide-react';
import supplierService from '../../services/supplierService';
import Sparkline, { genSpark } from '../../components/Sparkline';
import { useViewMode } from '../../hooks/useViewMode';
import { useRole } from '../../hooks/useRole';

const PAGE_SIZE = 10;

const BADGE_MAP = {
  ACTIVE:    'stoq-badge--success',
  INACTIVE:  '',
  SUSPENDED: 'stoq-badge--danger',
};
const LABEL_MAP = { ACTIVE: 'Active', INACTIVE: 'Inactive', SUSPENDED: 'Suspended' };

function StatusBadge({ status }) {
  return <span className={`stoq-badge ${BADGE_MAP[status] || ''}`}>{LABEL_MAP[status] || status}</span>;
}

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`stoq-toast ${toast.type === 'error' ? 'stoq-toast--error' : 'stoq-toast--success'}`}>{toast.msg}</div>;
}

export default function SupplierPage() {
  const navigate = useNavigate();
  const { path, isAdmin } = useRole();
  const [suppliers, setSuppliers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode, isSmallScreen] = useViewMode('suppliers');
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };

  const load = async () => {
    setLoading(true);
    try {
      const data = await supplierService.getAll({ search: search || undefined, status: statusFilter || undefined, page, limit: PAGE_SIZE });
      setSuppliers(data.suppliers);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch { showToast('Failed to load suppliers', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, statusFilter]);
  useEffect(() => {
    const t = setTimeout(() => { if (page !== 1) setPage(1); else load(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const activeCount = useMemo(() => suppliers.filter(s => s.status === 'ACTIVE').length, [suppliers]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await supplierService.remove(deleteTarget.id);
      showToast('Supplier deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    } finally { setDeleting(false); }
  };

  return (
    <div>
      <Toast toast={toast} />

      {/* Page Head */}
      <div className="page-head">
        <div>
          <h1>Suppliers</h1>
          <div className="page-head__sub">{total} vendors - {activeCount} active</div>
        </div>
        <div className="page-head__actions">
          <button className="stoq-btn stoq-btn--primary" onClick={() => navigate(path('/suppliers/add'))}>
            <Plus size={14} /> Add supplier
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="kpi-grid kpi-grid--3" style={{ marginBottom: 'var(--gap-card)' }}>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><Truck size={12} /></span>Total vendors</div>
          <div className="kpi__value">{total}</div>
          <div className="kpi__foot"><span>registered suppliers</span><span className="kpi__delta kpi__delta--up">+2</span></div>
          <Sparkline data={genSpark(2, 14, 0.3)} />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><User size={12} /></span>Active</div>
          <div className="kpi__value" style={{ color: 'var(--success)' }}>{activeCount}</div>
          <div className="kpi__foot"><span>currently supplying</span></div>
          <Sparkline data={genSpark(5, 14, 0.1)} />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon" data-tone="warning"><Package size={12} /></span>Inactive / Suspended</div>
          <div className="kpi__value">{total - activeCount}</div>
          <div className="kpi__foot"><span>needs review</span></div>
          <Sparkline data={genSpark(9, 14, 0)} color="var(--warning)" />
        </div>
      </div>

      {/* Panel */}
      <div className="stoq-panel">
        {/* Toolbar */}
        <div className="stoq-toolbar">
          <div className="stoq-toolbar__search" style={{ position: 'relative' }}>
            <input
              className="stoq-input stoq-input--search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, phone, code..."
            />
          </div>
          <select className="stoq-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ width: 140 }}>
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          {!isSmallScreen && (
            <div className="stoq-segment" style={{ marginLeft: 'auto' }}>
              <button data-active={viewMode === 'table' ? 'true' : undefined} onClick={() => setViewMode('table')} title="Table"><Table2 size={13} /></button>
              <button data-active={viewMode === 'grid' ? 'true' : undefined} onClick={() => setViewMode('grid')} title="Grid"><LayoutGrid size={13} /></button>
              <button data-active={viewMode === 'list' ? 'true' : undefined} onClick={() => setViewMode('list')} title="List"><List size={13} /></button>
            </div>
          )}
        </div>

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="table-wrap">
            <table className="stoq-tbl">
              <thead>
                <tr>
                  <th className="no-sort">Supplier</th>
                  <th className="no-sort">Contact</th>
                  <th className="no-sort">Location</th>
                  <th className="no-sort">Status</th>
                  <th className="no-sort">Stock</th>
                  <th className="no-sort col-actions" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="stoq-empty">Loading...</td></tr>
                ) : suppliers.length === 0 ? (
                  <tr><td colSpan={6} className="stoq-empty">No suppliers found</td></tr>
                ) : suppliers.map(s => (
                  <tr key={s.id} onClick={() => navigate(path(`/suppliers/${s.id}`))}>
                    <td>
                      <span className="cell-stack__main">{s.name}</span>
                      <span className="cell-stack__sub">{s.code}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {s.contactPerson && <span style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><User size={10} />{s.contactPerson}</span>}
                        {s.email && <span style={{ fontSize: 11, color: 'var(--fg-subtle)', display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={10} />{s.email}</span>}
                        {s.phone && <span style={{ fontSize: 11, color: 'var(--fg-subtle)', display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={10} />{s.phone}</span>}
                      </div>
                    </td>
                    <td style={{ color: 'var(--fg-muted)', fontSize: 11 }}>{[s.city, s.country].filter(Boolean).join(', ') || '-'}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td className="num-cell">{s._count?.stockSuppliers ?? 0}</td>
                    <td className="col-actions" onClick={e => e.stopPropagation()}>
                      <div className="stoq-btn-group" style={{ justifyContent: 'flex-end' }}>
                        <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="View" onClick={() => navigate(path(`/suppliers/${s.id}`))}><Eye size={13} /></button>
                        <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="Edit" onClick={() => navigate(path(`/suppliers/edit/${s.id}`))}><Edit2 size={13} /></button>
                        <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="Delete" style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(s)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--gap-card)' }}>
            {loading ? <div className="stoq-empty" style={{ gridColumn: '1/-1' }}>Loading...</div>
              : suppliers.length === 0 ? <div className="stoq-empty" style={{ gridColumn: '1/-1' }}>No suppliers found</div>
              : suppliers.map(s => (
              <div key={s.id} style={{ background: 'var(--bg-sunk)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-subtle)', marginTop: 2 }}>{s.code}</div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--fg-muted)', flex: 1 }}>
                  {s.contactPerson && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><User size={11} />{s.contactPerson}</span>}
                  {s.email && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Mail size={11} />{s.email}</span>}
                  {s.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Phone size={11} />{s.phone}</span>}
                  {(s.city || s.country) && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><MapPin size={11} />{[s.city, s.country].filter(Boolean).join(', ')}</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', display: 'flex', alignItems: 'center', gap: 5 }}><Package size={11} />{s._count?.stockSuppliers ?? 0} stock items</div>
                <div style={{ display: 'flex', gap: 6, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <button className="stoq-btn stoq-btn--sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate(path(`/suppliers/${s.id}`))}>Details</button>
                  <button className="stoq-btn stoq-btn--sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate(path(`/suppliers/edit/${s.id}`))}>Edit</button>
                  <button className="stoq-btn stoq-btn--sm stoq-btn--icon" style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(s)}><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {loading ? <div className="stoq-empty">Loading...</div>
              : suppliers.length === 0 ? <div className="stoq-empty">No suppliers found</div>
              : suppliers.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < suppliers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', background: 'var(--accent-soft)', color: 'var(--accent-soft-fg)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Truck size={14} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</span>
                  <span style={{ marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-subtle)' }}>{s.code}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{s.phone || '-'}</span>
                <StatusBadge status={s.status} />
                <div className="stoq-btn-group">
                  <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" onClick={() => navigate(path(`/suppliers/${s.id}`))}><Eye size={13} /></button>
                  <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" onClick={() => navigate(path(`/suppliers/edit/${s.id}`))}><Edit2 size={13} /></button>
                  <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(s)}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Page {page} of {totalPages} - {total} total</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="stoq-btn stoq-btn--icon" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ opacity: page <= 1 ? 0.4 : 1 }}><ChevronLeft size={14} /></button>
              <button className="stoq-btn stoq-btn--icon" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ opacity: page >= totalPages ? 0.4 : 1 }}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="stoq-modal-backdrop">
          <div className="stoq-modal" style={{ maxWidth: 400 }}>
            <div className="stoq-modal__head">
              <div>
                <div className="stoq-modal__title">Delete Supplier</div>
                <div className="stoq-modal__sub">This action cannot be undone.</div>
              </div>
              <button className="stoq-btn stoq-btn--ghost stoq-btn--icon" onClick={() => setDeleteTarget(null)}>X</button>
            </div>
            <div className="stoq-modal__body">
              <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Delete <strong style={{ color: 'var(--fg)' }}>{deleteTarget.name}</strong>?</p>
            </div>
            <div className="stoq-modal__foot">
              <button className="stoq-btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="stoq-btn stoq-btn--primary" style={{ background: 'var(--danger)', borderColor: 'transparent' }} onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


