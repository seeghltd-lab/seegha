import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, Briefcase, Calendar, ShieldCheck, FileText,
  Lock, Unlock, Pencil, AlertCircle, RefreshCw, MapPin, Building2,
  Package, PackageMinus, HardHat, DollarSign, Users, Landmark,
} from 'lucide-react';
import employeeService from '../../../services/employeeService';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const REQ_BADGE = {
  PENDING:            'stoq-badge stoq-badge--warning',
  APPROVED:           'stoq-badge stoq-badge--accent',
  PARTIALLY_RECEIVED: 'stoq-badge stoq-badge--warning',
  FULLY_RECEIVED:     'stoq-badge stoq-badge--success',
  REJECTED:           'stoq-badge stoq-badge--danger',
};

const PERM_ICONS = {
  stock_management:    Package,
  create_requisition:  FileText,
  approve_requisition: ShieldCheck,
  receive_requisition: ShieldCheck,
  supplier_management: Briefcase,
  category_management: Briefcase,
  site_management:     Building2,
  site_view:           Building2,
  reports_view:        FileText,
  record_direct_stock: Package,
};

const PERM_COLORS = {
  stock_management:    'var(--accent)',
  site_management:     '#7c5cfc',
  site_view:           '#5b8ef8',
  approve_requisition: '#e87040',
  receive_requisition: '#3aaa6e',
  create_requisition:  '#3aaa6e',
  supplier_management: '#c08a30',
  reports_view:        '#56b0d8',
};

const SITE_TAB_LABELS = {
  canManageInfo:     { label: 'Info',      icon: Landmark },
  canManageWorkers:  { label: 'Workers',   icon: HardHat },
  canManageExpenses: { label: 'Expenses',  icon: DollarSign },
  canManageStock:    { label: 'Stock',     icon: Package },
  canManageStockOut: { label: 'Stock Out', icon: PackageMinus },
};

