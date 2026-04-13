import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { EmployeeAuthProvider } from './context/EmployeeAuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AdminRoute, EmployeeRoute } from './components/ProtectedRoute';

import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import EmployeeLogin from './pages/employee/Login';
import EmployeeDashboard from './pages/employee/Dashboard';
import DashboardLayout from './components/DashboardLayout';

// Admin Employee Pages
import EmployeeList from './pages/admin/employee/EmployeeList';
import CreateEmployee from './pages/admin/employee/CreateEmployee';
import UpdateEmployee from './pages/admin/employee/UpdateEmployee';
import EmployeeDetail from './pages/admin/employee/EmployeeDetail';

function App() {
  return (
    <SocketProvider>
      <AdminAuthProvider>
        <EmployeeAuthProvider>
          <NotificationProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Redirect */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Employee Routes */}
                <Route path="/login" element={<EmployeeLogin />} />
                <Route element={<EmployeeRoute />}>
                  <Route element={<DashboardLayout role="employee" />}>
                    <Route path="/dashboard" element={<EmployeeDashboard />} />
                    {/* Future employee internal routes */}
                  </Route>
                </Route>

                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route element={<AdminRoute />}>
                  <Route element={<DashboardLayout role="admin" />}>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    
                    {/* Admin Employee Management */}
                    <Route path="/admin/employees" element={<EmployeeList />} />
                    <Route path="/admin/employees/new" element={<CreateEmployee />} />
                    <Route path="/admin/employees/edit/:id" element={<UpdateEmployee />} />
                    <Route path="/admin/employees/:id" element={<EmployeeDetail />} />
                    
                    {/* Other admin routes can go here */}
                  </Route>
                </Route>

                {/* Catch-all Redirect */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </BrowserRouter>
          </NotificationProvider>
        </EmployeeAuthProvider>
      </AdminAuthProvider>
    </SocketProvider>
  );
}

export default App;
