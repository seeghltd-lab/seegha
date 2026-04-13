import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';

export const AdminRoute = () => {
  const { isAuthenticated, isLoading } = useAdminAuth();
  if (isLoading) return <div>Loading...</div>;
  return isAuthenticated ? <Outlet /> : <Navigate to="/admin/login" />;
};

export const EmployeeRoute = () => {
  const { isAuthenticated, isLoading } = useEmployeeAuth();
  if (isLoading) return <div>Loading...</div>;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};
