import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SocketProvider } from "./context/SocketContext";
import { AdminAuthProvider, useAdminAuth } from "./context/AdminAuthContext";
import { EmployeeAuthProvider, useEmployeeAuth } from "./context/EmployeeAuthContext";
import { NotificationProvider, useNotification } from "./context/NotificationContext";
import { AdminRoute, EmployeeRoute } from "./components/ProtectedRoute";

import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import EmployeeLogin from "./pages/employee/Login";
import EmployeeDashboard from "./pages/employee/Dashboard";
import DashboardLayout from "./components/DashboardLayout";
import NotFound from "./pages/NotFound";

// Admin Employee Pages
import EmployeeList from "./pages/admin/employee/EmployeeList";
import CreateEmployee from "./pages/admin/employee/CreateEmployee";
import UpdateEmployee from "./pages/admin/employee/UpdateEmployee";
import EmployeeDetail from "./pages/admin/employee/EmployeeDetail";

// Admin Supplier & Stock Pages
import SupplierPage from "./pages/admin/SupplierPage";
import SupplierDetail from "./pages/admin/supplier/SupplierDetail";
import StockManagement from "./pages/admin/stock/StockManagement";
import AddStock from "./pages/admin/stock/AddStock";
import DirectReceipt from "./pages/admin/stock/DirectReceipt";
import StockHistory from "./pages/admin/stock/StockHistory";
import ActivityLogPage from "./pages/admin/ActivityLogPage";

// Other pages
import AddEditSupplier from "./pages/admin/supplier/AddEditSupplier";
import CategoryPage from "./pages/admin/category/CategoryPage";
import AddEditCategory from "./pages/admin/category/AddEditCategory";
import AdminProfile from "./pages/admin/AdminProfile";
import SiteManagement from "./pages/admin/SiteManagement";
import AddEditSite from "./pages/admin/site/AddEditSite";
import SiteDetail from "./pages/admin/site/SiteDetail";
import EmployeeProfile from "./pages/employee/EmployeeProfile";
import RequisitionManagement from "./pages/admin/RequisitionManagement";
import ApproveRequisition from "./pages/admin/requisition/ApproveRequisition";
import ReceiveRequisition from "./pages/admin/requisition/ReceiveRequisition";
import PermissionManagement from "./pages/admin/PermissionManagement";
import NotificationsPage from "./pages/admin/NotificationsPage";
import EmployeeRequisitionPage from "./pages/employee/RequisitionPage";
import EmployeeRequisitionDetail from "./pages/employee/RequisitionDetail";
import RequisitionDetail from "./pages/admin/requisition/RequisitionDetail";
import CreateRequisition from "./pages/admin/requisition/CreateRequisition";

