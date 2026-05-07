import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, FileText, X,
  Truck, User, Landmark, Shield, Bell, History, Activity, PackagePlus,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';
import { SITE_NAME } from '../config/site';

const hasPerm = (employee, ...names) =>
  names.some(name => employee?.permissions?.some(p => p.permission.name === name));

const Sidebar = ({ isOpen, onToggle, role }) => {
  const location = useLocation();
  const { admin } = useAdminAuth();
  const { employee } = useEmployeeAuth();
  const user = role === 'admin' ? admin : employee;

  const adminLinks = [
    { id: 'dashboard',     label: 'Dashboard',      icon: LayoutDashboard, path: '/admin/dashboard' },
    { id: 'employees',     label: 'Employees',       icon: Users,           path: '/admin/employees' },
    { id: 'categories',    label: 'Categories',      icon: Package,         path: '/admin/categories' },
    { id: 'stock',         label: 'Stock',           icon: Package,         path: '/admin/stock' },
    { id: 'stock-history', label: 'Stock History',   icon: History,         path: '/admin/stock/history' },
    { id: 'suppliers',     label: 'Suppliers',       icon: Truck,           path: '/admin/suppliers' },
    { id: 'requisitions',  label: 'Requisitions',    icon: FileText,        path: '/admin/requisition-management' },
    { id: 'permissions',   label: 'Permissions',     icon: Shield,          path: '/admin/permissions' },
    { id: 'notifications', label: 'Notifications',   icon: Bell,            path: '/admin/notifications' },
    { id: 'activity-log',  label: 'Activity Log',    icon: Activity,        path: '/admin/activity-log' },
    { id: 'sites',         label: 'Sites',           icon: Landmark,        path: '/admin/site-management' },
    { id: 'profile',       label: 'My Profile',      icon: User,            path: '/admin/profile' },
  ];

  // Employee links — base pages always visible, shared pages gated by permission
  const allEmployeeLinks = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
      visible: true,
    },
    {
      id: 'stock',
      label: 'Inventory',
      icon: Package,
      path: '/stock',
      visible: hasPerm(employee, 'stock_management'),
    },
    {
      id: 'direct-receipt',
      label: 'Direct Receipt',
      icon: PackagePlus,
      path: '/stock/direct-receipt',
      visible: hasPerm(employee, 'record_direct_stock'),
    },
    {
      id: 'requisitions',
      label: 'My Requests',
      icon: FileText,
      path: '/requisitions',
      visible: hasPerm(employee, 'create_requisition', 'approve_requisition', 'receive_requisition'),
    },
    {
      id: 'suppliers',
      label: 'Suppliers',
      icon: Truck,
      path: '/suppliers',
      visible: hasPerm(employee, 'supplier_management'),
    },
    {
      id: 'sites',
      label: 'Sites',
      icon: Landmark,
      path: '/sites',
      visible: hasPerm(employee, 'site_management'),
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: Package,
      path: '/categories',
      visible: hasPerm(employee, 'category_management'),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      path: '/notifications',
      visible: true,
    },
    {
      id: 'profile',
      label: 'My Profile',
      icon: User,
      path: '/profile',
      visible: true,
    },
  ];

  const employeeLinks = allEmployeeLinks.filter(l => l.visible);
  const links = role === 'admin' ? adminLinks : employeeLinks;
  const userName = user?.names || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
  const userInitial = userName.charAt(0).toUpperCase();
  const shortName = SITE_NAME.split(' ')[0];

  // Active detection — exact match or prefix match (but not /stock matching /stock/history)
  const isLinkActive = (linkPath) => {
    if (location.pathname === linkPath) return true;
    // Prefix match only for non-leaf paths, avoid false positives
    if (linkPath.endsWith('/stock') || linkPath === '/stock') {
      return location.pathname === linkPath;
    }
    return location.pathname.startsWith(linkPath + '/');
  };

  return (
    <aside className={`stoq-sidebar${isOpen ? ' is-open' : ''}`}>
      {/* Brand */}
      <div className="stoq-sidebar__brand">
        <div className="brand-mark">
          <span>{shortName.charAt(0)}</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="brand-name">{shortName}</div>
          <div className="brand-meta">{role === 'admin' ? 'Management' : 'Staff Portal'}</div>
        </div>
        {/* <button
          onClick={onToggle}
          style={{
            marginLeft: 'auto', display: 'grid', placeItems: 'center',
            background: 'none', border: 'none',
            color: 'var(--fg-subtle)', padding: '4px',
            borderRadius: 'var(--r-xs)', cursor: 'pointer',
          }}
          className="lg:hidden"
        >
          <X size={16} />
        </button> */}
      </div>

      {/* Navigation */}
      <nav className="stoq-nav" style={{ flex: 1, overflowY: 'auto', paddingTop: 8, paddingBottom: 8 }}>
        <div className="stoq-sidebar__section-label">
          {role === 'admin' ? 'Management' : 'My Portal'}
        </div>
        {links.map((link) => {
          const Icon = link.icon;
          const active = isLinkActive(link.path);
          return (
            <NavLink
              key={link.id}
              to={link.path}
              onClick={() => window.innerWidth < 768 && onToggle()}
              className="stoq-nav__item"
              data-active={active ? 'true' : undefined}
              style={{ textDecoration: 'none' }}
            >
              <Icon size={15} className="stoq-nav__icon" />
              <span className="stoq-nav__label">{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User card */}
      <div className="stoq-sidebar__footer">
        <div className="user-card">
          <div className="stoq-avatar">{userInitial}</div>
          <div style={{ minWidth: 0 }}>
            <div className="user-card__name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userName}
            </div>
            <div className="user-card__role">{role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
