import api from './api';

export const getStudentProfile = async () => {
  const res = await api.get('/student/me');
  return res.data;
};

export const updateStudentProfile = async (data) => {
  const res = await api.put('/student/profile', data);
  return res.data;
};

export const getStudentPlatforms = async () => {
  const res = await api.get('/student/platforms');
  return res.data;
};

export const syncStudentPlatforms = async (urls = {}) => {
  const res = await api.post('/student/platforms/sync', urls);
  return res.data;
};

export const getStudentScore = async () => {
  const res = await api.get('/student/score');
  return res.data;
};

export const getStudentRank = async () => {
  const res = await api.get('/student/rank');
  return res.data;
};

export const studentService = {
  getProfile: getStudentProfile,
  updateProfile: updateStudentProfile,
  getPlatforms: getStudentPlatforms,
  syncPlatforms: syncStudentPlatforms,
  getScore: getStudentScore,
  getRank: getStudentRank,
};

export default studentService;
