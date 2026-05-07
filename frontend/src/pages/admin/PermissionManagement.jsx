import React, { useState, useEffect } from 'react';
import {
  Shield, Users, Plus, Trash2, UserPlus, X, Search,
  Loader2, Edit2, CheckCircle, AlertCircle,
} from 'lucide-react';
import permissionService from '../../services/permissionService';
import employeeService from '../../services/employeeService';
import { useSocketEvent } from '../../context/SocketContext';

const PERMISSION_OPTIONS = [
  { key: 'stock_management',    label: 'Stock Management',    desc: 'Create, edit, and delete stock items' },
  { key: 'create_requisition',  label: 'Create Requisition',  desc: 'Submit new requisition requests' },
  { key: 'approve_requisition', label: 'Approve Requisition', desc: 'Approve or reject pending requisitions' },
  { key: 'receive_requisition', label: 'Receive Requisition', desc: 'Record physical receipt of requisition items' },
  { key: 'supplier_management', label: 'Supplier Management', desc: 'Manage supplier records' },
  { key: 'category_management', label: 'Category Management', desc: 'Manage stock categories' },
  { key: 'site_management',     label: 'Site Management',     desc: 'View and manage construction sites' },
  { key: 'reports_view',        label: 'Reports & Analytics', desc: 'Access dashboard reports and analytics' },
  { key: 'record_direct_stock', label: 'Direct Stock Receipt',desc: 'Record items received at site without a prior requisition' },
];

const permLabel = (name) => PERMISSION_OPTIONS.find(o => o.key === name)?.label || name.replace(/_/g, ' ');

