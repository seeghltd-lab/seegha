import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { EmployeeAuthProvider, useEmployeeAuth } from './context/EmployeeAuthContext';
import { NotificationProvider, useNotification } from './context/NotificationContext';
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

// Admin Supplier & Stock Pages
import SupplierPage from './pages/admin/SupplierPage';
import StockManagement from './pages/admin/stock/StockManagement';
import AddStock from './pages/admin/stock/AddStock';

// Newly Migrated/Created pages
import AddEditSupplier from './pages/admin/supplier/AddEditSupplier';
import CategoryPage from './pages/admin/category/CategoryPage';
import AddEditCategory from './pages/admin/category/AddEditCategory';
import AdminProfile from './pages/admin/AdminProfile';
import SiteManagement from './pages/admin/SiteManagement';
import EmployeeProfile from './pages/employee/EmployeeProfile';
import RequisitionManagement from './pages/admin/RequisitionManagement';
import EmployeeRequisitionPage from './pages/employee/RequisitionPage';
// Bridge component: sits inside all providers, wires auth state → notification recipient
function NotificationBridge() {
  const { admin, isAuthenticated: adminAuth } = useAdminAuth();
  const { employee, isAuthenticated: empAuth } = useEmployeeAuth();
  const { setRecipient } = useNotification();

  useEffect(() => {
    if (adminAuth && admin?.id) {
      setRecipient(admin.id, 'ADMIN');
    } else if (empAuth && employee?.id) {
      setRecipient(employee.id, 'EMPLOYEE');
    } else {
      setRecipient(null, null);
    }
  }, [adminAuth, admin?.id, empAuth, employee?.id, setRecipient]);

  return null;
}

function App() {
  return (
    <SocketProvider>
      <AdminAuthProvider>
        <EmployeeAuthProvider>
          <NotificationProvider>
            <BrowserRouter>
              <NotificationBridge />
              <Routes>
                {/* Public Redirect */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Employee Routes */}
                <Route path="/login" element={<EmployeeLogin />} />
                <Route element={<EmployeeRoute />}>
                  <Route element={<DashboardLayout role="employee" />}>
                    <Route path="/dashboard" element={<EmployeeDashboard />} />
                    <Route path="/profile" element={<EmployeeProfile />} />
                    <Route path="/requisitions" element={<EmployeeRequisitionPage />} />
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

                    {/* Admin Supplier Management */}
                    <Route path="/admin/suppliers" element={<SupplierPage />} />
                    <Route path="/admin/suppliers/add" element={<AddEditSupplier />} />
                    <Route path="/admin/suppliers/edit/:id" element={<AddEditSupplier />} />

                    {/* Admin Category Management */}
                    <Route path="/admin/categories" element={<CategoryPage />} />
                    <Route path="/admin/categories/add" element={<AddEditCategory />} />
                    <Route path="/admin/categories/edit/:id" element={<AddEditCategory />} />

                    {/* Admin Stock Management */}
                    <Route path="/admin/stock" element={<StockManagement />} />
                    <Route path="/admin/stock/add" element={<AddStock />} />
                    <Route path="/admin/stock/edit/:id" element={<AddStock />} />

                    {/* Admin Requisition Management */}
                    <Route path="/admin/requisition-management" element={<RequisitionManagement />} />

                    {/* Admin Profile & Config */}
                    <Route path="/admin/profile" element={<AdminProfile />} />
                    <Route path="/admin/site-management" element={<SiteManagement />} />
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
