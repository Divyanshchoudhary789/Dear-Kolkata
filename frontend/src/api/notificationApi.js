import api from './axiosInstance';

/**
 * Notifications API — PRD §6
 */

export const getNotifications  = (params = {}, config = {}) => api.get('/notifications',             { params, ...config });
export const getUnreadCount    = (config = {})            => api.get('/notifications/unread-count', config);
export const markAsRead        = (id)          => api.put(`/notifications/${id}/read`);
export const markAllAsRead     = ()            => api.put('/notifications/mark-all-read');
export const deleteNotification= (id)          => api.delete(`/notifications/${id}`);
