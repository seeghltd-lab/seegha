import React, { createContext, useContext, useEffect, useState } from 'react';
import adminAuthService from '../services/adminAuthService';
import { subscribePush, unsubscribePush, checkPushSubscribed } from '../lib/push';
import { useSocket } from './SocketContext';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribedToNotifications, setIsSubscribedToNotifications] = useState(false);
  
  const { on, emit, socket, isConnected } = useSocket();

  const updateAuthState = (userData, authStatus) => {
    setAdmin(userData);
    setIsAuthenticated(authStatus);
    if (!authStatus) {
      setIsSubscribedToNotifications(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await adminAuthService.login(credentials);
      updateAuthState(response.admin, true);
      return response.admin;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await adminAuthService.logout();
    } finally {
      updateAuthState(null, false);
    }
  };

  const checkAuthStatus = async () => {
    setIsLoading(true);
    try {
      const profile = await adminAuthService.getProfile();
      updateAuthState(profile, true);
    } catch {
      updateAuthState(null, false);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToNotifications = async () => {
    if (!admin?.id) return;
    try {
      const res = await subscribePush(admin.id, 'ADMIN');
      if (res) setIsSubscribedToNotifications(true);
    } catch (error) {
      console.error('Push sub error', error);
    }
  };

  const unsubscribeFromNotifications = async () => {
    if (!admin?.id) return;
    try {
      await unsubscribePush(admin.id, 'ADMIN');
      setIsSubscribedToNotifications(false);
    } catch (error) {
      console.error('Push unsub error', error);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (isAuthenticated && admin?.id) {
      checkPushSubscribed(admin.id, 'ADMIN').then(setIsSubscribedToNotifications);
    }
  }, [isAuthenticated, admin?.id]);

  useEffect(() => {
    if (isAuthenticated && admin?.id && isConnected) {
      emit('registerUser', { id: admin.id, type: 'ADMIN' });
    }
  }, [isAuthenticated, admin?.id, isConnected, emit]);

  const value = {
    admin,
    isAuthenticated,
    isLoading,
    isSubscribedToNotifications,
    login,
    logout,
    subscribeToNotifications,
    unsubscribeFromNotifications,
    refreshProfile: checkAuthStatus,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return context;
};
