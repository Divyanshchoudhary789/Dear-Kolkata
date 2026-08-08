import api from './axiosInstance';

/**
 * Products API — PRD §4.2, §4.3
 */

// Get all approved products (public, with filters)
export const getProducts = (params = {}) => api.get('/products', { params });

// Get a single product by ID or slug
export const getProductById = (id) => api.get(`/products/${id}`);

// Vendor: get own products
export const getVendorProducts = (params = {}) =>
  api.get('/products/vendor/my-products', { params });

// Vendor: create product
export const createProduct = (data) => api.post('/products', data);

// Vendor/Admin: update product
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);

// Vendor/Admin: soft-delete product
export const deleteProduct = (id) => api.delete(`/products/${id}`);

// Vendor: upload product images (multipart/form-data)
export const uploadProductImages = (id, formData) =>
  api.post(`/products/${id}/upload-images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// Vendor: delete a specific image
export const deleteProductImage = (id, publicId) =>
  api.delete(`/products/${id}/images/${encodeURIComponent(publicId)}`);

// Admin: get pending products for moderation
export const getPendingProducts = (params = {}) =>
  api.get('/admin/products/pending', { params });

// Admin: approve product
export const approveProduct = (id, notes = '') =>
  api.put(`/admin/products/${id}/approve`, { notes });

// Admin: reject product
export const rejectProduct = (id, reason) =>
  api.put(`/admin/products/${id}/reject`, { reason });
