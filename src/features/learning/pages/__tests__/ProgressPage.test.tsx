import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProgressPage } from '../ProgressPage';
import * as submissionsApi from '../../api/submissionsApi';

// Mock environment variables
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

// Mock API
vi.mock('../../api/submissionsApi');
vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn()
  }
}));

// Mock auth store
const mockAuthStore = {
  user: { id: 'test-user-id', email: 'test@example.com' },
  isAuthenticated: true,
  setUser: vi.fn(),
  clearUser: vi.fn()
};

vi.mock('@/features/auth/store/authStore', () => ({
  useAuthStore: vi.fn(() => mockAuthStore)
}));

const mockUserProgress = {
  total_levels: 10,
  completed_levels: 3,
  in_progress_levels: 2,
  completion_percentage: 30,
  total_submissions: 15,
  passed_submissions: 3,
  failed_submissions: 12
};

describe('ProgressPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(submissionsApi.getUserProgress).mockResolvedValue(mockUserProgress);
  });

  const renderWithRouter = () => {
    return render(
      <MemoryRouter>
        <ProgressPage />
      </MemoryRouter>
    );
  };

  it('should display loading state initially', () => {
    vi.mocked(submissionsApi.getUserProgress).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithRouter();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should fetch and display user progress', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/мой прогресс/i)).toBeInTheDocument();
    });

    // Check for statistics
    expect(screen.getByText('30%')).toBeInTheDocument(); // completion percentage
    expect(screen.getByText(/завершено уровней/i)).toBeInTheDocument();
  });

  it('should display total levels', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument(); // total levels
    });
  });

  it('should display completed levels count', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument(); // completed levels
    });
  });

  it('should display total submissions', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument(); // total submissions
    });
  });

  it('should display passed submissions', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/успешно: 3/i)).toBeInTheDocument();
    });
  });

  it('should display failed submissions', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/неудачно: 12/i)).toBeInTheDocument();
    });
  });

  it('should call getUserProgress with correct user ID', async () => {
    const getUserProgressSpy = vi.mocked(submissionsApi.getUserProgress);

    renderWithRouter();

    await waitFor(() => {
      expect(getUserProgressSpy).toHaveBeenCalledWith('test-user-id');
    });
  });

  it('should display error when fetch fails', async () => {
    vi.mocked(submissionsApi.getUserProgress).mockRejectedValue(
      new Error('Failed to load')
    );

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/ошибка загрузки/i)).toBeInTheDocument();
    });
  });

  it('should have retry button on error', async () => {
    vi.mocked(submissionsApi.getUserProgress).mockRejectedValue(
      new Error('Failed')
    );

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /попробовать снова/i })).toBeInTheDocument();
    });
  });

  it('should display progress bar with correct percentage', async () => {
    renderWithRouter();

    await waitFor(() => {
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '30');
    });
  });
});
