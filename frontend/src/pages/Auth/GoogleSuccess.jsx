import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function GoogleSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const hasRun = useRef(false); // ✅ prevent StrictMode double execution

  useEffect(() => {
    if (hasRun.current) return; // ✅ skip second run
    hasRun.current = true;

    const token = params.get('token');
    const role = params.get('role');
    const name = params.get('name');
    const email = params.get('email');

    const redirectCode = localStorage.getItem('examforge-redirect-code');

    if (token && role) {
      setAuth({ name, email, role }, token);
      if (token && role) {
      setAuth({ name, email, role }, token);
      
      // 1. If there is a code, BUT the user is an admin -> Delete code, go to Admin Dashboard
      if (redirectCode && role === 'admin') {
        localStorage.removeItem('examforge-redirect-code');
        navigate('/admin');
      } 
      // 2. If there is a code, and they are NOT an admin -> Join Exam
      else if (redirectCode && role !== 'admin') {
        localStorage.removeItem('examforge-redirect-code'); // ✅ remove AFTER reading
        navigate(`/join?code=${redirectCode}`);
      } 
      // 3. Normal login (No code)
      else {
        navigate(role === 'admin' ? '/admin' : '/student');
      }
    }
    } else {
      navigate('/');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-blue-700 text-xl font-semibold">Signing you in...</div>
        <div className="text-gray-400 text-sm mt-2">Please wait</div>
      </div>
    </div>
  );
}