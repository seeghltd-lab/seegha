import React, { createContext, useContext, useEffect, useState } from 'react';
import employeeAuthService from '../services/employeeAuthService';
import { subscribePush, unsubscribePush, checkPushSubscribed } from '../lib/push';
import { useSocket, useSocketEvent } from './SocketContext';

const EmployeeAuthContext = createContext(null);

export const EmployeeAuthProvider = ({ children }) => {
  const [employee, setEmployee] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribedToNotifications, setIsSubscribedToNotifications] = useState(false);
  
  const { on, emit, socket, isConnected } = useSocket();

  const updateAuthState = (userData, authStatus) => {
    setEmployee(userData);
    setIsAuthenticated(authStatus);
    if (!authStatus) {
      setIsSubscribedToNotifications(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await employeeAuthService.login(credentials);
      updateAuthState(response.employee, true);
      return response.employee;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await employeeAuthService.logout();
    } finally {
      updateAuthState(null, false);
    }
  };

  const checkAuthStatus = async () => {
    setIsLoading(true);
    try {
      const profile = await employeeAuthService.getProfile();
      updateAuthState(profile, true);
    } catch {
      updateAuthState(null, false);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToNotifications = async () => {
    if (!employee?.id) return;
    try {
      const res = await subscribePush(employee.id, 'EMPLOYEE');
      if (res) setIsSubscribedToNotifications(true);
    } catch (error) {
      console.error('Push sub error', error);
    }
  };

  const unsubscribeFromNotifications = async () => {
    if (!employee?.id) return;
    try {
      await unsubscribePush(employee.id, 'EMPLOYEE');
      setIsSubscribedToNotifications(false);
    } catch (error) {
      console.error('Push unsub error', error);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (isAuthenticated && employee?.id) {
      checkPushSubscribed(employee.id, 'EMPLOYEE').then(setIsSubscribedToNotifications);
    }
  }, [isAuthenticated, employee?.id]);

  useEffect(() => {
    if (isAuthenticated && employee?.id && isConnected) {
      emit('registerUser', { id: employee.id, type: 'EMPLOYEE' });
    }
  }, [isAuthenticated, employee?.id, isConnected, emit]);

  // Real-time permission updates
  useSocketEvent('permissionAssigned', (data) => {
    setEmployee((prev) => {
      if (!prev) return prev;
      const newPermissions = [...(prev.permissions || [])];
      // ensure no duplicate
      if (!newPermissions.find(p => p.permission.name === data.permission.name)) {
        newPermissions.push({ permission: data.permission });
      }
      return { ...prev, permissions: newPermissions };
    });
  });

  useSocketEvent('permissionRemoved', (data) => {
    setEmployee((prev) => {
      if (!prev) return prev;
      const newPermissions = (prev.permissions || []).filter(
        p => p.permission.id !== data.permissionId
      );
      return { ...prev, permissions: newPermissions };
    });
  });

  const value = {
    employee,
    isAuthenticated,
    isLoading,
    isSubscribedToNotifications,
    login,
    logout,
    subscribeToNotifications,
    unsubscribeFromNotifications,
  };

  return (
    <EmployeeAuthContext.Provider value={value}>
      {children}
    </EmployeeAuthContext.Provider>
  );
};

export const useEmployeeAuth = () => {
  const context = useContext(EmployeeAuthContext);
  if (!context) throw new Error('useEmployeeAuth must be used within EmployeeAuthProvider');
  return context;
};
