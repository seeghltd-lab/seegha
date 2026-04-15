import React, { useState, useEffect } from 'react';
import {
  Shield, Users, Plus, Trash2, UserPlus, X, Search,
  Loader2, Edit2, CheckCircle, AlertCircle,
} from 'lucide-react';
import permissionService from '../../services/permissionService';
import employeeService from '../../services/employeeService';
import { useSocketEvent } from '../../context/SocketContext';

// All permission keys available in this system
const PERMISSION_OPTIONS = [
  { key: 'stock_management',      label: 'Stock Management',      desc: 'Create, edit, and delete stock items' },
  { key: 'requisition_management', label: 'Requisition Management', desc: 'Submit and track requisition requests' },
  { key: 'supplier_management',   label: 'Supplier Management',   desc: 'Manage supplier records' },
  { key: 'category_management',   label: 'Category Management',   desc: 'Manage stock categories' },
  { key: 'site_management',       label: 'Site Management',       desc: 'View and manage construction sites' },
  { key: 'reports_view',          label: 'Reports & Analytics',   desc: 'Access dashboard reports and analytics' },
];

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed top-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
      {toast.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
      {toast.msg}
    </div>
  );
}

export default function PermissionManagement() {
  const [tab, setTab] = useState('permissions'); // 'permissions' | 'employees'
  const [permissions, setPermissions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  // Modal state
  const [createModal, setCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);   // permission object
  const [deleteTarget, setDeleteTarget] = useState(null); // permission object
  const [assignModal, setAssignModal] = useState(null);  // { permission?, employee? }

  // Form fields
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [acting, setActing] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  // ── Data loaders ──────────────────────────────────────────────────────

  const loadPermissions = async () => {
    try {
      const data = await permissionService.getAll();
      setPermissions(data);
    } catch {
      showToast('Failed to load permissions', 'error');
    }
  };

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await employeeService.getAllEmployees();
      // Load each employee's permissions in parallel
      const withPerms = await Promise.all(
        data.map(async (emp) => {
          try {
            const perms = await permissionService.getByEmployee(emp.id);
            return { ...emp, permissions: perms };
          } catch {
            return { ...emp, permissions: [] };
          }
        })
      );
      setEmployees(withPerms);
    } catch {
      showToast('Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
    loadEmployees();
  }, []);

  // Real-time: refresh employee permission badges when any assign/revoke happens
  useSocketEvent('permissionAssigned', () => loadEmployees());
  useSocketEvent('permissionRemoved', () => loadEmployees());

  // Which permission keys haven't been created yet
  const availableKeys = PERMISSION_OPTIONS.filter(
    (opt) => !permissions.some((p) => p.name === opt.key)
  );

  // ── CRUD handlers ─────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!formName) { showToast('Select a permission type', 'error'); return; }
    setActing(true);
    try {
      const p = await permissionService.create({ name: formName, description: formDesc.trim() || undefined });
      setPermissions((prev) => [p, ...prev]);
      showToast('Permission created');
      setCreateModal(false);
      setFormName('');
      setFormDesc('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create permission', 'error');
    } finally {
      setActing(false);
    }
  };

  const handleUpdate = async () => {
    if (!formName.trim()) { showToast('Name is required', 'error'); return; }
    setActing(true);
    try {
      const updated = await permissionService.update(editTarget.id, {
        name: formName.trim(),
        description: formDesc.trim() || undefined,
      });
      setPermissions((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      showToast('Permission updated');
      setEditTarget(null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    } finally {
      setActing(false);
    }
  };

  const handleDelete = async () => {
    setActing(true);
    try {
      await permissionService.remove(deleteTarget.id);
      setPermissions((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      // Strip that permission from all employees in state
      setEmployees((prev) =>
        prev.map((emp) => ({
          ...emp,
          permissions: emp.permissions?.filter((ep) => ep.permissionId !== deleteTarget.id),
        }))
      );
      showToast('Permission deleted');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setActing(false);
    }
  };

  const handleAssign = async (employeeId, permissionId) => {
    setActing(true);
    try {
      await permissionService.assign(employeeId, permissionId);
      showToast('Permission assigned');
      setAssignModal(null);
      await loadEmployees();
    } catch (err) {
      showToast(err.response?.data?.message || 'Already assigned or failed', 'error');
    } finally {
      setActing(false);
    }
  };

  const handleRevoke = async (employeeId, permissionId) => {
    try {
      await permissionService.revoke(employeeId, permissionId);
      setEmployees((prev) =>
        prev.map((emp) => {
          if (emp.id !== employeeId) return emp;
          return { ...emp, permissions: emp.permissions.filter((ep) => ep.permissionId !== permissionId) };
        })
      );
      showToast('Permission removed');
    } catch (err) {
      showToast(err.response?.data?.message || 'Remove failed', 'error');
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────

  const openEdit = (p) => {
    setEditTarget(p);
    setFormName(p.name);
    setFormDesc(p.description || '');
  };

  const filteredEmployees = employees.filter((emp) => {
    const full = `${emp.firstName} ${emp.lastName} ${emp.email} ${emp.position}`.toLowerCase();
    return full.includes(search.toLowerCase());
  });

  const permLabel = (name) =>
    PERMISSION_OPTIONS.find((o) => o.key === name)?.label || name.replace(/_/g, ' ');

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5">
      <Toast toast={toast} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <Shield size={22} className="text-primary" /> Permission Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Control what employees can access within the system.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex border-b border-slate-100">
          {[
            { key: 'permissions', icon: Shield, label: `Permissions (${permissions.length})` },
            { key: 'employees',   icon: Users,  label: `Employees (${employees.length})` },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all -mb-px ${
                tab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* ── PERMISSIONS TAB ─────────────────────────────── */}
        {tab === 'permissions' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-semibold text-slate-600">All system permissions</p>
              {availableKeys.length > 0 && (
                <button
                  onClick={() => { setCreateModal(true); setFormName(''); setFormDesc(''); }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 shadow"
                >
                  <Plus size={15} /> Add Permission
                </button>
              )}
            </div>

            {permissions.length === 0 ? (
              <div className="text-center py-16">
                <Shield size={48} className="mx-auto text-slate-200 mb-3" />
                <p className="font-semibold text-slate-400">No permissions created yet</p>
                <button
                  onClick={() => setCreateModal(true)}
                  className="mt-3 text-sm font-bold text-primary hover:underline"
                >
                  Create your first permission
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {permissions.map((p) => {
                  const opt = PERMISSION_OPTIONS.find((o) => o.key === p.name);
                  return (
                    <div key={p.id} className="border border-slate-100 rounded-2xl p-5 hover:shadow-md transition group">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Shield size={15} className="text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{permLabel(p.name)}</p>
                            <p className="text-xs font-mono text-slate-400">{p.name}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => openEdit(p)}
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-primary">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => setDeleteTarget(p)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {(p.description || opt?.desc) && (
                        <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                          {p.description || opt?.desc}
                        </p>
                      )}

                      <button
                        onClick={() => setAssignModal({ permission: p })}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-primary/20 text-primary text-xs font-bold hover:bg-primary/5 transition"
                      >
                        <UserPlus size={13} /> Assign to Employee
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── EMPLOYEES TAB ───────────────────────────────── */}
        {tab === 'employees' && (
          <div className="p-6">
            <div className="mb-5">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or position..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={28} className="animate-spin text-primary" />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-16">
                <Users size={48} className="mx-auto text-slate-200 mb-3" />
                <p className="font-semibold text-slate-400">
                  {search ? 'No employees match your search' : 'No employees found'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEmployees.map((emp) => (
                  <div key={emp.id} className="border border-slate-100 rounded-2xl p-4 hover:shadow-sm transition">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-extrabold text-sm">
                          {emp.firstName?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{emp.email}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-400">{emp.position}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              emp.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {emp.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setAssignModal({ employee: emp })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/20 text-primary text-xs font-bold hover:bg-primary/5 transition"
                      >
                        <Plus size={13} /> Add Permission
                      </button>
                    </div>

                    {/* Permission badges */}
                    <div className="flex flex-wrap gap-2">
                      {emp.permissions?.length > 0 ? (
                        emp.permissions.map((ep) => (
                          <div
                            key={ep.id}
                            className="flex items-center gap-1.5 bg-primary/8 border border-primary/15 text-primary px-2.5 py-1 rounded-full text-xs font-semibold"
                          >
                            <Shield size={10} />
                            <span>{permLabel(ep.permission?.name)}</span>
                            <button
                              onClick={() => handleRevoke(emp.id, ep.permissionId)}
                              className="text-primary/50 hover:text-red-500 transition ml-0.5"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No permissions assigned</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CREATE MODAL ──────────────────────────────────── */}
      {createModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">Add Permission</h2>
              <button onClick={() => setCreateModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1.5 block">
                  Permission Type <span className="text-red-400">*</span>
                </label>
                <select
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">— Select a permission —</option>
                  {availableKeys.map((opt) => (
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </select>
                {formName && (
                  <p className="text-xs text-slate-400 mt-1">
                    {PERMISSION_OPTIONS.find((o) => o.key === formName)?.desc}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1.5 block">
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={3}
                  placeholder="Add a custom description..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setCreateModal(false)} disabled={acting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={acting || !formName}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                {acting ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : 'Create Permission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">Edit Permission</h2>
              <button onClick={() => setEditTarget(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Name</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Description</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditTarget(null)} disabled={acting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleUpdate} disabled={acting || !formName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                {acting ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ──────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Delete Permission</h2>
            <p className="text-sm text-slate-500 mb-2">
              Delete <strong className="text-slate-700">{permLabel(deleteTarget.name)}</strong>?
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-5">
              This will remove the permission from all employees who have it.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={acting}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={acting}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-60 flex items-center justify-center gap-2">
                {acting ? <><Loader2 size={13} className="animate-spin" /> Deleting...</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ASSIGN MODAL ──────────────────────────────────── */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">Assign Permission</h2>
              <button onClick={() => setAssignModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>

            {/* Show the locked side */}
            {assignModal.permission && (
              <div className="mb-4 p-3 bg-primary/5 border border-primary/15 rounded-xl flex items-center gap-2">
                <Shield size={15} className="text-primary" />
                <div>
                  <p className="text-sm font-bold text-primary">{permLabel(assignModal.permission.name)}</p>
                  {assignModal.permission.description && (
                    <p className="text-xs text-slate-500">{assignModal.permission.description}</p>
                  )}
                </div>
              </div>
            )}

            {assignModal.employee && (
              <div className="mb-4 p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {assignModal.employee.firstName?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {assignModal.employee.firstName} {assignModal.employee.lastName}
                  </p>
                  <p className="text-xs text-slate-500">{assignModal.employee.email} · {assignModal.employee.position}</p>
                </div>
              </div>
            )}

            {/* Dropdown for the other side */}
            <div className="mb-5">
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">
                {assignModal.permission ? 'Select Employee' : 'Select Permission'}
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                defaultValue=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) return;
                  if (assignModal.permission) {
                    handleAssign(id, assignModal.permission.id);
                  } else {
                    handleAssign(assignModal.employee.id, id);
                  }
                }}
                disabled={acting}
              >
                <option value="">— {assignModal.permission ? 'Choose an employee' : 'Choose a permission'} —</option>

                {assignModal.permission &&
                  employees.map((emp) => {
                    const already = emp.permissions?.some((ep) => ep.permissionId === assignModal.permission.id);
                    return (
                      <option key={emp.id} value={emp.id} disabled={already}>
                        {emp.firstName} {emp.lastName} — {emp.position}
                        {already ? ' (already assigned)' : ''}
                      </option>
                    );
                  })}

                {assignModal.employee &&
                  permissions.map((perm) => {
                    const already = assignModal.employee.permissions?.some((ep) => ep.permissionId === perm.id);
                    return (
                      <option key={perm.id} value={perm.id} disabled={already}>
                        {permLabel(perm.name)}
                        {already ? ' (already assigned)' : ''}
                      </option>
                    );
                  })}
              </select>
            </div>

            <button onClick={() => setAssignModal(null)} disabled={acting}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
