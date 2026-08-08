import api from './axiosInstance';

export const getClientProfile = () => api.get('/client/profile');
export const updateClientProfile = (data) => api.put('/client/profile', data);
export const uploadAvatar = (formData) =>
  api.post('/client/upload-avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
