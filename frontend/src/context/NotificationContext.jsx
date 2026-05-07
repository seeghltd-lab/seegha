import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import notificationService from '../services/notificationService';
import { useSocket, useSocketEvent } from './SocketContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [activeRecipient, setActiveRecipient] = useState(null); // { id, type }

  const fetchNotifications = useCallback(async (page = 1, append = false) => {
    if (!activeRecipient) return;
    try {
      const data = await notificationService.getNotifications(
        activeRecipient.id,
        activeRecipient.type,
        page
      );
      
      setNotifications(prev => append ? [...prev, ...data.notifications] : data.notifications);
      setPagination({
        page: data.page,
        totalPages: data.totalPages,
        total: data.total
      });
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  }, [activeRecipient]);

  const fetchUnreadCount = useCallback(async () => {
    if (!activeRecipient) return;
    try {
      const { count } = await notificationService.getUnreadCount(
        activeRecipient.id,
        activeRecipient.type
      );
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count', error);
    }
  }, [activeRecipient]);

  const setRecipient = useCallback((id, type) => {
    if (id && type) {
      setActiveRecipient({ id, type });
    } else {
      setActiveRecipient(null);
      setNotifications([]);
      setUnreadCount(0);
      setPagination({ page: 1, totalPages: 1, total: 0 });
    }
  }, []);

  const markAllAsRead = async () => {
    if (!activeRecipient) return;
    try {
      await notificationService.markAllAsRead(activeRecipient.id, activeRecipient.type);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      // Wait for socket event to actually update state,
      // or optimistically update it:
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  useEffect(() => {
    if (activeRecipient) {
      fetchNotifications(1);
      fetchUnreadCount();
    }
  }, [activeRecipient, fetchNotifications, fetchUnreadCount]);

  useSocketEvent('new-notification', (notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  });

  useSocketEvent('notification-read', ({ notificationId }) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    fetchUnreadCount();
  });

  useSocketEvent('notifications-all-read', () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  });

  const value = {
    notifications,
    unreadCount,
    pagination,
    activeRecipient,
    setRecipient,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};
