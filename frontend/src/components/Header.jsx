import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, 
  Search, 
  LogOut, 
  User, 
  ChevronDown,
  Maximize2
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';
import NotificationBell from './NotificationBell';

const Header = ({ onToggleSidebar, role }) => {
  const navigate = useNavigate();
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 right-0 left-0 lg:left-64 h-20 z-30 px-6 sm:px-10 flex items-center justify-between border-b border-outline-variant/30 bg-white shadow-sm">
      {/* Mobile Toggle & Desktop Breadcrumb */}
      <div className="flex items-center gap-5">
        <button 
          onClick={onToggleSidebar}
          className="lg:hidden p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-secondary hover:text-primary transition-all active:scale-95 shadow-sm"
        >
          <Menu size={22} />
        </button>
        
        <div className="hidden sm:block">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-secondary opacity-60 mb-0.5">
            <span>Main</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span>Dashboard</span>
          </div>
          <h1 className="text-xl font-black text-on-surface tracking-tight">
            System <span className="text-primary opacity-80">Workspace</span>
          </h1>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4 sm:gap-8">
        {/* Search - Desktop */}
        <div className="hidden md:flex items-center relative group">
          <Search className="absolute left-3.5 text-slate-400 group-focus-within:text-primary transition-colors" size={17} />
          <input 
            type="text" 
            placeholder="Search assets..." 
            className="pl-11 pr-5 py-2.5 bg-surface-container-lowest border border-outline-variant/20 rounded-xl text-sm ring-2 ring-transparent focus:ring-primary/10 focus:border-primary transition-all w-72 outline-none shadow-sm"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pr-4 border-r border-outline-variant/20">
          <button className="p-2.5 text-secondary hover:text-primary hover:bg-surface-container rounded-xl transition-all hidden xs:flex">
            <Maximize2 size={19} />
          </button>
          <NotificationBell />
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 p-1 rounded-xl hover:bg-surface transition-all group"
          >
             <div className="w-10 h-10 rounded-xl primary-gradient flex items-center justify-center text-white text-base font-black shadow-lg">
              {(user?.names || user?.firstName || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-[13px] font-black text-on-surface leading-tight">
                {user?.names || user?.firstName || 'User'}
              </p>
              <p className="text-[10px] font-bold text-emerald-600 mt-0.5 uppercase tracking-wide">
                Authorized
              </p>
            </div>
            <ChevronDown size={14} className={`text-slate-400 ml-1 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* User Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-4 w-60 bg-white rounded-2xl shadow-2xl border border-outline-variant/20 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 origin-top-right">
              <div className="p-5 border-b border-surface-container bg-surface/30">
                <p className="text-sm font-black text-on-surface truncate">{user?.names || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()}</p>
                <p className="text-[11px] font-medium text-secondary truncate mt-1">{user?.email}</p>
              </div>
              <div className="py-2.5 p-2">
                <button onClick={() => {
                    setIsProfileOpen(false);
                    navigate(role === 'admin' ? '/admin/profile' : '/profile');
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-bold text-secondary hover:bg-surface-container hover:text-primary rounded-xl transition-colors">
                  <User size={18} /> My Account
                </button>
                <div className="h-px bg-surface-container-high my-2 mx-2"></div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm font-black text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <LogOut size={18} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
