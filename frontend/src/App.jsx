import React, { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SocketProvider } from "./context/SocketContext";
import { AdminAuthProvider, useAdminAuth } from "./context/AdminAuthContext";
import { EmployeeAuthProvider, useEmployeeAuth } from "./context/EmployeeAuthContext";
import { NotificationProvider, useNotification } from "./context/NotificationContext";
import { PWAProvider } from "./context/PWAContext";
import { AdminRoute, EmployeeRoute } from "./components/ProtectedRoute";
import LoadingScreen from "./components/LoadingScreen";
import OfflineBanner from "./components/OfflineBanner";

// Eager load: auth and core layout
import AdminLogin from "./pages/admin/Login";
import EmployeeLogin from "./pages/employee/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import EmployeeDashboard from "./pages/employee/Dashboard";
import DashboardLayout from "./components/DashboardLayout";
import NotFound from "./pages/NotFound";
import PortalSelect from "./pages/PortalSelect";

// Admin Employee Pages — lazy loaded
const EmployeeList        = lazy(() => import("./pages/admin/employee/EmployeeList"));
const CreateEmployee      = lazy(() => import("./pages/admin/employee/CreateEmployee"));
const UpdateEmployee      = lazy(() => import("./pages/admin/employee/UpdateEmployee"));
const EmployeeDetail      = lazy(() => import("./pages/admin/employee/EmployeeDetail"));

// Admin Supplier & Stock Pages — lazy loaded
const SupplierPage        = lazy(() => import("./pages/admin/SupplierPage"));
const SupplierDetail      = lazy(() => import("./pages/admin/supplier/SupplierDetail"));
const StockManagement     = lazy(() => import("./pages/admin/stock/StockManagement"));
const StockDetail         = lazy(() => import("./pages/admin/stock/StockDetail"));
const AddStock            = lazy(() => import("./pages/admin/stock/AddStock"));
const DirectReceipt       = lazy(() => import("./pages/admin/stock/DirectReceipt"));
const StockHistory        = lazy(() => import("./pages/admin/stock/StockHistory"));
const ActivityLogPage     = lazy(() => import("./pages/admin/ActivityLogPage"));

