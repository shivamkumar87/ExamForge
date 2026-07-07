import axiosInstance from './axiosInstance';

export const registerApi = (data) => axiosInstance.post('/api/auth/register', data);

export const loginApi = (data) => axiosInstance.post('/api/auth/login', data);

export const verifyOtpApi = (data) => axiosInstance.post('/api/auth/verify-otp', data);

export const resendOtpApi = (data) => axiosInstance.post('/api/auth/resend-otp', data);