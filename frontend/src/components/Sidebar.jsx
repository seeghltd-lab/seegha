import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  X,
  ChevronRight,
  Truck,
  User,
  Landmark,
  Shield,
  Bell,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';
import { SITE_NAME } from '../config/site';

const Sidebar = ({ isOpen, onToggle, role }) => {
  const location = useLocation();
  const { admin } = useAdminAuth();
  const { employee } = useEmployeeAuth();

  const user = role === 'admin' ? admin : employee;

  const links = role === 'admin' ? [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { id: 'categories', label: 'Categories', icon: Package, path: '/admin/categories' },
    { id: 'stock', label: 'Stock', icon: Package, path: '/admin/stock' },
    { id: 'suppliers', label: 'Suppliers', icon: Truck, path: '/admin/suppliers' },
    { id: 'employees', label: 'Employees', icon: Users, path: '/admin/employees' },
    { id: 'requisitions', label: 'Requisitions', icon: FileText, path: '/admin/requisition-management' },
    { id: 'permissions', label: 'Permissions', icon: Shield, path: '/admin/permissions' },
    { id: 'notifications', label: 'Notifications', icon: Bell, path: '/admin/notifications' },
    { id: 'profile', label: 'My Profile', icon: User, path: '/admin/profile' },
    { id: 'sites', label: 'Sites', icon: Landmark, path: '/admin/site-management' },
  ] : [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'inventory', label: 'My Inventory', icon: Package, path: '/inventory' },
    { id: 'requisitions', label: 'My Requests', icon: FileText, path: '/requisitions' },
    { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications' },
    { id: 'profile', label: 'My Profile', icon: User, path: '/profile' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden transition-opacity"
          onClick={onToggle}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed left-0 top-0 h-screen bg-surface-container-lowest border-r border-outline-variant/30 z-50 transform transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } w-72 lg:w-64 flex flex-col shadow-xl lg:shadow-none`}
      >
        {/* Logo Section */}
        <div className="p-6 flex items-center justify-between border-b border-outline-variant/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 primary-gradient rounded-xl flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                {role === 'admin' ? 'account_balance_wallet' : 'person'}
              </span>
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tighter text-on-surface uppercase block leading-none">
                {SITE_NAME.split(' ')[0]}
              </span>
              <span className="text-[10px] font-bold text-primary tracking-[2px] uppercase opacity-60">
                {role === 'admin' ? 'Management' : 'Staff Link'}
              </span>
            </div>
          </div>
          <button 
            onClick={onToggle} 
            className="lg:hidden p-2 text-slate-400 hover:text-primary hover:bg-surface-container rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto bg-surface/30">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            
            return (
              <NavLink
                key={link.id}
                to={link.path}
                className={({ isActive }) => `
                  flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? 'bg-primary text-white shadow-md' 
                    : 'text-secondary hover:bg-surface-container hover:text-primary'}
                `}
                onClick={() => window.innerWidth < 1024 && onToggle()}
              >
                <div className="flex items-center gap-3">
                  <Icon size={19} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary transition-colors'} />
                  <span className="text-[13px] font-bold tracking-wide">{link.label}</span>
                </div>
                {isActive && <ChevronRight size={15} className="text-white/60" />}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card at bottom */}
        <div className="p-4 border-t border-outline-variant/20 bg-surface">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/10 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-white border border-outline-variant/30 flex items-center justify-center text-primary font-extrabold shadow-sm">
              {(user?.names || user?.firstName || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-[13px] font-bold text-on-surface truncate">
                {user?.names || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User'}
              </p>
              <p className="text-[9px] font-bold text-secondary uppercase tracking-[1px] opacity-70">
                {role} Access
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
