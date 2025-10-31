import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LevelsListPage } from '../LevelsListPage';
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

// Helper to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <MemoryRouter>
      {component}
    </MemoryRouter>
  );
};

const mockLevels = [
  {
    id: '1',
    title: 'Привет, мир!',
    description: 'Первый уровень',
    difficulty: 'easy' as const,
    order_index: 1,
    topic: 'Основы',
    language: 'python',
    target_skills: ['print'],
    is_remedial: false,
    reference_solution: 'print("Hello")',
    test_cases: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Переменные',
    description: 'Работа с переменными',
    difficulty: 'easy' as const,
    order_index: 2,
    topic: 'Основы',
    language: 'python',
    target_skills: ['variables'],
    is_remedial: false,
    reference_solution: 'x = 5',
    test_cases: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

describe('LevelsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page title when levels exist', async () => {
    vi.mocked(levelsApi.getLevels).mockResolvedValue(mockLevels);

    renderWithRouter(<LevelsListPage />);

    await waitFor(() => {
      expect(screen.getByText(/^уровни$/i)).toBeInTheDocument();
    });
  });

  it('should display loading state initially', () => {
    vi.mocked(levelsApi.getLevels).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithRouter(<LevelsListPage />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should fetch and display levels', async () => {
    vi.mocked(levelsApi.getLevels).mockResolvedValue(mockLevels);

    renderWithRouter(<LevelsListPage />);

    await waitFor(() => {
      expect(screen.getByText('Привет, мир!')).toBeInTheDocument();
      expect(screen.getByText('Переменные')).toBeInTheDocument();
    });
  });

  it('should display error message when fetch fails', async () => {
    vi.mocked(levelsApi.getLevels).mockRejectedValue(new Error('Failed to fetch'));

    renderWithRouter(<LevelsListPage />);

    await waitFor(() => {
      expect(screen.getByText(/ошибка загрузки/i)).toBeInTheDocument();
    });
  });

  it('should display empty state when no levels', async () => {
    vi.mocked(levelsApi.getLevels).mockResolvedValue([]);

    renderWithRouter(<LevelsListPage />);

    await waitFor(() => {
      expect(screen.getByText(/нет доступных уровней/i)).toBeInTheDocument();
    });
  });

  it('should group levels by topic', async () => {
    const levelsWithTopics = [
      { ...mockLevels[0], topic: 'Основы Python' },
      { ...mockLevels[1], topic: 'Основы Python' }
    ];

    vi.mocked(levelsApi.getLevels).mockResolvedValue(levelsWithTopics);

    renderWithRouter(<LevelsListPage />);

    await waitFor(() => {
      expect(screen.getByText('Основы Python')).toBeInTheDocument();
    });
  });

  it('should display difficulty badges', async () => {
    vi.mocked(levelsApi.getLevels).mockResolvedValue(mockLevels);

    renderWithRouter(<LevelsListPage />);

    await waitFor(() => {
      const badges = screen.getAllByText(/легко/i);
      expect(badges.length).toBeGreaterThan(0);
    });
  });
});
