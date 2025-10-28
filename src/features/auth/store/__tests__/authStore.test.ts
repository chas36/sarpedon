import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../authStore';

describe('Auth Store', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.reset();
    });
  });

  it('should initialize with null user', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should set user and profile on login', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setUser({
        id: '123',
        email: 'test@example.com'
      });
      result.current.setProfile({
        id: '123',
        first_name: 'Test',
        last_name: 'User',
        role: 'student',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });

    expect(result.current.user).toBeTruthy();
    expect(result.current.profile?.role).toBe('student');
  });

  it('should clear user on logout', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setUser({ id: '123', email: 'test@example.com' });
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('should set loading state', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.loading).toBe(true);
  });

  it('should set error message', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setError('Login failed');
    });

    expect(result.current.error).toBe('Login failed');
  });
});
