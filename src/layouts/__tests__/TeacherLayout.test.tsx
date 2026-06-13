import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeacherLayout } from '../TeacherLayout';
import { useAuthStore } from '@/features/auth/store/authStore';
import * as authApi from '@/features/auth/api/authApi';

// Mock environment variables
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

// Mock auth API
vi.mock('@/features/auth/api/authApi');
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

describe('TeacherLayout', () => {
  beforeEach(() => {
    // Set up teacher user
    useAuthStore.getState().reset();
    useAuthStore.getState().setUser({ id: '456', email: 'teacher@sarpedon.local' });
    useAuthStore.getState().setProfile({
      id: '456',
      first_name: 'Мария',
      last_name: 'Преподавателева',
      role: 'teacher',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    vi.clearAllMocks();
  });

  it('should render children content', () => {
    render(
      <TeacherLayout>
        <div>Test Content</div>
      </TeacherLayout>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should display teacher name in header', () => {
    render(
      <TeacherLayout>
        <div>Content</div>
      </TeacherLayout>
    );

    expect(screen.getByText(/Мария Преподавателева/i)).toBeInTheDocument();
  });

  it('should display teacher role indicator', () => {
    render(
      <TeacherLayout>
        <div>Content</div>
      </TeacherLayout>
    );

    const roleIndicators = screen.getAllByText(/преподаватель/i);
    expect(roleIndicators.length).toBeGreaterThan(0);
  });

  it('should render teacher navigation links', () => {
    render(
      <TeacherLayout>
        <div>Content</div>
      </TeacherLayout>
    );

    expect(screen.getByText(/ученики/i)).toBeInTheDocument();
    expect(screen.getByText(/уровни/i)).toBeInTheDocument();
    expect(screen.getByText(/соревнования/i)).toBeInTheDocument();
    expect(screen.getByText(/статистика/i)).toBeInTheDocument();
  });

  it('should render logout button', () => {
    render(
      <TeacherLayout>
        <div>Content</div>
      </TeacherLayout>
    );

    expect(screen.getByRole('button', { name: /выйти/i })).toBeInTheDocument();
  });

  it('should call logout when logout button clicked', async () => {
    vi.mocked(authApi.logout).mockResolvedValue(undefined);

    const user = userEvent.setup();

    render(
      <TeacherLayout>
        <div>Content</div>
      </TeacherLayout>
    );

    await user.click(screen.getByRole('button', { name: /выйти/i }));

    expect(authApi.logout).toHaveBeenCalled();
  });

  it('should display Sarpedon logo', () => {
    render(
      <TeacherLayout>
        <div>Content</div>
      </TeacherLayout>
    );

    expect(screen.getByText(/Sarpedon/i)).toBeInTheDocument();
  });

  it('should have admin theme colors', () => {
    const { container } = render(
      <TeacherLayout>
        <div>Content</div>
      </TeacherLayout>
    );

    // Check that admin colors are applied
    const header = container.querySelector('header');
    expect(header).toHaveClass('bg-admin-surface');
  });

  it('should have proper layout structure', () => {
    const { container } = render(
      <TeacherLayout>
        <div data-testid="main-content">Content</div>
      </TeacherLayout>
    );

    // Should have header
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();

    // Should have navigation
    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();

    // Should have main content area
    const mainContent = screen.getByTestId('main-content');
    expect(mainContent).toBeInTheDocument();
  });
});
