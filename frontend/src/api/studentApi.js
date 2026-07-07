import axiosInstance from './axiosInstance';

export const validateCodeApi = (code) => axiosInstance.post('/api/student/validate-code', { code });
export const getExamApi = (code) => axiosInstance.get(`/api/student/exam/${code}`);
export const submitExamApi = (data) => axiosInstance.post('/api/student/submit', data);
export const autoSaveApi = (data) => axiosInstance.post('/api/student/autosave', data);
export const logViolationApi = (data) => axiosInstance.post('/api/student/violation', data);
export const getMySubmissionsApi = () => axiosInstance.get('/api/student/my-submissions');
export const startExamSessionApi = (code) => axiosInstance.post('/api/student/start', { code });