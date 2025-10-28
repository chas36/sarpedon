import { useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import * as authApi from '../api/authApi';
import type { LoginCredentials } from '@/shared/types';

export function useAuth() {
  const {
    user,
    profile,
    role,
    loading,
    error,
    setUser,
    setProfile,
    setLoading,
    setError,
    logout: clearAuthState
  } = useAuthStore();

  const handleLogin = useCallback(async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      setError(null);

      // Login
      const { user: authUser } = await authApi.login(credentials);

      if (!authUser) {
        throw new Error('Login failed - no user returned');
      }

      // Get profile
      const userProfile = await authApi.getProfile(authUser.id);

      // Update store
      setUser(authUser);
      setProfile(userProfile);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setUser, setProfile]);

  const handleLogout = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await authApi.logout();
      clearAuthState();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, clearAuthState]);

  return {
    user,
    profile,
    role,
    loading,
    error,
    isAuthenticated: !!user,
    handleLogin,
    handleLogout
  };
}
