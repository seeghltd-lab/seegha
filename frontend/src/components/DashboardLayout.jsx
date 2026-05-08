import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import TweaksPanel from './TweaksPanel';

const DashboardLayout = ({ role }) => {
  const [isMobileOpen, setIsMobileOpen]     = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem('stoq-sidebar-collapsed') === 'true'
  );

  const handleToggle = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen(prev => !prev);
    } else {
      setIsCollapsed(prev => {
        const next = !prev;
        localStorage.setItem('stoq-sidebar-collapsed', next);
        return next;
      });
    }
  };

  return (
    <div className="stoq-app">
      {isMobileOpen && (
        <div className="stoq-sidebar-overlay" onClick={() => setIsMobileOpen(false)} />
      )}

      <Sidebar
        isOpen={isMobileOpen}
        isCollapsed={isCollapsed}
        onToggle={() => setIsMobileOpen(false)}
        role={role}
      />

      <div className="stoq-main" style={isCollapsed && window.innerWidth >= 768 ? { marginLeft: 0, width: '100%' } : {}}>
        <Header onToggleSidebar={handleToggle} role={role} />
        <div className="stoq-content">
          <Outlet context={{ role }} />
        </div>
      </div>

      <TweaksPanel />
    </div>
  );
};

export default DashboardLayout;
