import axiosInstance from './axiosInstance';
import axios from 'axios';

export const createExamApi = (data) => axiosInstance.post('/api/admin/exams', data);
export const getMyExamsApi = () => axiosInstance.get('/api/admin/exams');
export const getExamByIdApi = (id) => axiosInstance.get(`/api/admin/exams/${id}`);
export const updateExamApi = (id, data) => axiosInstance.put(`/api/admin/exams/${id}`, data);
export const deleteExamApi = (id) => axiosInstance.delete(`/api/admin/exams/${id}`);
export const finalizeExamApi = (id) => axiosInstance.post(`/api/admin/exams/${id}/finalize`);
export const addQuestionApi = (examId, data) => axiosInstance.post(`/api/admin/exams/${examId}/questions`, data);
export const updateQuestionApi = (id, data) => axiosInstance.put(`/api/admin/questions/${id}`, data);
export const deleteQuestionApi = (id) => axiosInstance.delete(`/api/admin/questions/${id}`);
export const getResultsApi = (examId) => axiosInstance.get(`/api/admin/exams/${examId}/results`);
export const overrideScoreApi = (answerId, score) => axiosInstance.put(`/api/admin/answers/${answerId}/override`, { score });
export const exportResultsApi = (examId) => `${import.meta.env.VITE_API_URL}/api/admin/exams/${examId}/export`;

// Add this next to your other api functions
export const extractQuestionApi = async (formData) => {
  // Assuming your axios instance is called 'api' or 'adminAxios'
  return await axiosInstance.post('/api/admin/questions/extract', formData, { 
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};