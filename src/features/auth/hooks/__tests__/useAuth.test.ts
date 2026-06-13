import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock environment variables before importing modules
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

// Mock the auth API and supabase
vi.mock('../../api/authApi');
vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn()
    },
    from: vi.fn()
  }
}));

import { useAuth } from '../useAuth';
import { useAuthStore } from '../../store/authStore';
import * as authApi from '../../api/authApi';

describe('useAuth Hook', () => {
  beforeEach(() => {
    // Reset auth store before each test
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.reset();
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  it('should initialize with auth store state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle successful login', async () => {
    const mockUser = { id: '123', email: 'student123@sarpedon.local' };
    const mockProfile = {
      id: '123',
      first_name: 'Test',
      last_name: 'Student',
      role: 'student' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    vi.mocked(authApi.login).mockResolvedValue({
      user: mockUser,
      session: null
    } as any);

    vi.mocked(authApi.getProfile).mockResolvedValue(mockProfile);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.handleLogin({ login: 'student123', password: 'password123' });
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    expect(authApi.login).toHaveBeenCalledWith({
      login: 'student123',
      password: 'password123'
    });
    expect(authApi.getProfile).toHaveBeenCalledWith('123');
  });

  it('should handle login error', async () => {
    const mockError = new Error('Invalid credentials');

    vi.mocked(authApi.login).mockRejectedValue(mockError);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.handleLogin({ login: 'wrong', password: 'wrong' });
      } catch (err) {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Invalid credentials');
      expect(result.current.user).toBeNull();
      expect(result.current.profile).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  it('should set loading state during login', async () => {
    const mockUser = { id: '123', email: 'student123@sarpedon.local' };

    vi.mocked(authApi.login).mockImplementation(
      () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({ user: mockUser, session: null } as any);
        }, 100);
      })
    );

    vi.mocked(authApi.getProfile).mockResolvedValue({
      id: '123',
      first_name: 'Test',
      last_name: 'Student',
      role: 'student' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.handleLogin({ login: 'student123', password: 'password123' });
    });

    // Should be loading immediately
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should handle logout successfully', async () => {
    // Set up initial logged-in state
    const { result: storeResult } = renderHook(() => useAuthStore());
    act(() => {
      storeResult.current.setUser({ id: '123', email: 'test@sarpedon.local' });
      storeResult.current.setProfile({
        id: '123',
        first_name: 'Test',
        last_name: 'User',
        role: 'student',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });

    vi.mocked(authApi.logout).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeTruthy();

    await act(async () => {
      await result.current.handleLogout();
    });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.profile).toBeNull();
      expect(authApi.logout).toHaveBeenCalled();
    });
  });

  it('should handle logout error', async () => {
    const mockError = new Error('Logout failed');

    vi.mocked(authApi.logout).mockRejectedValue(mockError);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.handleLogout();
      } catch (err) {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Logout failed');
    });
  });

  it('should expose isAuthenticated computed value', () => {
    const { result } = renderHook(() => useAuth());

    // Initially not authenticated
    expect(result.current.isAuthenticated).toBe(false);

    // Set user
    const { result: storeResult } = renderHook(() => useAuthStore());
    act(() => {
      storeResult.current.setUser({ id: '123', email: 'test@sarpedon.local' });
    });

    // Re-render hook
    const { result: result2 } = renderHook(() => useAuth());
    expect(result2.current.isAuthenticated).toBe(true);
  });
});
