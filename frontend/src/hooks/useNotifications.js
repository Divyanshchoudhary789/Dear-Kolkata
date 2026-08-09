import { useState, useEffect, useCallback } from 'react';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../api/notificationApi';

/**
 * Hook that polls the backend for notifications and exposes helpers.
 * Used inside AppContext so the entire app has live notification state.
 * @param {boolean} active – only poll when a user is logged in
 */
const useNotifications = (active = false) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(false);

  const fetchNotifications = useCallback(async (signal) => {
    if (!active) return;
    try {
      const res = await getNotifications({ limit: 30 }, { signal });
      if (res?.success) {
        setNotifications(res.data.notifications);
      }
    } catch (_) { /* silent — user might be mid-auth */ }
  }, [active]);

  const fetchUnreadCount = useCallback(async (signal) => {
    if (!active) return;
    try {
      const res = await getUnreadCount(undefined, { signal });
      if (res?.success) setUnreadCount(res.data.unreadCount);
    } catch (_) { /* silent */ }
  }, [active]);

  // Poll every 30 seconds when logged in
  useEffect(() => {
    if (!active) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    fetchNotifications(signal);
    fetchUnreadCount(signal);

    const id = setInterval(() => {
      fetchNotifications(signal);
      fetchUnreadCount(signal);
    }, 30_000);

    return () => {
      clearInterval(id);
      controller.abort();
    };
  }, [active, fetchNotifications, fetchUnreadCount]);

  const handleMarkAsRead = useCallback(async (id) => {
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (_) { /* silent */ }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (_) { /* silent */ }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    refetch: fetchNotifications,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
  };
};

export default useNotifications;
