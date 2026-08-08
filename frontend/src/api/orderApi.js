import api from './axiosInstance';

/**
 * Orders API — PRD §4.4, §4.5, §4.6
 */

// Client: place order from cart items
export const createOrder = (orderData) => api.post('/orders/create', orderData);

// Client: get own orders
export const getMyOrders = (params = {}) => api.get('/orders/my-orders', { params });

// Client: request return (within 7-day window)
export const requestReturn = (orderId, reason, description = '') =>
  api.post(`/orders/${orderId}/return`, { reason, description });

// Vendor: get vendor's orders
export const getVendorOrders = (params = {}) => api.get('/orders/vendor/orders', { params });

// Vendor: update order status (Packed / Shipped / Delivered)
export const updateOrderStatus = (orderId, status, extra = {}) =>
  api.put(`/orders/${orderId}/status`, { status, ...extra });

// Vendor: handle return decision (approve / reject)
export const handleReturnDecision = (orderId, approved, rejectReason = '') =>
  api.put(`/orders/${orderId}/return-decision`, { approved, rejectReason });

// Admin: get all orders
export const getAllOrders = (params = {}) => api.get('/orders/admin/orders', { params });

// Admin: resolve dispute
export const resolveDispute = (orderId, favorClient, adminNotes = '') =>
  api.put(`/orders/${orderId}/resolve-dispute`, { favorClient, adminNotes });

// Get single order by ID
export const getOrderById = (orderId) => api.get(`/orders/${orderId}`);
