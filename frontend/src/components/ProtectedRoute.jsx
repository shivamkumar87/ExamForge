import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function ProtectedRoute({ children, role }) {
  const authToken = useAuthStore((s) => s.token);
  const userRole = useAuthStore((s) => s.role);

  if (!authToken) return <Navigate to="/" />;
  if (role && userRole !== role) return <Navigate to="/" />;
  return children;
}