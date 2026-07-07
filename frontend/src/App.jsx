import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginPage from './pages/Auth/LoginPage';
import OTPPage from './pages/Auth/OTPPage';
import GoogleSuccess from './pages/Auth/GoogleSuccess';
import AdminDashboard from './pages/Admin/AdminDashboard';
import CreateExam from './pages/Admin/CreateExam';
import ManageQuestions from './pages/Admin/ManageQuestions';
import ResultsDashboard from './pages/Admin/ResultsDashboard';
import StudentDashboard from './pages/Student/StudentDashboard';
import PreExamChecklist from './pages/Student/PreExamChecklist';
import ExamInterface from './pages/Student/ExamInterface';
import SubmittedScreen from './pages/Student/SubmittedScreen';
import ProtectedRoute from './components/ProtectedRoute';
import useAuthStore from './store/authStore';



function JoinRedirect() {
  const [params] = useSearchParams();
  const code = params.get('code');
  const navigate = useNavigate();
  const { token } = useAuthStore();

  useEffect(() => {
    if (code) {
      // Save synchronously FIRST before any navigation
      try {
        localStorage.setItem('examforge-redirect-code', code);
      } catch (e) {
        console.error('localStorage failed:', e);
      }
    }

    const timer = setTimeout(() => {
      if (!token) {
        navigate('/', { state: { code } });
      } else {
        navigate('/student', { state: { code } });
      }
    }, 100); // ✅ small delay ensures localStorage write completes first

    return () => clearTimeout(timer);
  }, []);

  return <div className="p-8 text-gray-400">Redirecting...</div>;
}


function App() {
  return (
    <BrowserRouter>
    <Toaster position="bottom-right" reverseOrder={false} />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/otp" element={<OTPPage />} />
        <Route path="/auth/google/success" element={<GoogleSuccess />} />
        <Route path="/join" element={<JoinRedirect />} />

        <Route path="/admin" element={
          <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="/admin/create" element={
          <ProtectedRoute role="admin"><CreateExam /></ProtectedRoute>
        } />
        <Route path="/admin/exam/:id" element={
          <ProtectedRoute role="admin"><ManageQuestions /></ProtectedRoute>
        } />
        <Route path="/admin/exam/:id/results" element={
          <ProtectedRoute role="admin"><ResultsDashboard /></ProtectedRoute>
        } />

        <Route path="/student" element={
          <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>
        } />
        <Route path="/student/checklist" element={
          <ProtectedRoute role="student"><PreExamChecklist /></ProtectedRoute>
        } />
        <Route path="/student/exam" element={
          <ProtectedRoute role="student"><ExamInterface /></ProtectedRoute>
        } />
        <Route path="/student/submitted" element={
          <ProtectedRoute role="student"><SubmittedScreen /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;