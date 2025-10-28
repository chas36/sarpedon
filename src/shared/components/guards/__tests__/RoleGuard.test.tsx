import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleGuard } from '../RoleGuard';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { Role } from '@/shared/types';

describe('RoleGuard Component', () => {
  beforeEach(() => {
    // Reset auth store
    useAuthStore.getState().reset();
  });

  it('should render children when user has allowed role', () => {
    // Set user as student
    useAuthStore.getState().setUser({ id: '123', email: 'test@sarpedon.local' });
    useAuthStore.getState().setProfile({
      id: '123',
      first_name: 'Test',
      last_name: 'User',
      role: 'student',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    render(
      <RoleGuard allowedRoles={['student']}>
        <div>Protected Content</div>
      </RoleGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should not render children when user has disallowed role', () => {
    // Set user as student
    useAuthStore.getState().setUser({ id: '123', email: 'test@sarpedon.local' });
    useAuthStore.getState().setProfile({
      id: '123',
      first_name: 'Test',
      last_name: 'User',
      role: 'student',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    render(
      <RoleGuard allowedRoles={['teacher']}>
        <div>Protected Content</div>
      </RoleGuard>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render access denied message when user has wrong role', () => {
    // Set user as student
    useAuthStore.getState().setUser({ id: '123', email: 'test@sarpedon.local' });
    useAuthStore.getState().setProfile({
      id: '123',
      first_name: 'Test',
      last_name: 'User',
      role: 'student',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    render(
      <RoleGuard allowedRoles={['teacher', 'editor']}>
        <div>Protected Content</div>
      </RoleGuard>
    );

    expect(screen.getByText(/доступ запрещен/i)).toBeInTheDocument();
  });

  it('should render loading when user is being fetched', () => {
    // Set loading state
    useAuthStore.getState().setLoading(true);

    render(
      <RoleGuard allowedRoles={['student']}>
        <div>Protected Content</div>
      </RoleGuard>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render login prompt when user is not authenticated', () => {
    // No user set (not authenticated)
    render(
      <RoleGuard allowedRoles={['student']}>
        <div>Protected Content</div>
      </RoleGuard>
    );

    expect(screen.getByText(/необходима авторизация/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should allow multiple roles', () => {
    // Set user as teacher
    useAuthStore.getState().setUser({ id: '123', email: 'test@sarpedon.local' });
    useAuthStore.getState().setProfile({
      id: '123',
      first_name: 'Test',
      last_name: 'User',
      role: 'teacher',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    render(
      <RoleGuard allowedRoles={['teacher', 'editor']}>
        <div>Protected Content</div>
      </RoleGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should allow editor role from multiple allowed roles', () => {
    // Set user as editor
    useAuthStore.getState().setUser({ id: '123', email: 'test@sarpedon.local' });
    useAuthStore.getState().setProfile({
      id: '123',
      first_name: 'Test',
      last_name: 'User',
      role: 'editor',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    render(
      <RoleGuard allowedRoles={['teacher', 'editor']}>
        <div>Protected Content</div>
      </RoleGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
