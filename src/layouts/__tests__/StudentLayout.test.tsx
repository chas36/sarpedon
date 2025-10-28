import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudentLayout } from '../StudentLayout';
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

describe('StudentLayout', () => {
  beforeEach(() => {
    // Set up student user
    useAuthStore.getState().reset();
    useAuthStore.getState().setUser({ id: '123', email: 'student@sarpedon.local' });
    useAuthStore.getState().setProfile({
      id: '123',
      first_name: 'Иван',
      last_name: 'Студентов',
      role: 'student',
      class: '7А',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    vi.clearAllMocks();
  });

  it('should render children content', () => {
    render(
      <StudentLayout>
        <div>Test Content</div>
      </StudentLayout>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should display student name in header', () => {
    render(
      <StudentLayout>
        <div>Content</div>
      </StudentLayout>
    );

    expect(screen.getByText(/Иван Студентов/i)).toBeInTheDocument();
  });

  it('should display student class in header', () => {
    render(
      <StudentLayout>
        <div>Content</div>
      </StudentLayout>
    );

    expect(screen.getByText(/7А/i)).toBeInTheDocument();
  });

  it('should render navigation links', () => {
    render(
      <StudentLayout>
        <div>Content</div>
      </StudentLayout>
    );

    expect(screen.getByText(/уровни/i)).toBeInTheDocument();
    expect(screen.getByText(/мой прогресс/i)).toBeInTheDocument();
    expect(screen.getByText(/соревнования/i)).toBeInTheDocument();
  });

  it('should render logout button', () => {
    render(
      <StudentLayout>
        <div>Content</div>
      </StudentLayout>
    );

    expect(screen.getByRole('button', { name: /выйти/i })).toBeInTheDocument();
  });

  it('should call logout when logout button clicked', async () => {
    vi.mocked(authApi.logout).mockResolvedValue(undefined);

    const user = userEvent.setup();

    render(
      <StudentLayout>
        <div>Content</div>
      </StudentLayout>
    );

    await user.click(screen.getByRole('button', { name: /выйти/i }));

    expect(authApi.logout).toHaveBeenCalled();
  });

  it('should display Sarpedon logo', () => {
    render(
      <StudentLayout>
        <div>Content</div>
      </StudentLayout>
    );

    expect(screen.getByText(/Sarpedon/i)).toBeInTheDocument();
  });

  it('should have proper layout structure', () => {
    const { container } = render(
      <StudentLayout>
        <div data-testid="main-content">Content</div>
      </StudentLayout>
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