// Other pages — lazy loaded
const AddEditSupplier     = lazy(() => import("./pages/admin/supplier/AddEditSupplier"));
const CategoryPage        = lazy(() => import("./pages/admin/category/CategoryPage"));
const AddEditCategory     = lazy(() => import("./pages/admin/category/AddEditCategory"));
const AdminProfile        = lazy(() => import("./pages/admin/AdminProfile"));
const SiteManagement      = lazy(() => import("./pages/admin/SiteManagement"));
const AddEditSite         = lazy(() => import("./pages/admin/site/AddEditSite"));
const SiteDetail          = lazy(() => import("./pages/admin/site/SiteDetail"));
const SiteAddStock        = lazy(() => import("./pages/admin/site/SiteAddStock"));
const SiteStockOut        = lazy(() => import("./pages/admin/site/SiteStockOut"));
const MigrateStock        = lazy(() => import("./pages/admin/site/MigrateStock"));
const SiteRecordWorkers   = lazy(() => import("./pages/admin/site/SiteRecordWorkers"));
const EmployeeProfile     = lazy(() => import("./pages/employee/EmployeeProfile"));
const RequisitionManagement = lazy(() => import("./pages/admin/RequisitionManagement"));
const ApproveRequisition  = lazy(() => import("./pages/admin/requisition/ApproveRequisition"));
const ReceiveRequisition  = lazy(() => import("./pages/admin/requisition/ReceiveRequisition"));
const PermissionManagement = lazy(() => import("./pages/admin/PermissionManagement"));
const NotificationsPage   = lazy(() => import("./pages/admin/NotificationsPage"));
const EmployeeRequisitionPage = lazy(() => import("./pages/employee/RequisitionPage"));
const EmployeeRequisitionDetail = lazy(() => import("./pages/employee/RequisitionDetail"));
const RequisitionDetail   = lazy(() => import("./pages/admin/requisition/RequisitionDetail"));
const CreateRequisition   = lazy(() => import("./pages/admin/requisition/CreateRequisition"));
const EditRequisition     = lazy(() => import("./pages/admin/requisition/EditRequisition"));
const DataExportPage      = lazy(() => import("./pages/admin/DataExportPage"));
const ReportsPage         = lazy(() => import("./pages/admin/ReportsPage"));
const CreatePurchaseOrder = lazy(() => import("./pages/admin/purchaseOrder/CreatePurchaseOrder"));
const ReceivePurchaseOrder = lazy(() => import("./pages/admin/purchaseOrder/ReceivePurchaseOrder"));

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
    <PWAProvider>
    <SocketProvider>
      <OfflineBanner />
      <AdminAuthProvider>
        <EmployeeAuthProvider>
          <NotificationProvider>
            <BrowserRouter>
              <NotificationBridge />
              <Suspense fallback={<LoadingScreen />}>
                <Routes>
                <Route path="/" element={<PortalSelect />} />

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
                    <Route path="/stock/:id"                 element={<StockDetail />} />

                    {/* Categories — matches Sidebar path="/categories" */}
                    <Route path="/categories"                element={<CategoryPage />} />
                    <Route path="/categories/add"            element={<AddEditCategory />} />
                    <Route path="/categories/edit/:id"       element={<AddEditCategory />} />

                    {/* Suppliers — matches Sidebar path="/suppliers" */}
                    <Route path="/suppliers"                 element={<SupplierPage />} />
                    <Route path="/suppliers/add"             element={<AddEditSupplier />} />
                    <Route path="/suppliers/edit/:id"        element={<AddEditSupplier />} />
                    <Route path="/suppliers/:id"             element={<SupplierDetail />} />

                    {/* Purchase Orders */}
                    <Route path="/purchase-orders/create"         element={<CreatePurchaseOrder />} />
                    <Route path="/purchase-orders/:id/receive"    element={<ReceivePurchaseOrder />} />

                    {/* Sites — matches Sidebar path="/sites" */}
                    <Route path="/sites"                          element={<SiteManagement />} />
                    <Route path="/sites/add"                      element={<AddEditSite />} />
                    <Route path="/sites/edit/:id"                 element={<AddEditSite />} />
                    <Route path="/sites/:siteId/stock/add"        element={<SiteAddStock />} />
                    <Route path="/sites/:siteId/stock-out/add"    element={<SiteStockOut />} />
                    <Route path="/sites/:siteId/migrate-stock"    element={<MigrateStock />} />
                    <Route path="/sites/:siteId/workers/add"      element={<SiteRecordWorkers />} />
                    <Route path="/sites/:id"                      element={<SiteDetail />} />

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
                    <Route path="/admin/stock/:id"           element={<StockDetail />} />

                    <Route path="/admin/activity-log"        element={<ActivityLogPage />} />

                    <Route path="/admin/requisition-management"              element={<RequisitionManagement />} />
                    <Route path="/admin/requisition-management/create"       element={<CreateRequisition />} />
                    <Route path="/admin/requisition-management/approve/:id"  element={<ApproveRequisition />} />
                    <Route path="/admin/requisition-management/receive/:id"  element={<ReceiveRequisition />} />
                    <Route path="/admin/requisition-management/edit/:id"     element={<EditRequisition />} />
                    <Route path="/admin/requisition-management/:id"          element={<RequisitionDetail />} />

                    <Route path="/admin/permissions"         element={<PermissionManagement />} />
                    <Route path="/admin/notifications"       element={<NotificationsPage />} />
                    <Route path="/admin/profile"             element={<AdminProfile />} />
                    <Route path="/admin/site-management"              element={<SiteManagement />} />
                    <Route path="/admin/sites/add"                    element={<AddEditSite />} />
                    <Route path="/admin/sites/edit/:id"               element={<AddEditSite />} />
                    <Route path="/admin/sites/:siteId/stock/add"      element={<SiteAddStock />} />
                    <Route path="/admin/sites/:siteId/stock-out/add"  element={<SiteStockOut />} />
                    <Route path="/admin/sites/:siteId/migrate-stock"  element={<MigrateStock />} />
                    <Route path="/admin/sites/:siteId/workers/add"    element={<SiteRecordWorkers />} />
                    <Route path="/admin/sites/:id"                    element={<SiteDetail />} />

                    <Route path="/admin/data-export"                  element={<DataExportPage />} />
                    <Route path="/admin/reports"                       element={<ReportsPage />} />

                    {/* Purchase Orders */}
                    <Route path="/admin/purchase-orders/create"       element={<CreatePurchaseOrder />} />
                    <Route path="/admin/purchase-orders/:id/receive"  element={<ReceivePurchaseOrder />} />

                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Route>

                {/* Global 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </BrowserRouter>
          </NotificationProvider>
        </EmployeeAuthProvider>
      </AdminAuthProvider>
    </SocketProvider>
    </PWAProvider>
  );
}

export default App;

