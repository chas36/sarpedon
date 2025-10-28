import { create } from 'zustand';
import type { AuthUser, Profile, Role } from '@/shared/types';

interface AuthStore {
  user: AuthUser | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  error: string | null;

  setUser: (user: AuthUser | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  reset: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  profile: null,
  role: null,
  loading: false,
  error: null,

  setUser: (user) => set({ user }),

  setProfile: (profile) => set({
    profile,
    role: profile?.role || null
  }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  logout: () => set({
    user: null,
    profile: null,
    role: null,
    error: null
  }),

  reset: () => set({
    user: null,
    profile: null,
    role: null,
    loading: false,
    error: null
  })
}));
