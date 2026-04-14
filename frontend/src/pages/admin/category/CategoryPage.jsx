import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, Layers, Package } from 'lucide-react';
import categoryService from '../../../services/categoryService';

export default function CategoryPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await categoryService.getAll();
      setCategories(Array.isArray(data) ? data : data.categories || []);
    } catch { 
      showToast('Failed to load categories', 'error'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await categoryService.remove(deleteTarget.id);
      showToast('Category deleted successfully');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    } finally { 
      setDeleting(false); 
    }
  };

  const filtered = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Product Categories</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage and organize your inventory classifications</p>
        </div>
        <button onClick={() => navigate('/admin/categories/add')}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-black tracking-wide hover:opacity-90 shadow-md transition-all active:scale-95">
          <Plus size={18} /> Add Category
        </button>
      </div>

      {/* Utilities */}
      <div className="flex items-center gap-4 bg-white p-2 border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="relative flex-1 flex items-center">
          <Search size={18} className="absolute left-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="w-full pl-12 pr-4 py-2 text-sm focus:outline-none placeholder-slate-400 font-medium" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/50 border-b border-slate-100 uppercase tracking-widest text-xs font-bold text-slate-500">
            <tr>
              <th className="text-left px-6 py-4">Category Details</th>
              <th className="text-left px-6 py-4">Linked Stock</th>
              <th className="text-right px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="text-center py-12 font-semibold text-slate-400">Loading categories...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-12 font-semibold text-slate-400">No categories found</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-500">
                      <Layers size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{c.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate max-w-md">{c.description || 'No description provided.'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 font-medium">
                  <div className="flex items-center gap-2">
                    <Package size={14} className="text-slate-400"/>
                    <span className="font-bold">{c._count?.stocks ?? 0}</span> items
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2 text-slate-400">
                    <button onClick={() => navigate(`/admin/categories/edit/${c.id}`)}
                      className="p-2 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                      <Edit2 size={16}/>
                    </button>
                    <button onClick={() => setDeleteTarget(c)}
                      className="p-2 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <Trash2 size={24} className="text-red-500"/>
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Delete Category</h2>
            <p className="text-sm text-slate-500 mb-8 px-4">
              Are you sure you want to delete <strong className="text-slate-700">{deleteTarget.name}</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold shadow-md hover:bg-red-600 focus:ring-4 focus:ring-red-500/20 disabled:opacity-60 transition-all">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
