import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

// ─── Toast types ──────────────────────────────────────────────────────────────
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

// ─── DB notification types ────────────────────────────────────────────────────
export interface AppNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  read: boolean;
  timestamp: string;
  link?: string;
}

interface NotificationContextType {
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  notifications: AppNotification[];
  unreadCount: number;
  loadingNotifications: boolean;
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  // ── Toasts ────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── DB Notifications ──────────────────────────────────────────────────────
  const [notifications, setNotifications]               = useState<AppNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const intervalRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  const fetchNotifications = useCallback(async (userId: string) => {
    // FIX: never fetch if there's no authenticated user or no token
    if (!userId || !localStorage.getItem('token')) return;
    try {
      const response = await getNotifications(userId);
      setNotifications(response.data);
    } catch (err) {
      console.error('[Notifications] Fetch error:', err);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    currentUserIdRef.current = null;
    setNotifications([]);
  }, []);

  const startPolling = useCallback((userId: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    currentUserIdRef.current = userId;
    setLoadingNotifications(true);
    fetchNotifications(userId);
    intervalRef.current = setInterval(() => fetchNotifications(userId), 30000);
  }, [fetchNotifications]);

  // ── Start/stop polling based on auth state ────────────────────────────────
  // FIX: polling is now tied to the user being authenticated. When the user
  // logs out (isAuthenticated becomes false), polling stops immediately and
  // notifications are cleared — no more 401s on the public pages.
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      startPolling(user.id);
    } else {
      stopPolling();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, user?.id, startPolling, stopPolling]);

  // ── Public fetchNotifications (manual refresh) ────────────────────────────
  const initNotifications = useCallback(async (userId: string) => {
    if (!isAuthenticated) return;
    if (currentUserIdRef.current !== userId) {
      startPolling(userId);
    } else {
      await fetchNotifications(userId);
    }
  }, [isAuthenticated, startPolling, fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error('[Notifications] Mark as read error:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('[Notifications] Mark all read error:', err);
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      toasts, addToast, removeToast,
      notifications,
      unreadCount,
      loadingNotifications,
      fetchNotifications: initNotifications,
      markAsRead,
      markAllAsRead,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}