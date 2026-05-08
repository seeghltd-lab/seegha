import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, LogOut, User, Search } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';
import NotificationBell from './NotificationBell';

const ChevR = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const Header = ({ onToggleSidebar, role }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { admin, logout: adminLogout } = useAdminAuth();
  const { employee, logout: employeeLogout } = useEmployeeAuth();
  const user = role === 'admin' ? admin : employee;
  const logout = role === 'admin' ? adminLogout : employeeLogout;

  const handleLogout = async () => {
    await logout();
    navigate(role === 'admin' ? '/admin/login' : '/login');
  };

  const getPageName = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    // Skip 'admin' prefix segment
    const relevant = segments.filter(s => s !== 'admin');
    const last = relevant[relevant.length - 1];
    if (!last || last === 'dashboard') return 'Dashboard';
    // Map known slugs to readable names
    const nameMap = {
      'employees': 'Employees', 'stock': 'Stock', 'suppliers': 'Suppliers',
      'categories': 'Categories', 'requisitions': 'Requisitions',
      'requisition-management': 'Requisitions', 'permissions': 'Permissions',
      'notifications': 'Notifications', 'profile': 'Profile',
      'site-management': 'Sites', 'sites': 'Sites',
      'activity-log': 'Activity Log', 'history': 'Stock History',
      'direct-receipt': 'Direct Receipt', 'add': 'Add', 'new': 'New',
      'approve': 'Approve', 'receive': 'Receive', 'create': 'Create',
    };
    return nameMap[last] || last.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getSection = () => role === 'admin' ? 'Admin' : 'Staff';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userName = user?.names || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <header className="stoq-topbar">
      {/* Sidebar toggle — always visible */}
      <button
        onClick={onToggleSidebar}
        className="icon-btn"
        aria-label="Toggle sidebar"
        title="Toggle sidebar"
        style={{ flexShrink: 0 }}
      >
        <Menu size={16} />
      </button>

      {/* Breadcrumb */}
      <div className="stoq-crumbs">
        <span>{getSection()}</span>
        <span className="stoq-crumbs__sep">/</span>
        <span className="stoq-crumbs__current">{getPageName()}</span>
      </div>

      {/* Search */}
      <div className="stoq-topbar__search">
        <Search size={13} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />
        <span style={{ flex: 1, color: 'var(--fg-subtle)', fontSize: 12 }}>Search assets…</span>
        <kbd>⌘K</kbd>
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Notification bell */}
        <NotificationBell />

        {/* Profile dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 6px', borderRadius: 'var(--r-sm)',
              color: 'var(--fg)',
            }}
            className="user-card"
          >
            <div className="stoq-avatar">{userInitial}</div>
            <div style={{ textAlign: 'left', display: 'none' }} className="stoq-profile-name">
              <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>{userName}</div>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'capitalize' }}>{role}</div>
            </div>
            <ChevR />
          </button>

          {isProfileOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              width: 220,
              background: 'var(--bg-elev)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
              zIndex: 50,
              animation: 'stoqSlide 140ms ease-out',
            }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{userName}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>{user?.email}</div>
              </div>
              <div style={{ padding: 6 }}>
                <button
                  onClick={() => { setIsProfileOpen(false); navigate(role === 'admin' ? '/admin/profile' : '/profile'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '7px 10px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    borderRadius: 'var(--r-sm)', fontSize: 12,
                    color: 'var(--fg-muted)', textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-sunk)'; e.currentTarget.style.color = 'var(--fg)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
                >
                  <User size={14} /> My Profile
                </button>
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '7px 10px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    borderRadius: 'var(--r-sm)', fontSize: 12,
                    color: 'var(--danger)', textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-soft)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes stoqSlide { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 768px) {
          .stoq-crumbs { display: none; }
          .stoq-profile-name { display: block !important; }
        }
        @media (min-width: 769px) {
          .stoq-profile-name { display: block !important; }
        }
      `}</style>
    </header>
  );
};

export default Header;