function NotificationBridge() {
  const { admin, isAuthenticated: adminAuth } = useAdminAuth();
  const { employee, isAuthenticated: empAuth } = useEmployeeAuth();
  const { setRecipient } = useNotification();
  useEffect(() => {
    if (adminAuth && admin?.id) setRecipient(admin.id, "ADMIN");
    else if (empAuth && employee?.id) setRecipient(employee.id, "EMPLOYEE");
    else setRecipient(null, null);
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
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Employee Routes */}
                <Route path="/login" element={<EmployeeLogin />} />
                <Route element={<EmployeeRoute />}>
                  <Route element={<DashboardLayout role="employee" />}>
                    <Route path="/dashboard"     element={<EmployeeDashboard />} />
                    <Route path="/profile"       element={<EmployeeProfile />} />
                    <Route path="/notifications" element={<NotificationsPage />} />

                    {/* Requisitions — specific routes before /:id */}
                    <Route path="/requisitions"              element={<EmployeeRequisitionPage />} />
                    <Route path="/requisitions/create"       element={<CreateRequisition />} />
                    <Route path="/requisitions/approve/:id"  element={<ApproveRequisition />} />
                    <Route path="/requisitions/receive/:id"  element={<ReceiveRequisition />} />
                    <Route path="/requisitions/detail/:id"   element={<RequisitionDetail />} />
                    <Route path="/requisitions/:id"          element={<EmployeeRequisitionDetail />} />

                    {/* Stock — matches Sidebar path="/stock" */}
                    <Route path="/stock"                     element={<StockManagement />} />
                    <Route path="/stock/add"                 element={<AddStock />} />
                    <Route path="/stock/edit/:id"            element={<AddStock />} />
                    <Route path="/stock/direct-receipt"      element={<DirectReceipt />} />
                    <Route path="/stock/history"             element={<StockHistory />} />

                    {/* Categories — matches Sidebar path="/categories" */}
                    <Route path="/categories"                element={<CategoryPage />} />
                    <Route path="/categories/add"            element={<AddEditCategory />} />
                    <Route path="/categories/edit/:id"       element={<AddEditCategory />} />

                    {/* Suppliers — matches Sidebar path="/suppliers" */}
                    <Route path="/suppliers"                 element={<SupplierPage />} />
                    <Route path="/suppliers/add"             element={<AddEditSupplier />} />
                    <Route path="/suppliers/edit/:id"        element={<AddEditSupplier />} />
                    <Route path="/suppliers/:id"             element={<SupplierDetail />} />

                    {/* Sites — matches Sidebar path="/sites" */}
                    <Route path="/sites"                     element={<SiteManagement />} />
                    <Route path="/sites/add"                 element={<AddEditSite />} />
                    <Route path="/sites/edit/:id"            element={<AddEditSite />} />
                    <Route path="/sites/:id"                 element={<SiteDetail />} />

                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Route>

                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route element={<AdminRoute />}>
                  <Route element={<DashboardLayout role="admin" />}>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />

                    <Route path="/admin/employees"           element={<EmployeeList />} />
                    <Route path="/admin/employees/new"       element={<CreateEmployee />} />
                    <Route path="/admin/employees/edit/:id"  element={<UpdateEmployee />} />
                    <Route path="/admin/employees/:id"       element={<EmployeeDetail />} />

                    <Route path="/admin/suppliers"           element={<SupplierPage />} />
                    <Route path="/admin/suppliers/add"       element={<AddEditSupplier />} />
                    <Route path="/admin/suppliers/edit/:id"  element={<AddEditSupplier />} />
                    <Route path="/admin/suppliers/:id"       element={<SupplierDetail />} />

                    <Route path="/admin/categories"          element={<CategoryPage />} />
                    <Route path="/admin/categories/add"      element={<AddEditCategory />} />
                    <Route path="/admin/categories/edit/:id" element={<AddEditCategory />} />

                    <Route path="/admin/stock"               element={<StockManagement />} />
                    <Route path="/admin/stock/add"           element={<AddStock />} />
                    <Route path="/admin/stock/edit/:id"      element={<AddStock />} />
                    <Route path="/admin/stock/direct-receipt" element={<DirectReceipt />} />
                    <Route path="/admin/stock/history"       element={<StockHistory />} />

                    <Route path="/admin/activity-log"        element={<ActivityLogPage />} />

                    <Route path="/admin/requisition-management"              element={<RequisitionManagement />} />
                    <Route path="/admin/requisition-management/create"       element={<CreateRequisition />} />
                    <Route path="/admin/requisition-management/approve/:id"  element={<ApproveRequisition />} />
                    <Route path="/admin/requisition-management/receive/:id"  element={<ReceiveRequisition />} />
                    <Route path="/admin/requisition-management/:id"          element={<RequisitionDetail />} />

                    <Route path="/admin/permissions"         element={<PermissionManagement />} />
                    <Route path="/admin/notifications"       element={<NotificationsPage />} />
                    <Route path="/admin/profile"             element={<AdminProfile />} />
                    <Route path="/admin/site-management"     element={<SiteManagement />} />
                    <Route path="/admin/sites/add"           element={<AddEditSite />} />
                    <Route path="/admin/sites/edit/:id"      element={<AddEditSite />} />
                    <Route path="/admin/sites/:id"           element={<SiteDetail />} />

                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Route>

                {/* Global 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </NotificationProvider>
        </EmployeeAuthProvider>
      </AdminAuthProvider>
    </SocketProvider>
  );
}

export default App;

