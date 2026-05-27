import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, AlertCircle, CheckCircle, RefreshCw, Users } from 'lucide-react';
import siteService from '../../../services/siteService';
import workerCategoryService from '../../../services/workerCategoryService';
import { useRole } from '../../../hooks/useRole';

// ── Category Combobox ─────────────────────────────────────────────────────────

function CategoryCombobox({ categories, value, label, onChange, onCreateCategory, error }) {
  const [query, setQuery] = useState(label || '');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);
  const ref = useRef(null);

  useEffect(() => { setQuery(label || ''); }, [label]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openDropdown = () => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen(true);
  };

  const filtered = categories.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
  const showCreate = query.trim().length > 1 && !categories.some(c => c.name.toLowerCase() === query.trim().toLowerCase());

  const select = (cat) => { onChange(cat.id, cat.name); setQuery(cat.name); setOpen(false); };

  const handleCreate = async () => {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    try { const created = await onCreateCategory(name); select(created); }
    finally { setCreating(false); }
  };

  return (
    <div ref={ref}>
      <input
        ref={inputRef}
        className="stoq-input"
        value={query}
        placeholder="Search or create category…"
        autoComplete="off"
        onChange={e => { setQuery(e.target.value); openDropdown(); if (!e.target.value) onChange('', ''); }}
        onFocus={openDropdown}
        style={error ? { borderColor: 'var(--danger)' } : {}}
      />
      {open && (filtered.length > 0 || showCreate) && (
        <div style={{
          position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999,
          background: 'var(--bg-elev)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {filtered.map(c => (
            <div key={c.id}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, background: c.id === value ? 'var(--bg-sunk)' : 'transparent' }}
              onMouseDown={e => { e.preventDefault(); select(c); }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-sunk)'}
              onMouseLeave={e => e.currentTarget.style.background = c.id === value ? 'var(--bg-sunk)' : 'transparent'}
            >
              {c.name}
            </div>
          ))}
          {showCreate && (
            <div
              style={{ padding: '8px 12px', cursor: creating ? 'default' : 'pointer', fontSize: 13, color: 'var(--accent)', fontWeight: 600, borderTop: filtered.length > 0 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 6 }}
              onMouseDown={e => { e.preventDefault(); handleCreate(); }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-sunk)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Plus size={13} /> {creating ? 'Creating…' : `Create "${query.trim()}"`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);
const emptyRow = () => ({ _key: Date.now() + Math.random(), categoryId: '', categoryLabel: '', workerCount: '', date: today(), notes: '', error: null });

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`stoq-toast ${toast.type === 'error' ? 'stoq-toast--error' : 'stoq-toast--success'}`}
      style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {toast.type === 'error' ? <AlertCircle size={13} /> : <CheckCircle size={13} />}
      {toast.msg}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SiteRecordWorkers() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const { path } = useRole();

  const [site, setSite] = useState(null);
  const [categories, setCategories] = useState([]);
  const [rows, setRows] = useState([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    siteService.getOne(siteId).then(setSite).catch(() => navigate(-1));
    workerCategoryService.getAll().then(setCategories).catch(() => {});
  }, [siteId]);

  const updateRow = (key, patch) => setRows(prev => prev.map(r => r._key === key ? { ...r, ...patch } : r));

  const handleCreateCategory = async (name) => {
    const created = await workerCategoryService.create(name);
    setCategories(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all rows
    let hasError = false;
    const validated = rows.map(r => {
      if (!r.categoryId) { hasError = true; return { ...r, error: 'category' }; }
      if (!r.workerCount || Number(r.workerCount) < 1) { hasError = true; return { ...r, error: 'count' }; }
      return { ...r, error: null };
    });
    setRows(validated);
    if (hasError) return;

    setSubmitting(true);
    const failed = [];
    for (const r of validated) {
      try {
        await siteService.addWorkerRecord(siteId, {
          workerCount: Number(r.workerCount),
          date: r.date,
          notes: r.notes || undefined,
          categoryId: r.categoryId,
        });
      } catch (err) {
        failed.push({ ...r, error: err.response?.data?.message || 'failed' });
      }
    }
    setSubmitting(false);

    if (failed.length === 0) {
      navigate(path(`/sites/${siteId}`) + '?tab=workers');
    } else {
      setRows(prev => prev.map(r => failed.find(f => f._key === r._key) || r));
      showToast(`${failed.length} row${failed.length > 1 ? 's' : ''} failed — fix and resubmit`, 'error');
    }
  };

  if (!site) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 10, color: 'var(--fg-subtle)' }}>
        <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 24px 60px' }}>
      <Toast toast={toast} />

      {/* Header */}
      <div className="page-head" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-btn" onClick={() => navigate(path(`/sites/${siteId}`) + '?tab=workers')}>
            <ArrowLeft size={14} />
          </button>
          <div>
            <div className="stoq-crumbs">
              <span>Sites</span>
              <span className="stoq-crumbs__sep">/</span>
              <span>{site.name}</span>
              <span className="stoq-crumbs__sep">/</span>
              <span className="stoq-crumbs__current">Record Workers</span>
            </div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={18} /> Record Daily Workers
            </h1>
            <div className="page-head__sub">{site.name} — {site.location}</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="stoq-panel">
          <div className="stoq-panel__head">
            <span className="stoq-panel__title">Worker Entries</span>
            <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Each row is one category entry for the day</span>
          </div>

          {/* Batch table */}
          <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ background: 'var(--bg-sunk)', borderBottom: '1px solid var(--border)' }}>
                  {['Category *', 'Workers *', 'Date', 'Notes', ''].map((h, i) => (
                    <th key={i} style={{
                      padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-subtle)',
                      width: i === 4 ? 40 : i === 1 ? '12%' : i === 2 ? '16%' : undefined,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._key} style={{ borderBottom: '1px solid var(--border)' }}>
                    {/* Category */}
                    <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                      <CategoryCombobox
                        categories={categories}
                        value={row.categoryId}
                        label={row.categoryLabel}
                        error={row.error === 'category'}
                        onChange={(id, name) => updateRow(row._key, { categoryId: id, categoryLabel: name, error: null })}
                        onCreateCategory={handleCreateCategory}
                      />
                      {row.error === 'category' && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Category is required</div>}
                    </td>
                    {/* Count */}
                    <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                      <input
                        type="number" min="1" className="stoq-input"
                        value={row.workerCount}
                        placeholder="0"
                        onChange={e => updateRow(row._key, { workerCount: e.target.value, error: null })}
                        style={row.error === 'count' ? { borderColor: 'var(--danger)' } : {}}
                      />
                      {row.error === 'count' && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Enter a valid count</div>}
                      {typeof row.error === 'string' && row.error !== 'category' && row.error !== 'count' && (
                        <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>{row.error}</div>
                      )}
                    </td>
                    {/* Date */}
                    <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                      <input
                        type="date" className="stoq-input"
                        value={row.date}
                        onChange={e => updateRow(row._key, { date: e.target.value })}
                      />
                    </td>
                    {/* Notes */}
                    <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                      <input
                        className="stoq-input"
                        value={row.notes}
                        placeholder="Optional remark…"
                        onChange={e => updateRow(row._key, { notes: e.target.value })}
                      />
                    </td>
                    {/* Remove row */}
                    <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                      {rows.length > 1 && (
                        <button type="button" className="icon-btn" style={{ color: 'var(--danger)' }}
                          onClick={() => setRows(prev => prev.filter(r => r._key !== row._key))}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer actions */}
          <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', gap: 8 }}>
            <button type="button" className="stoq-btn stoq-btn--ghost"
              onClick={() => setRows(prev => [...prev, emptyRow()])}>
              <Plus size={13} /> Add Row
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="stoq-btn"
                onClick={() => navigate(path(`/sites/${siteId}`) + '?tab=workers')}>
                Cancel
              </button>
              <button type="submit" className="stoq-btn stoq-btn--primary"
                disabled={submitting} style={{ opacity: submitting ? 0.65 : 1 }}>
                {submitting
                  ? <><RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…</>
                  : <><Save size={13} /> Submit {rows.length > 1 ? `All (${rows.length})` : ''}</>}
              </button>
            </div>
          </div>
        </div>
      </form>

      <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
