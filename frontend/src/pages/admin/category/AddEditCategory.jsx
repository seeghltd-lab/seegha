import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, AlignLeft, Layers } from 'lucide-react';
import categoryService from '../../../services/categoryService';

export default function AddEditCategory() {
  const navigate = useNavigate();
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
      // categoryService doesn't have a getOne in this setup, so we find it from getAll
      const lists = Array.isArray(data) ? data : data.categories || [];
      const item = lists.find(c => c.id === id);
      if (item) setForm({ name: item.name, description: item.description || '' });
      else throw new Error("Category Not found");
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
      setTimeout(() => navigate('/admin/categories'), 900);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save category', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field) => 
    `w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium transition-shadow ${errors[field] ? 'border-red-300' : 'border-slate-200'}`;

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold">Loading...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/categories')} className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors bg-white shadow-sm">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">{isEdit ? 'Edit Category' : 'Create Category'}</h1>
          <p className="text-sm font-medium text-slate-500 tracking-wide mt-0.5">Manage inventory classification fields.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Detail Input Mapping */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Category Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <Layers size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={inputClass('name')} placeholder="e.g. Electronics, Raw Materials" />
            </div>
            {errors.name && <p className="text-xs text-red-500 mt-1 font-bold">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Description <span className="text-slate-400 font-normal">(Optional)</span></label>
            <div className="relative">
              <AlignLeft size={18} className="absolute left-3.5 top-4 text-slate-400" />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={5} className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-medium text-slate-700" 
                placeholder="Write a brief category purpose definition..." />
            </div>
          </div>
        </div>

        {/* Action Tray */}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate('/admin/categories')}
            className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-colors shadow-sm">
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-white text-sm font-black hover:opacity-90 disabled:opacity-60 shadow-md transition-all active:scale-95">
            <Save size={18} />
            {submitting ? 'Saving...' : 'Save Category'}
          </button>
        </div>

      </form>
    </div>
  );
}
