import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Layers, Package, ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react';
import categoryService from '../../../services/categoryService';
import { useRole } from '../../../hooks/useRole';
import Sparkline, { genSpark } from '../../../components/Sparkline';
import { useViewMode } from '../../../hooks/useViewMode';

const PAGE_SIZE = 15;

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`stoq-toast ${toast.type === 'error' ? 'stoq-toast--error' : 'stoq-toast--success'}`}>{toast.msg}</div>;
}

export default function CategoryPage() {
  const navigate = useNavigate();
  const { path } = useRole();
  const [categories, setCategories] = useState([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(false);
  const [page, setPage]             = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const [toast, setToast]           = useState(null);
  const [viewMode, setViewMode, isSmallScreen] = useViewMode('categories');

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };

  const load = async () => {
    setLoading(true);
    try {
      const data = await categoryService.getAll();
      setCategories(Array.isArray(data) ? data : data.categories || []);
    } catch { showToast('Failed to load categories', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await categoryService.remove(deleteTarget.id);
      showToast('Category deleted successfully');
      setDeleteTarget(null);
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Delete failed', 'error'); }
    finally { setDeleting(false); }
  };

  const filtered = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const totalItems = categories.reduce((s, c) => s + (c._count?.stocks ?? 0), 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <Toast toast={toast} />

      {/* Page Head */}
      <div className="page-head">
        <div>
          <h1>Categories</h1>
          <div className="page-head__sub">Manage and organize your inventory classifications</div>
        </div>
        <div className="page-head__actions">
          <button className="stoq-btn stoq-btn--primary" onClick={() => navigate(path('/categories/add'))}>
            <Plus size={13} /> Add Category
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="kpi-grid kpi-grid--3" style={{ marginBottom: 'var(--gap-card)' }}>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><Layers size={12} /></span>Total categories</div>
          <div className="kpi__value">{categories.length}</div>
          <div className="kpi__foot"><span>inventory classifications</span></div>
          <Sparkline data={genSpark(2, 14, 0.2)} />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><Package size={12} /></span>Total linked items</div>
          <div className="kpi__value">{totalItems}</div>
          <div className="kpi__foot"><span>across all categories</span><span className="kpi__delta kpi__delta--up">+{Math.max(1, Math.round(totalItems * 0.05))}</span></div>
          <Sparkline data={genSpark(6, 14, 0.4)} />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><Layers size={12} /></span>Showing</div>
          <div className="kpi__value">{filtered.length}</div>
          <div className="kpi__foot"><span>of {categories.length} categories</span></div>
          <Sparkline data={genSpark(4, 14, 0)} />
        </div>
      </div>

      {/* Panel */}
      <div className="stoq-panel">
        {/* Toolbar */}
        <div className="stoq-toolbar">
          <div className="stoq-toolbar__search">
            <input
              className="stoq-input stoq-input--search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search categories..."
            />
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{filtered.length} categories</span>
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
                  <th className="no-sort">Category Details</th>
                  <th className="no-sort">Linked Stock</th>
                  <th className="no-sort col-actions" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="stoq-empty">Loading categories...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={3} className="stoq-empty">No categories found</td></tr>
                ) : paged.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'var(--accent-soft)', color: 'var(--accent-soft-fg)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                          <Layers size={15} />
                        </div>
                        <div>
                          <span className="cell-stack__main">{c.name}</span>
                          <span className="cell-stack__sub">{c.description || 'No description provided.'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-muted)' }}>
                        <Package size={12} />
                        <span style={{ fontWeight: 700, color: 'var(--fg)' }}>{c._count?.stocks ?? 0}</span> items
                      </span>
                    </td>
                    <td className="col-actions" style={{ textAlign: 'right' }}>
                      <div className="stoq-btn-group" style={{ justifyContent: 'flex-end' }}>
                        <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="Edit" onClick={() => navigate(`/admin/categories/edit/${c.id}`)}><Edit2 size={13} /></button>
                        <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="Delete" style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(c)}><Trash2 size={13} /></button>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, padding: 14 }}>
            {loading ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 32, color: 'var(--fg-subtle)', fontSize: 12 }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 32, color: 'var(--fg-subtle)', fontSize: 12 }}>No categories found</div>
            ) : paged.map(c => (
              <div key={c.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 14, background: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--accent-soft)', color: 'var(--accent-soft-fg)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Layers size={16} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-subtle)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Package size={10} /> {c._count?.stocks ?? 0} items
                    </div>
                  </div>
                </div>
                {c.description && <div style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.4 }}>{c.description}</div>}
                <div style={{ display: 'flex', gap: 4, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                  <button className="stoq-btn stoq-btn--ghost stoq-btn--sm" style={{ flex: 1 }} onClick={() => navigate(`/admin/categories/edit/${c.id}`)}><Edit2 size={12} /> Edit</button>
                  <button className="stoq-btn stoq-btn--ghost stoq-btn--sm" style={{ flex: 1, color: 'var(--danger)' }} onClick={() => setDeleteTarget(c)}><Trash2 size={12} /> Del</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Page {page} of {totalPages} - {filtered.length} total</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="stoq-btn stoq-btn--icon" disabled={page <= 1} style={{ opacity: page <= 1 ? 0.4 : 1 }} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
              <button className="stoq-btn stoq-btn--icon" disabled={page >= totalPages} style={{ opacity: page >= totalPages ? 0.4 : 1 }} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
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
                <div className="stoq-modal__title">Delete Category</div>
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

