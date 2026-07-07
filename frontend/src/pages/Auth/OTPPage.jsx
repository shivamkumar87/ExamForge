import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyOtpApi, resendOtpApi } from '../../api/authApi';
import useAuthStore from '../../store/authStore';

export default function OTPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, role, redirectCode } = location.state || {};
  const setAuth = useAuthStore((s) => s.setAuth);

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!userId) navigate('/');
  }, [userId]);

  useEffect(() => {
    if (countdown === 0) { setCanResend(true); return; }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await verifyOtpApi({ userId, otp });
      const { token, role, name, email } = res.data;
      setAuth({ name, email, role }, token);

      // ✅ If came from invite link, redirect back to exam
      if (token && role) { // Assuming your setAuth is right above this
      
      // 1. If there is a code, BUT the user is an admin -> Delete code, go to Admin Dashboard
      if (redirectCode && role === 'admin') {
        localStorage.removeItem('examforge-redirect-code');
        navigate('/admin');
      } 
      // 2. If there is a code, and they are NOT an admin -> Join Exam
      else if (redirectCode && role !== 'admin') {
        localStorage.removeItem('examforge-redirect-code'); // ✅ Always clean up!
        navigate(`/join?code=${redirectCode}`);
      } 
      // 3. Normal login (No code)
      else {
        navigate(role === 'admin' ? '/admin' : '/student');
      }
    }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setCanResend(false);
    setCountdown(60);
    await resendOtpApi({ userId });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-blue-900 mb-2">ExamForge</h1>
        <p className="text-center text-gray-500 mb-6">Enter the 6-digit OTP sent to your email</p>

        {redirectCode && (
          <div className="bg-blue-50 text-blue-700 p-3 rounded-lg mb-4 text-sm font-semibold">
            🔗 After verification you'll be redirected to exam <span className="font-mono">{redirectCode}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        <input
          className="w-full border rounded-lg p-3 mb-4 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="000000"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
        />

        <button
          onClick={handleVerify}
          disabled={loading || otp.length !== 6}
          className="w-full bg-blue-700 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>

        <div className="text-center mt-4 text-sm text-gray-500">
          {canResend ? (
            <button onClick={handleResend} className="text-blue-600 font-semibold hover:underline">
              Resend OTP
            </button>
          ) : (
            <span>Resend OTP in {countdown}s</span>
          )}
        </div>
      </div>
    </div>
  );
}