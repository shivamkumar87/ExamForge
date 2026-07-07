import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function SubmittedScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { exam } = location.state || {};

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/student', { replace: true });
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
      <div className="bg-white rounded-3xl shadow-xl p-12 max-w-md w-full text-center">

        {/* Success Icon */}
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Submitted!
        </h1>
        <p className="text-gray-500 mb-6">
          Your exam has been submitted successfully.
        </p>

        {/* Exam Info */}
        {exam && (
          <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Exam</p>
            <p className="font-bold text-gray-800">{exam.title}</p>
            <p className="text-sm text-gray-500">{exam.subject}</p>
          </div>
        )}

        {/* Redirect Notice */}
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <svg className="animate-spin h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Redirecting to dashboard...
        </div>
      </div>
    </div>
  );
}