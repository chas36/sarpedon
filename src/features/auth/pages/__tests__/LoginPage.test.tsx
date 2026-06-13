import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '../LoginPage';
import { useAuthStore } from '../../store/authStore';
import * as authApi from '../../api/authApi';

// Mock environment variables
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

// Mock the auth API
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

describe('LoginPage', () => {
  beforeEach(() => {
    // Reset auth store
    const { result } = render(<div />);
    useAuthStore.getState().reset();

    // Clear mocks
    vi.clearAllMocks();
  });

  it('should render login form', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/логин/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/пароль/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /войти/i })).toBeInTheDocument();
  });

  it('should display page title', () => {
    render(<LoginPage />);

    expect(screen.getByText(/вход в систему/i)).toBeInTheDocument();
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

    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/логин/i), 'student123');
    await user.type(screen.getByLabelText(/пароль/i), 'password123');
    await user.click(screen.getByRole('button', { name: /войти/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        login: 'student123',
        password: 'password123'
      });
    });
  });

  it('should display error message on login failure', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid credentials'));

    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/логин/i), 'wrong');
    await user.type(screen.getByLabelText(/пароль/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /войти/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during login', async () => {
    vi.mocked(authApi.login).mockImplementation(
      () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            user: { id: '123', email: 'test@sarpedon.local' },
            session: null
          } as any);
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

    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/логин/i), 'student123');
    await user.type(screen.getByLabelText(/пароль/i), 'password123');
    await user.click(screen.getByRole('button', { name: /войти/i }));

    // Should show loading state
    expect(await screen.findByRole('button', { name: /вход/i })).toBeDisabled();

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /вход/i })).not.toBeInTheDocument();
    });
  });

  it('should have Sarpedon branding', () => {
    render(<LoginPage />);

    expect(screen.getByText(/sarpedon/i)).toBeInTheDocument();
  });
});