const permLabel = (name) =>
  name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function EmployeeDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('permissions');

  useEffect(() => {
    setIsLoading(true);
    employeeService.getEmployee(id)
      .then(setEmployee)
      .catch(() => setError('Employee record unavailable.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 10, color: 'var(--fg-subtle)' }}>
      <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: 12 }}>Loading employee…</span>
    </div>
  );

  if (error || !employee) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 10 }}>
      <AlertCircle size={28} style={{ color: 'var(--danger)' }} />
      <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>{error || 'Employee not found'}</span>
      <button className="stoq-btn" onClick={() => navigate('/admin/employees')}>← Back to Employees</button>
    </div>
  );

  const perms = employee.permissions || [];
  const reqs  = employee.requisitions || [];
  const sites = employee.siteAccess || [];

  const miniStats = [
    { label: 'Requisitions', value: reqs.length,  icon: FileText },
    { label: 'Permissions',  value: perms.length,  icon: ShieldCheck },
    { label: 'Sites',        value: sites.length,  icon: Building2 },
  ];

  return (
    <div style={{ padding: '20px 24px 40px' }}>
      {/* Page head */}
      <div className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-btn" onClick={() => navigate('/admin/employees')}><ArrowLeft size={14} /></button>
          <div>
            <div className="stoq-crumbs" style={{ marginBottom: 4 }}>
              <span>Employees</span>
              <span className="stoq-crumbs__sep">/</span>
              <span className="stoq-crumbs__current">{employee.firstName} {employee.lastName}</span>
            </div>
            <h1>{employee.firstName} {employee.lastName}</h1>
            <div className="page-head__sub">{employee.position}</div>
          </div>
        </div>
        <div className="page-head__actions">
          <button className="stoq-btn stoq-btn--primary" onClick={() => navigate(`/admin/employees/edit/${employee.id}`)}>
            <Pencil size={13} /> Edit Employee
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 14, alignItems: 'start' }}>

        {/* ── LEFT SIDEBAR ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Avatar card with gradient banner */}
          <div className="stoq-panel" style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{
              height: 72,
              background: 'linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 60%, #7c5cfc) 100%)',
              position: 'relative',
            }} />
            <div style={{ padding: '0 16px 16px', marginTop: -40, textAlign: 'center' }}>
              <div style={{
                width: 80, height: 80, borderRadius: 'var(--r-md)',
                background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 70%, #7c5cfc))',
                color: 'var(--accent-fg)',
                display: 'grid', placeItems: 'center',
                fontWeight: 800, fontSize: 28,
                margin: '0 auto 10px',
                border: '3px solid var(--panel)',
                overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              }}>
                {employee.profilePicture
                  ? <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/${employee.profilePicture}`} alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : employee.firstName.charAt(0).toUpperCase()}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--fg)', lineHeight: 1.2 }}>
                {employee.firstName} {employee.lastName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 3 }}>{employee.position}</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                <span className={`stoq-badge ${employee.status === 'ACTIVE' ? 'stoq-badge--success' : 'stoq-badge--danger'}`}>
                  {employee.status}
                </span>
                <span className={`stoq-badge ${employee.isLocked ? 'stoq-badge--danger' : 'stoq-badge--accent'}`}>
                  {employee.isLocked ? <><Lock size={9} /> Locked</> : <><Unlock size={9} /> Unlocked</>}
                </span>
              </div>
            </div>

            {/* Mini stats strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid var(--border)' }}>
              {miniStats.map(({ label, value, icon: Icon }, idx) => (
                <div key={label} style={{ padding: '10px 6px', textAlign: 'center', borderRight: idx < miniStats.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--fg)', fontFamily: 'var(--font-display)' }}>{value}</div>
                  <div style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 1 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact panel */}
          <div className="stoq-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-subtle)' }}>Contact Info</span>
            </div>
            {[
              { icon: Mail,     label: 'Email',  value: employee.email,     breakAll: true },
              { icon: Phone,    label: 'Phone',  value: employee.phone || '—' },
              { icon: Calendar, label: 'Joined', value: fmtDate(employee.createdAt) },
            ].map(({ icon: Icon, label, value, breakAll }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>
                <Icon size={12} style={{ color: 'var(--fg-subtle)', marginTop: 1, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginBottom: 1 }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg)', fontWeight: 500, wordBreak: breakAll ? 'break-all' : 'normal' }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT AREA — TABS ── */}
        <div>
          <div className="stoq-tabs" style={{ marginBottom: 14 }}>
            {[
              { key: 'permissions', icon: ShieldCheck, label: `Permissions (${perms.length})` },
              { key: 'requisitions', icon: FileText,   label: `Requisitions (${reqs.length})` },
              { key: 'siteaccess',  icon: Building2,   label: `Site Access (${sites.length})` },
            ].map(({ key, icon: Icon, label }) => (
              <button key={key} className="stoq-tab" data-active={tab === key ? 'true' : 'false'} onClick={() => setTab(key)}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {/* ── PERMISSIONS TAB ── */}
          {tab === 'permissions' && (
            perms.length === 0 ? (
              <div className="stoq-empty" style={{ minHeight: 180 }}>
                <ShieldCheck size={28} className="stoq-empty__icon" />
                <div className="stoq-empty__title">No permissions assigned</div>
                <div className="stoq-empty__sub">Use Permission Management to grant access</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {perms.map((p, i) => {
                  const name = p.permission?.name || '';
                  const Icon = PERM_ICONS[name] || ShieldCheck;
                  const color = PERM_COLORS[name] || 'var(--accent)';
                  return (
                    <div key={i} className="stoq-panel" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 'var(--r-sm)',
                          background: `color-mix(in srgb, ${color} 15%, transparent)`,
                          display: 'grid', placeItems: 'center', color, flexShrink: 0,
                        }}>
                          <Icon size={15} />
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)', lineHeight: 1.2 }}>{permLabel(name)}</div>
                          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-subtle)' }}>{name}</div>
                        </div>
                      </div>
                      {p.permission?.description && (
                        <div style={{ fontSize: 11, color: 'var(--fg-subtle)', lineHeight: 1.5 }}>{p.permission.description}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ── REQUISITIONS TAB ── */}
          {tab === 'requisitions' && (
            reqs.length === 0 ? (
              <div className="stoq-empty" style={{ minHeight: 180 }}>
                <FileText size={28} className="stoq-empty__icon" />
                <div className="stoq-empty__title">No requisitions yet</div>
                <div className="stoq-empty__sub">Requisitions submitted by this employee will appear here</div>
              </div>
            ) : (
              <div className="stoq-panel" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Status summary strip */}
                {(() => {
                  const counts = reqs.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
                  return (
                    <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                      {Object.entries(counts).map(([status, count]) => (
                        <span key={status} className={REQ_BADGE[status] || 'stoq-badge'}>
                          {count} {status.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  );
                })()}
                <div className="table-wrap">
                  <table className="stoq-tbl">
                    <thead>
                      <tr>
                        <th className="no-sort">ID</th>
                        <th className="no-sort">Title</th>
                        <th className="no-sort">Status</th>
                        <th className="no-sort">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reqs.map(req => (
                        <tr key={req.id}
                          onClick={() => navigate(`/admin/requisition-management/${req.id}`)}
                          style={{ cursor: 'pointer' }}>
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-subtle)' }}>
                              #{req.id.slice(-6).toUpperCase()}
                            </span>
                          </td>
                          <td style={{ maxWidth: 240 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {req.title || '—'}
                            </div>
                          </td>
                          <td>
                            <span className={REQ_BADGE[req.status] || 'stoq-badge'}>
                              {req.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ color: 'var(--fg-muted)', fontSize: 11 }}>
                            {fmtDate(req.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* ── SITE ACCESS TAB ── */}
          {tab === 'siteaccess' && (
            sites.length === 0 ? (
              <div className="stoq-empty" style={{ minHeight: 180 }}>
                <Building2 size={28} className="stoq-empty__icon" />
                <div className="stoq-empty__title">No site access assigned</div>
                <div className="stoq-empty__sub">Use Permission Management → Site Access to assign sites</div>
              </div>
            ) : (
              <div className="stoq-panel" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(5, 60px)', alignItems: 'center', padding: '6px 14px', background: 'var(--bg-sunk)', borderBottom: '1px solid var(--border)', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Site</span>
                  {Object.values(SITE_TAB_LABELS).map(({ label }) => (
                    <span key={label} style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>{label}</span>
                  ))}
                </div>
                {sites.map(access => (
                  <div key={access.id || access.siteId}
                    style={{ display: 'grid', gridTemplateColumns: '1fr repeat(5, 60px)', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <Building2 size={14} style={{ color: 'var(--accent-soft-fg)' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {access.site?.name || '—'}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--fg-subtle)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          {access.site?.location && <><MapPin size={9} /> {access.site.location}</>}
                          {access.site?.status && (
                            <span className={`stoq-badge ${access.site.status === 'ACTIVE' ? 'stoq-badge--success' : ''}`} style={{ fontSize: 9, marginLeft: 4 }}>
                              {access.site.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {Object.entries(SITE_TAB_LABELS).map(([key, { icon: Icon }]) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: access[key] ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--bg-sunk)',
                          display: 'grid', placeItems: 'center',
                          color: access[key] ? 'var(--accent)' : 'var(--border)',
                        }}>
                          <Icon size={11} />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
