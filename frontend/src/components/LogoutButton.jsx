import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function LogoutButton() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <button
      onClick={handleLogout}
      className="fixed bottom-6 left-6 flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 transition z-50"
    >
      ⬡ Logout
    </button>
  );
}