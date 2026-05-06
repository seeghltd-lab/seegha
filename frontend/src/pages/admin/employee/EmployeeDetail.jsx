import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Briefcase, Calendar, ShieldCheck, FileText, Lock, Unlock, Pencil, AlertCircle, RefreshCw } from 'lucide-react';
import employeeService from '../../../services/employeeService';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

const REQ_BADGE = {
  PENDING: 'stoq-badge stoq-badge--warning',
  APPROVED: 'stoq-badge stoq-badge--accent',
  PARTIALLY_RECEIVED: 'stoq-badge stoq-badge--warning',
  FULLY_RECEIVED: 'stoq-badge stoq-badge--success',
  REJECTED: 'stoq-badge stoq-badge--danger',
};

const EmployeeDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 10, color: 'var(--fg-subtle)' }}>
      <AlertCircle size={28} style={{ color: 'var(--danger)' }} />
      <span style={{ fontSize: 12 }}>{error || 'Employee not found'}</span>
      <button className="stoq-btn" onClick={() => navigate('/admin/employees')}>← Back to Employees</button>
    </div>
  );

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
          <Link to={`/admin/employees/edit/${employee.id}`} className="stoq-btn" style={{ textDecoration: 'none' }}>
            <Pencil size={13} /> Edit
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 14, alignItems: 'start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Avatar card */}
          <div className="stoq-panel" style={{ textAlign: 'center', overflow: 'hidden' }}>
            <div style={{ height: 60, background: 'var(--accent)', position: 'relative' }} />
            <div style={{ padding: '0 16px 16px', marginTop: -36 }}>
              <div style={{ width: 72, height: 72, borderRadius: 'var(--r-md)', background: 'var(--accent)', color: 'var(--accent-fg)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 24, margin: '0 auto 10px', border: '3px solid var(--panel)', overflow: 'hidden' }}>
                {employee.profilePicture
                  ? <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/${employee.profilePicture}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : employee.firstName.charAt(0).toUpperCase()}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>
                {employee.firstName} {employee.lastName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>{employee.position}</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                <span className={`stoq-badge ${employee.status === 'ACTIVE' ? 'stoq-badge--success' : 'stoq-badge--danger'}`}>
                  {employee.status}
                </span>
                <span className={`stoq-badge ${employee.isLocked ? 'stoq-badge--danger' : 'stoq-badge--success'}`}>
                  {employee.isLocked ? <><Lock size={9} /> Locked</> : <><Unlock size={9} /> Active</>}
                </span>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="stoq-panel">
            <div className="stoq-panel__head"><span className="stoq-panel__title">Contact</span></div>
            <div className="detail-grid" style={{ border: 'none', borderRadius: 0, background: 'transparent' }}>
              <div className="detail-cell">
                <div className="detail-cell__label"><Mail size={11} /> Email</div>
                <div className="detail-cell__value" style={{ wordBreak: 'break-all' }}>{employee.email}</div>
              </div>
              <div className="detail-cell">
                <div className="detail-cell__label"><Phone size={11} /> Phone</div>
                <div className="detail-cell__value">{employee.phone}</div>
              </div>
              <div className="detail-cell">
                <div className="detail-cell__label"><Calendar size={11} /> Joined</div>
                <div className="detail-cell__value">{fmtDate(employee.createdAt)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Permissions */}
          <div className="stoq-panel">
            <div className="stoq-panel__head">
              <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__icon"><ShieldCheck size={13} /></span>
                Permissions
              </span>
              <span className="stoq-panel__sub">{employee.permissions?.length || 0} assigned</span>
            </div>
            <div style={{ padding: 14 }}>
              {employee.permissions?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {employee.permissions.map((p, i) => (
                    <span key={i} className="stoq-badge stoq-badge--accent stoq-badge--plain">
                      {p.permission.name.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="stoq-empty" style={{ padding: '24px 0' }}>
                  <ShieldCheck size={20} className="stoq-empty__icon" />
                  <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>No permissions assigned</div>
                </div>
              )}
            </div>
          </div>

          {/* Requisitions */}
          <div className="stoq-panel">
            <div className="stoq-panel__head">
              <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__icon"><FileText size={13} /></span>
                Recent Requisitions
              </span>
            </div>
            {employee.requisitions?.length > 0 ? (
              <div className="table-wrap">
                <table className="stoq-tbl">
                  <thead>
                    <tr>
                      <th className="no-sort">ID</th>
                      <th className="no-sort">Date</th>
                      <th className="no-sort">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employee.requisitions.map(req => (
                      <tr key={req.id} onClick={() => navigate(`/admin/requisition-management/${req.id}`)} style={{ cursor: 'pointer' }}>
                        <td><span className="cell-stack__sub" style={{ display: 'inline' }}>#{req.id.slice(-6).toUpperCase()}</span></td>
                        <td style={{ color: 'var(--fg-muted)' }}>{new Date(req.createdAt).toLocaleDateString('en-GB')}</td>
                        <td>
                          <span className={REQ_BADGE[req.status] || 'stoq-badge'}>
                            {req.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="stoq-empty">
                <FileText size={20} className="stoq-empty__icon" />
                <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>No requisitions yet</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetail;
