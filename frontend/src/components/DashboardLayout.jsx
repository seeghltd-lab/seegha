import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import TweaksPanel from './TweaksPanel';

const DashboardLayout = ({ role }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="stoq-app">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div className="stoq-sidebar-overlay" onClick={toggleSidebar} />
      )}

      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        role={role}
      />

      <div className="stoq-main">
        <Header onToggleSidebar={toggleSidebar} role={role} />
        <div className="stoq-content">
          <Outlet context={{ role }} />
        </div>
      </div>

      {/* Tweaks panel — fixed, persisted in localStorage */}
      <TweaksPanel />
    </div>
  );
};

export default DashboardLayout;
