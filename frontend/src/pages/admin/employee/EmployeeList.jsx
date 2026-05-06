import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Trash2, Mail, Users, UserCheck, UserMinus, AlertCircle, RefreshCw, LayoutGrid, List } from 'lucide-react';
import employeeService from '../../../services/employeeService';
import Sparkline, { genSpark } from '../../../components/Sparkline';
import { useViewMode } from '../../../hooks/useViewMode';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isDeleting, setIsDeleting] = useState(null);
  const [viewMode, setViewMode, isSmallScreen] = useViewMode('employees');
  const navigate = useNavigate();

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const data = await employeeService.getAllEmployees();
      setEmployees(data);
    } catch { } finally { setIsLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this employee? This cannot be undone.')) return;
    try {
      setIsDeleting(id);
      await employeeService.deleteEmployee(id);
      setEmployees(employees.filter(emp => emp.id !== id));
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    } finally { setIsDeleting(null); }
  };

  const filtered = employees.filter(emp => {
    const matchSearch = `${emp.firstName} ${emp.lastName} ${emp.email} ${emp.position}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || emp.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const active = employees.filter(e => e.status === 'ACTIVE').length;
  const inactive = employees.filter(e => e.status !== 'ACTIVE' || e.isLocked).length;

  return (
    <div>
      {/* Page head */}
      <div className="page-head">
        <div>
          <h1>Employees</h1>
          <div className="page-head__sub">Manage staff accounts and access levels</div>
        </div>
        <div className="page-head__actions">
          <Link to="/admin/employees/new" className="stoq-btn stoq-btn--primary" style={{ textDecoration: 'none' }}>
            <Plus size={13} /> Add Employee
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="kpi-grid kpi-grid--3" style={{ marginBottom: 'var(--gap-card)' }}>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><Users size={12} /></span>Total employees</div>
          <div className="kpi__value">{employees.length}</div>
          <div className="kpi__foot"><span>registered staff</span><span className="kpi__delta kpi__delta--up">+2</span></div>
          <Sparkline data={genSpark(1, 14, 0.3)} />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><UserCheck size={12} /></span>Active</div>
          <div className="kpi__value" style={{ color: 'var(--success)' }}>{active}</div>
          <div className="kpi__foot"><span>currently active</span></div>
          <Sparkline data={genSpark(3, 14, 0.2)} />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon" data-tone="warning"><UserMinus size={12} /></span>Inactive / Locked</div>
          <div className="kpi__value" style={{ color: inactive > 0 ? 'var(--danger)' : 'var(--fg)' }}>{inactive}</div>
          <div className="kpi__foot"><span>needs review</span></div>
          <Sparkline data={genSpark(8, 14, 0)} color="var(--warning)" />
        </div>
      </div>

      {/* Panel */}
      <div className="stoq-panel">
        {/* Toolbar */}
        <div className="stoq-toolbar">
          <div className="stoq-toolbar__search">
            <input className="stoq-input stoq-input--search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by name, email, position…" />
          </div>
          <div className="stoq-segment">
            {[['ALL', 'All'], ['ACTIVE', 'Active'], ['PROBATION', 'Probation'], ['TERMINATED', 'Terminated'], ['RESIGNED', 'Resigned']].map(([val, label]) => (
              <button key={val} data-active={statusFilter === val ? 'true' : undefined} onClick={() => setStatusFilter(val)}>{label}</button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
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
                  <th className="no-sort">Employee</th>
                  <th className="no-sort">Status</th>
                  <th className="no-sort">Position</th>
                  <th className="no-sort">Joined</th>
                  <th className="no-sort col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '48px 0' }}>
                      <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--fg-subtle)', margin: '0 auto' }} />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--fg-subtle)' }}>
                      <AlertCircle size={24} style={{ margin: '0 auto 8px', display: 'block' }} />
                      <div style={{ fontSize: 12 }}>No employees found</div>
                    </td>
                  </tr>
                ) : filtered.map(emp => (
                  <tr key={emp.id} onClick={() => navigate(`/admin/employees/${emp.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', background: 'var(--accent)', color: 'var(--accent-fg)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0, overflow: 'hidden' }}>
                          {emp.profilePicture
                            ? <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/${emp.profilePicture}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : emp.firstName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="cell-stack__main">{emp.firstName} {emp.lastName}</span>
                          <span className="cell-stack__sub" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Mail size={10} /> {emp.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`stoq-badge ${emp.status === 'ACTIVE' ? 'stoq-badge--success' : 'stoq-badge--danger'}`}>
                        {emp.status}
                      </span>
                      {emp.isLocked && <span className="stoq-badge stoq-badge--warning" style={{ marginLeft: 4 }}>Locked</span>}
                    </td>
                    <td style={{ color: 'var(--fg-muted)' }}>{emp.position}</td>
                    <td style={{ color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {new Date(emp.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                        <Link to={`/admin/employees/${emp.id}`} className="icon-btn" title="View" style={{ textDecoration: 'none' }}><Eye size={13} /></Link>
                        <Link to={`/admin/employees/edit/${emp.id}`} className="icon-btn" title="Edit" style={{ textDecoration: 'none' }}><Pencil size={13} /></Link>
                        <button className="icon-btn" title="Delete" disabled={isDeleting === emp.id}
                          onClick={() => handleDelete(emp.id)}
                          style={{ color: 'var(--danger)', opacity: isDeleting === emp.id ? 0.5 : 1 }}>
                          <Trash2 size={13} />
                        </button>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, padding: 14 }}>
            {isLoading ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 32, color: 'var(--fg-subtle)' }}>
                <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 32, color: 'var(--fg-subtle)', fontSize: 12 }}>No employees found</div>
            ) : filtered.map(emp => (
              <div key={emp.id} onClick={() => navigate(`/admin/employees/${emp.id}`)}
                style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 14, cursor: 'pointer', background: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 'var(--r-sm)', background: 'var(--accent)', color: 'var(--accent-fg)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0, overflow: 'hidden' }}>
                    {emp.profilePicture
                      ? <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/${emp.profilePicture}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : emp.firstName.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.firstName} {emp.lastName}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{emp.position}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className={`stoq-badge ${emp.status === 'ACTIVE' ? 'stoq-badge--success' : 'stoq-badge--danger'}`}>{emp.status}</span>
                  {emp.isLocked && <span className="stoq-badge stoq-badge--warning">Locked</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Mail size={10} /> {emp.email}
                </div>
                <div style={{ display: 'flex', gap: 4, borderTop: '1px solid var(--border)', paddingTop: 8 }} onClick={e => e.stopPropagation()}>
                  <Link to={`/admin/employees/${emp.id}`} className="stoq-btn stoq-btn--ghost stoq-btn--sm" style={{ textDecoration: 'none', flex: 1, justifyContent: 'center' }}><Eye size={12} /></Link>
                  <Link to={`/admin/employees/edit/${emp.id}`} className="stoq-btn stoq-btn--ghost stoq-btn--sm" style={{ textDecoration: 'none', flex: 1, justifyContent: 'center' }}><Pencil size={12} /></Link>
                  <button className="stoq-btn stoq-btn--ghost stoq-btn--sm" style={{ flex: 1, color: 'var(--danger)', justifyContent: 'center' }} disabled={isDeleting === emp.id} onClick={() => handleDelete(emp.id)}><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeList;
