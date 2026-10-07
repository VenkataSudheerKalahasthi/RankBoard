import api from './api';

export const showcaseService = {
  /**
   * Fetch sanitized public showcase by student ID or roll number
   */
  getPublicShowcase: async (studentId) => {
    const response = await api.get(`/showcase/${encodeURIComponent(studentId)}`);
    return response.data;
  },

  /**
   * Fetch current authenticated student's showcase preview & settings
   */
  getMyShowcase: async () => {
    const response = await api.get('/showcase/me/preview');
    return response.data;
  },

  /**
   * Upload profile image to Cloudinary CDN via secure backend endpoint
   * @param {File} file - Image file
   */
  uploadProfilePhoto: async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post('/showcase/profile-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Update showcase privacy settings & optional bio
   */
  updateShowcaseSettings: async (settings) => {
    const response = await api.put('/showcase/settings', settings);
    return response.data;
  },
};
