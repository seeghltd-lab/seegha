import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Edit2, Trash2, LayoutGrid, List, Table2,
  ChevronLeft, ChevronRight, Truck, CheckCircle, XCircle,
  AlertCircle, Phone, Mail, MapPin, User, Package,
} from 'lucide-react';
import supplierService from '../../services/supplierService';

const PAGE_SIZE = 10;

const STATUS_CONFIG = {
  ACTIVE:    { label: 'Active',    color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  INACTIVE:  { label: 'Inactive',  color: 'bg-slate-100 text-slate-500',    icon: XCircle },
  SUSPENDED: { label: 'Suspended', color: 'bg-red-100 text-red-600',        icon: AlertCircle },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.INACTIVE;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

export default function SupplierPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('table');
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
      const data = await supplierService.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
        page, limit: PAGE_SIZE,
      });
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
    <div className="p-6 space-y-5">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Suppliers</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} total · {activeCount} active on this page</p>
        </div>
        <button onClick={() => navigate('/admin/suppliers/add')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 shadow">
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, code..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <div className="flex border border-slate-200 rounded-xl overflow-hidden">
          {[['table', Table2], ['grid', LayoutGrid], ['list', List]].map(([m, Icon]) => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`p-2 ${viewMode === m ? 'bg-primary text-white' : 'hover:bg-slate-50 text-slate-500'}`}>
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Supplier</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Contact</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Location</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Stock</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">Loading...</td></tr>
              ) : suppliers.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">No suppliers found</td></tr>
              ) : suppliers.map(s => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{s.code}</p>
                  </td>
                  <td className="px-5 py-4 space-y-0.5">
                    {s.contactPerson && <p className="flex items-center gap-1 text-slate-600 text-xs"><User size={11}/>{s.contactPerson}</p>}
                    {s.email && <p className="flex items-center gap-1 text-slate-400 text-xs"><Mail size={11}/>{s.email}</p>}
                    {s.phone && <p className="flex items-center gap-1 text-slate-400 text-xs"><Phone size={11}/>{s.phone}</p>}
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-xs">{[s.city, s.country].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-5 py-4"><StatusBadge status={s.status} /></td>
                  <td className="px-5 py-4 text-slate-600">{s._count?.stocks ?? 0}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => navigate(`/admin/suppliers/edit/${s.id}`)}
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-primary"><Edit2 size={14}/></button>
                      <button onClick={() => setDeleteTarget(s)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? <div className="col-span-full text-center py-12 text-slate-400">Loading...</div>
            : suppliers.length === 0 ? <div className="col-span-full text-center py-12 text-slate-400">No suppliers found</div>
            : suppliers.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{s.code}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>
              <div className="space-y-1 text-sm text-slate-500 flex-1">
                {s.contactPerson && <p className="flex items-center gap-1.5"><User size={13}/>{s.contactPerson}</p>}
                {s.email && <p className="flex items-center gap-1.5"><Mail size={13}/>{s.email}</p>}
                {s.phone && <p className="flex items-center gap-1.5"><Phone size={13}/>{s.phone}</p>}
                {(s.city || s.country) && <p className="flex items-center gap-1.5"><MapPin size={13}/>{[s.city,s.country].filter(Boolean).join(', ')}</p>}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Package size={12}/>{s._count?.stocks ?? 0} stock items
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button onClick={() => navigate(`/admin/suppliers/edit/${s.id}`)}
                  className="flex-1 py-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5">Edit</button>
                <button onClick={() => setDeleteTarget(s)}
                  className="flex-1 py-1.5 text-xs font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {loading ? <div className="text-center py-12 text-slate-400">Loading...</div>
            : suppliers.length === 0 ? <div className="text-center py-12 text-slate-400">No suppliers found</div>
            : suppliers.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-3 flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <Truck size={15}/>
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-slate-800">{s.name}</span>
                <span className="ml-2 text-xs text-slate-400 font-mono">{s.code}</span>
              </div>
              <p className="text-sm text-slate-500 hidden sm:block">{s.phone || '—'}</p>
              <StatusBadge status={s.status} />
              <div className="flex gap-1">
                <button onClick={() => navigate(`/admin/suppliers/edit/${s.id}`)}
                  className="p-1.5 rounded-lg hover:bg-primary/10 text-primary"><Edit2 size={14}/></button>
                <button onClick={() => setDeleteTarget(s)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {page} of {totalPages} · {total} total</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"><ChevronLeft size={16}/></button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"><ChevronRight size={16}/></button>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-500"/>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Delete Supplier</h2>
            <p className="text-sm text-slate-500 mb-6">Delete <strong>{deleteTarget.name}</strong>? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-60">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