export default function PermissionManagement() {
  const [tab, setTab] = useState('permissions');
  const [permissions, setPermissions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  const [createModal, setCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [acting, setActing] = useState(false);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };

  const loadPermissions = async () => {
    try { setPermissions(await permissionService.getAll()); }
    catch { showToast('Failed to load permissions', 'error'); }
  };

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await employeeService.getAllEmployees();
      const withPerms = await Promise.all(data.map(async emp => {
        try { return { ...emp, permissions: await permissionService.getByEmployee(emp.id) }; }
        catch { return { ...emp, permissions: [] }; }
      }));
      setEmployees(withPerms);
    } catch { showToast('Failed to load employees', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPermissions(); loadEmployees(); }, []);
  useSocketEvent('permissionAssigned', () => loadEmployees());
  useSocketEvent('permissionRemoved', () => loadEmployees());

  const availableKeys = PERMISSION_OPTIONS.filter(opt => !permissions.some(p => p.name === opt.key));

  const handleCreate = async () => {
    if (!formName) { showToast('Select a permission type', 'error'); return; }
    setActing(true);
    try {
      const p = await permissionService.create({ name: formName, description: formDesc.trim() || undefined });
      setPermissions(prev => [p, ...prev]);
      showToast('Permission created');
      setCreateModal(false); setFormName(''); setFormDesc('');
    } catch (err) { showToast(err.response?.data?.message || 'Failed to create', 'error'); }
    finally { setActing(false); }
  };

  const handleUpdate = async () => {
    if (!formName.trim()) { showToast('Name is required', 'error'); return; }
    setActing(true);
    try {
      const updated = await permissionService.update(editTarget.id, { name: formName.trim(), description: formDesc.trim() || undefined });
      setPermissions(prev => prev.map(p => p.id === updated.id ? updated : p));
      showToast('Permission updated'); setEditTarget(null);
    } catch (err) { showToast(err.response?.data?.message || 'Update failed', 'error'); }
    finally { setActing(false); }
  };

  const handleDelete = async () => {
    setActing(true);
    try {
      await permissionService.remove(deleteTarget.id);
      setPermissions(prev => prev.filter(p => p.id !== deleteTarget.id));
      setEmployees(prev => prev.map(emp => ({ ...emp, permissions: emp.permissions?.filter(ep => ep.permissionId !== deleteTarget.id) })));
      showToast('Permission deleted'); setDeleteTarget(null);
    } catch (err) { showToast(err.response?.data?.message || 'Delete failed', 'error'); }
    finally { setActing(false); }
  };

  const handleAssign = async (employeeId, permissionId) => {
    setActing(true);
    try {
      await permissionService.assign(employeeId, permissionId);
      showToast('Permission assigned'); setAssignModal(null); await loadEmployees();
    } catch (err) { showToast(err.response?.data?.message || 'Already assigned or failed', 'error'); }
    finally { setActing(false); }
  };

  const handleRevoke = async (employeeId, permissionId) => {
    try {
      await permissionService.revoke(employeeId, permissionId);
      setEmployees(prev => prev.map(emp => emp.id !== employeeId ? emp : { ...emp, permissions: emp.permissions.filter(ep => ep.permissionId !== permissionId) }));
      showToast('Permission removed');
    } catch (err) { showToast(err.response?.data?.message || 'Remove failed', 'error'); }
  };

  const openEdit = (p) => { setEditTarget(p); setFormName(p.name); setFormDesc(p.description || ''); };
  const filteredEmployees = employees.filter(emp => `${emp.firstName} ${emp.lastName} ${emp.email} ${emp.position}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: '20px 24px 40px' }}>
      {toast && (
        <div className={`stoq-toast ${toast.type === 'error' ? 'stoq-toast--error' : 'stoq-toast--success'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'error' ? <AlertCircle size={13} /> : <CheckCircle size={13} />}
          {toast.msg}
        </div>
      )}

      <div className="page-head">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={16} style={{ color: 'var(--accent-soft-fg)' }} /> Permission Management
          </h1>
          <div className="page-head__sub">Control what employees can access within the system</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="stoq-tabs" style={{ marginBottom: 14 }}>
        {[
          { key: 'permissions', icon: Shield, label: `Permissions (${permissions.length})` },
          { key: 'employees', icon: Users, label: `Employees (${employees.length})` },
        ].map(({ key, icon: Icon, label }) => (
          <button key={key} className="stoq-tab" data-active={tab === key ? 'true' : 'false'} onClick={() => setTab(key)}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ── PERMISSIONS TAB ── */}
      {tab === 'permissions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>All system permissions</span>
            {availableKeys.length > 0 && (
              <button className="stoq-btn stoq-btn--primary" onClick={() => { setCreateModal(true); setFormName(''); setFormDesc(''); }}>
                <Plus size={13} /> Add Permission
              </button>
            )}
          </div>

          {permissions.length === 0 ? (
            <div className="stoq-empty">
              <Shield size={28} className="stoq-empty__icon" />
              <div className="stoq-empty__title">No permissions created yet</div>
              <button className="stoq-btn stoq-btn--primary" style={{ marginTop: 10 }} onClick={() => setCreateModal(true)}>
                Create first permission
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {permissions.map(p => {
                const opt = PERMISSION_OPTIONS.find(o => o.key === p.name);
                return (
                  <div key={p.id} className="stoq-panel" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="kpi__icon"><Shield size={13} /></span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>{permLabel(p.name)}</div>
                          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-subtle)' }}>{p.name}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button className="icon-btn" onClick={() => openEdit(p)}><Edit2 size={12} /></button>
                        <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(p)}><Trash2 size={12} /></button>
                      </div>
                    </div>
                    {(p.description || opt?.desc) && (
                      <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 10, lineHeight: 1.5 }}>{p.description || opt?.desc}</p>
                    )}
                    <button className="stoq-btn stoq-btn--sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setAssignModal({ permission: p })}>
                      <UserPlus size={12} /> Assign to Employee
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── EMPLOYEES TAB ── */}
      {tab === 'employees' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="stoq-toolbar">
            <div className="stoq-toolbar__search" style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
              <input className="stoq-input stoq-input--search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, or position…" />
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
              <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="stoq-empty">
              <Users size={28} className="stoq-empty__icon" />
              <div className="stoq-empty__title">{search ? 'No employees match your search' : 'No employees found'}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredEmployees.map(emp => (
                <div key={emp.id} className="stoq-panel" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--accent)', color: 'var(--accent-fg)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                        {emp.firstName?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{emp.firstName} {emp.lastName}</div>
                        <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{emp.email} · {emp.position}</div>
                        <span className={`stoq-badge ${emp.status === 'ACTIVE' ? 'stoq-badge--success' : 'stoq-badge'}`} style={{ marginTop: 4 }}>{emp.status}</span>
                      </div>
                    </div>
                    <button className="stoq-btn stoq-btn--sm" onClick={() => setAssignModal({ employee: emp })}>
                      <Plus size={12} /> Add Permission
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {emp.permissions?.length > 0 ? emp.permissions.map(ep => (
                      <div key={ep.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: 'var(--accent-soft)', borderRadius: 'var(--r-xs)', fontSize: 11, fontWeight: 600, color: 'var(--accent-soft-fg)' }}>
                        <Shield size={10} />
                        {permLabel(ep.permission?.name)}
                        <button onClick={() => handleRevoke(emp.id, ep.permissionId)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-soft-fg)', opacity: 0.6, padding: 0, lineHeight: 1, display: 'flex' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--accent-soft-fg)'}>
                          <X size={10} />
                        </button>
                      </div>
                    )) : (
                      <span style={{ fontSize: 11, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>No permissions assigned</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CREATE MODAL ── */}
      {createModal && (
        <div className="stoq-modal-backdrop">
          <div className="stoq-modal" style={{ maxWidth: 440 }}>
            <div className="stoq-modal__head">
              <div className="stoq-modal__title">Add Permission</div>
              <button className="icon-btn" onClick={() => setCreateModal(false)}><X size={14} /></button>
            </div>
            <div className="stoq-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="stoq-field">
                <label className="stoq-field__label">Permission Type <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select className="stoq-select" value={formName} onChange={e => setFormName(e.target.value)} style={{ width: '100%' }}>
                  <option value="">— Select a permission —</option>
                  {availableKeys.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                </select>
                {formName && <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{PERMISSION_OPTIONS.find(o => o.key === formName)?.desc}</span>}
              </div>
              <div className="stoq-field">
                <label className="stoq-field__label">Description <span style={{ color: 'var(--fg-subtle)', fontWeight: 400 }}>(optional)</span></label>
                <textarea className="stoq-input" value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3}
                  placeholder="Custom description…" style={{ height: 'auto', padding: '8px 10px', resize: 'none' }} />
              </div>
            </div>
            <div className="stoq-modal__foot">
              <button className="stoq-btn" onClick={() => setCreateModal(false)}>Cancel</button>
              <button className="stoq-btn stoq-btn--primary" disabled={acting || !formName} onClick={handleCreate}
                style={{ opacity: acting || !formName ? 0.6 : 1 }}>
                {acting ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</> : 'Create Permission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editTarget && (
        <div className="stoq-modal-backdrop">
          <div className="stoq-modal" style={{ maxWidth: 440 }}>
            <div className="stoq-modal__head">
              <div className="stoq-modal__title">Edit Permission</div>
              <button className="icon-btn" onClick={() => setEditTarget(null)}><X size={14} /></button>
            </div>
            <div className="stoq-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="stoq-field">
                <label className="stoq-field__label">Name</label>
                <input className="stoq-input" value={formName} onChange={e => setFormName(e.target.value)} />
              </div>
              <div className="stoq-field">
                <label className="stoq-field__label">Description</label>
                <textarea className="stoq-input" value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3}
                  style={{ height: 'auto', padding: '8px 10px', resize: 'none' }} />
              </div>
            </div>
            <div className="stoq-modal__foot">
              <button className="stoq-btn" onClick={() => setEditTarget(null)}>Cancel</button>
              <button className="stoq-btn stoq-btn--primary" disabled={acting || !formName.trim()} onClick={handleUpdate}
                style={{ opacity: acting ? 0.6 : 1 }}>
                {acting ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {deleteTarget && (
        <div className="stoq-modal-backdrop">
          <div className="stoq-modal" style={{ maxWidth: 380, textAlign: 'center' }}>
            <div className="stoq-modal__head" style={{ justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--danger-soft)', display: 'grid', placeItems: 'center', color: 'var(--danger)' }}>
                <Trash2 size={18} />
              </div>
              <div className="stoq-modal__title">Delete Permission</div>
            </div>
            <div className="stoq-modal__body">
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 10 }}>
                Delete <strong>{permLabel(deleteTarget.name)}</strong>?
              </p>
              <div style={{ padding: '8px 12px', background: 'var(--warning-soft)', borderRadius: 'var(--r-sm)', fontSize: 11, color: 'var(--warning)' }}>
                This will remove the permission from all employees who have it.
              </div>
            </div>
            <div className="stoq-modal__foot">
              <button className="stoq-btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="stoq-btn stoq-btn--primary" disabled={acting} onClick={handleDelete}
                style={{ background: 'var(--danger)', opacity: acting ? 0.6 : 1 }}>
                {acting ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Deleting…</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ASSIGN MODAL ── */}
      {assignModal && (
        <div className="stoq-modal-backdrop">
          <div className="stoq-modal" style={{ maxWidth: 440 }}>
            <div className="stoq-modal__head">
              <div className="stoq-modal__title">Assign Permission</div>
              <button className="icon-btn" onClick={() => setAssignModal(null)}><X size={14} /></button>
            </div>
            <div className="stoq-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {assignModal.permission && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--accent-soft)', borderRadius: 'var(--r-sm)' }}>
                  <Shield size={14} style={{ color: 'var(--accent-soft-fg)' }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-soft-fg)' }}>{permLabel(assignModal.permission.name)}</div>
                    {assignModal.permission.description && <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{assignModal.permission.description}</div>}
                  </div>
                </div>
              )}
              {assignModal.employee && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-sunk)', borderRadius: 'var(--r-sm)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 'var(--r-xs)', background: 'var(--accent)', color: 'var(--accent-fg)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12 }}>
                    {assignModal.employee.firstName?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{assignModal.employee.firstName} {assignModal.employee.lastName}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{assignModal.employee.email} · {assignModal.employee.position}</div>
                  </div>
                </div>
              )}
              <div className="stoq-field">
                <label className="stoq-field__label">{assignModal.permission ? 'Select Employee' : 'Select Permission'}</label>
                <select className="stoq-select" defaultValue="" disabled={acting} style={{ width: '100%' }}
                  onChange={e => {
                    const id = e.target.value;
                    if (!id) return;
                    if (assignModal.permission) handleAssign(id, assignModal.permission.id);
                    else handleAssign(assignModal.employee.id, id);
                  }}>
                  <option value="">— {assignModal.permission ? 'Choose an employee' : 'Choose a permission'} —</option>
                  {assignModal.permission && employees.map(emp => {
                    const already = emp.permissions?.some(ep => ep.permissionId === assignModal.permission.id);
                    return <option key={emp.id} value={emp.id} disabled={already}>{emp.firstName} {emp.lastName} — {emp.position}{already ? ' (already assigned)' : ''}</option>;
                  })}
                  {assignModal.employee && permissions.map(perm => {
                    const already = assignModal.employee.permissions?.some(ep => ep.permissionId === perm.id);
                    return <option key={perm.id} value={perm.id} disabled={already}>{permLabel(perm.name)}{already ? ' (already assigned)' : ''}</option>;
                  })}
                </select>
              </div>
            </div>
            <div className="stoq-modal__foot">
              <button className="stoq-btn" onClick={() => setAssignModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
