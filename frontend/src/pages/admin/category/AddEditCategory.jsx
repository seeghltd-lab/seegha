import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, AlignLeft, Layers, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import categoryService from '../../../services/categoryService';
import { useRole } from '../../../hooks/useRole';

export default function AddEditCategory() {
  const navigate = useNavigate();
  const { path } = useRole();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    categoryService.getAll().then(data => {
      const lists = Array.isArray(data) ? data : data.categories || [];
      const item = lists.find(c => c.id === id);
      if (item) setForm({ name: item.name, description: item.description || '' });
      else throw new Error('Not found');
    }).catch(() => showToast('Failed to load category', 'error'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Category name is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (isEdit) {
        await categoryService.update(id, form);
        showToast('Category updated successfully');
      } else {
        await categoryService.create(form);
        showToast('Category created successfully');
      }
      setTimeout(() => navigate(path('/categories')), 900);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save category', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: 10, color: 'var(--fg-subtle)' }}>
      <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: 12 }}>Loading...</span>
    </div>
  );

  return (
    <div style={{ padding: '20px 24px 40px' }}>
      {toast && (
        <div className={`stoq-toast ${toast.type === 'error' ? 'stoq-toast--error' : 'stoq-toast--success'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'error' ? <AlertCircle size={13} /> : <CheckCircle size={13} />}
          {toast.message}
        </div>
      )}

      {/* Page head */}
      <div className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-btn" onClick={() => navigate(path('/categories'))}>
            <ArrowLeft size={14} />
          </button>
          <div>
            <h1>{isEdit ? 'Edit Category' : 'New Category'}</h1>
            <div className="page-head__sub">Manage inventory classification</div>
          </div>
        </div>
        <div className="page-head__actions">
          <button type="button" className="stoq-btn" onClick={() => navigate(path('/categories'))}>Cancel</button>
          <button type="button" className="stoq-btn stoq-btn--primary" disabled={submitting}
            onClick={handleSubmit} style={{ opacity: submitting ? 0.6 : 1 }}>
            {submitting
              ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
              : <><Save size={13} /> {isEdit ? 'Save Changes' : 'Create Category'}</>}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14, alignItems: 'start' }}>
        {/* Main panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="stoq-panel">
            <div className="stoq-panel__head">
              <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__icon"><Layers size={13} /></span>
                Category Details
              </span>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="stoq-field">
                <label className="stoq-field__label">
                  Category Name <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Layers size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
                  <input
                    className="stoq-input"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Electronics, Raw Materials"
                    style={{ paddingLeft: 30, ...(errors.name ? { borderColor: 'var(--danger)' } : {}) }}
                  />
                </div>
                {errors.name && (
                  <span style={{ fontSize: 11, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle size={11} /> {errors.name}
                  </span>
                )}
              </div>

              <div className="stoq-field">
                <label className="stoq-field__label">Description <span style={{ color: 'var(--fg-subtle)', fontWeight: 400 }}>(optional)</span></label>
                <div style={{ position: 'relative' }}>
                  <AlignLeft size={13} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
                  <textarea
                    className="stoq-input"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={5}
                    placeholder="Brief description of what this category covers..."
                    style={{ height: 'auto', padding: '8px 10px 8px 30px', resize: 'vertical', lineHeight: 1.6 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="stoq-panel" style={{ background: 'var(--bg-sunk)' }}>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 8 }}>
              About Categories
            </div>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
              Categories help organise stock items for easier filtering and reporting. Each stock item can belong to one category.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

