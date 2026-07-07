import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      role: null,
      user: null,

      setAuth: (user, token) => {
        set({ token, role: user.role, user });
      },

      logout: () => {
        set({ token: null, role: null, user: null });
      },
    }),
    {
      name: 'examforge-auth',
    }
  )
);

export default useAuthStore;