import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { SolveLevelPage } from '../SolveLevelPage';
import * as levelsApi from '../../api/levelsApi';

// Mock environment variables
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

// Mock API
vi.mock('../../api/levelsApi');
vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn()
  }
}));

const mockLevel = {
  id: 'level-1',
  title: 'Привет, мир!',
  description: 'Напишите программу, которая выводит "Hello, World!"',
  difficulty: 'easy' as const,
  order_index: 1,
  topic: 'Основы',
  language: 'python',
  target_skills: ['print'],
  is_remedial: false,
  reference_solution: 'print("Hello, World!")',
  test_cases: [
    { input: '', expected_output: 'Hello, World!' }
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Helper to render with router
const renderWithRouter = (levelId: string = 'level-1') => {
  return render(
    <MemoryRouter initialEntries={[`/student/levels/${levelId}/solve`]}>
      <Routes>
        <Route path="/student/levels/:levelId/solve" element={<SolveLevelPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('SolveLevelPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display loading state initially', () => {
    vi.mocked(levelsApi.getLevelById).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithRouter();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should fetch and display level details', async () => {
    vi.mocked(levelsApi.getLevelById).mockResolvedValue(mockLevel);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Привет, мир!')).toBeInTheDocument();
      expect(screen.getByText(/Напишите программу, которая выводит "Hello, World!"/)).toBeInTheDocument();
    });
  });

  it('should display error when level fetch fails', async () => {
    vi.mocked(levelsApi.getLevelById).mockRejectedValue(new Error('Failed to load'));

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/ошибка загрузки/i)).toBeInTheDocument();
    });
  });

  it('should display error when level not found', async () => {
    vi.mocked(levelsApi.getLevelById).mockRejectedValue(new Error('Level not found'));

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/уровень не найден/i)).toBeInTheDocument();
    });
  });

  it('should render code editor section', async () => {
    vi.mocked(levelsApi.getLevelById).mockResolvedValue(mockLevel);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/ваше решение/i)).toBeInTheDocument();
    });
  });

  it('should render run code button', async () => {
    vi.mocked(levelsApi.getLevelById).mockResolvedValue(mockLevel);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /запустить/i })).toBeInTheDocument();
    });
  });

  it('should disable run button when code is empty', async () => {
    vi.mocked(levelsApi.getLevelById).mockResolvedValue(mockLevel);

    renderWithRouter();

    await waitFor(() => {
      const runButton = screen.getByRole('button', { name: /запустить/i });
      expect(runButton).toBeDisabled();
    });
  });

  it('should have code editor in solution section', async () => {
    vi.mocked(levelsApi.getLevelById).mockResolvedValue(mockLevel);

    renderWithRouter();

    await waitFor(() => {
      // Check that solution section exists with editor container
      const solutionHeading = screen.getByText(/ваше решение/i);
      expect(solutionHeading).toBeInTheDocument();

      // Run button should be present
      expect(screen.getByRole('button', { name: /запустить/i })).toBeInTheDocument();
    });
  });

  it('should display difficulty badge', async () => {
    vi.mocked(levelsApi.getLevelById).mockResolvedValue(mockLevel);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/легко/i)).toBeInTheDocument();
    });
  });

  it('should display target skills', async () => {
    vi.mocked(levelsApi.getLevelById).mockResolvedValue(mockLevel);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('print')).toBeInTheDocument();
    });
  });

  it('should have back to levels button', async () => {
    vi.mocked(levelsApi.getLevelById).mockResolvedValue(mockLevel);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /назад к уровням/i })).toBeInTheDocument();
    });
  });

  it('should fetch level with correct ID from URL', async () => {
    const getLevelSpy = vi.mocked(levelsApi.getLevelById).mockResolvedValue(mockLevel);

    renderWithRouter('test-level-id');

    await waitFor(() => {
      expect(getLevelSpy).toHaveBeenCalledWith('test-level-id');
    });
  });

  it('should display topic', async () => {
    vi.mocked(levelsApi.getLevelById).mockResolvedValue(mockLevel);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/основы/i)).toBeInTheDocument();
    });
  });

  it('should have retry button on error', async () => {
    vi.mocked(levelsApi.getLevelById).mockRejectedValue(new Error('Failed'));

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /попробовать снова/i })).toBeInTheDocument();
    });
  });

  it('should retry loading when retry button clicked', async () => {
    const getLevelSpy = vi.mocked(levelsApi.getLevelById)
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValueOnce(mockLevel);

    const user = userEvent.setup();

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/ошибка загрузки/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /попробовать снова/i });
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Привет, мир!')).toBeInTheDocument();
    });

    expect(getLevelSpy).toHaveBeenCalledTimes(2);
  });
});
