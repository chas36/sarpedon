import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as submissionsApi from '../submissionsApi';
import { supabase } from '@/shared/lib/supabase';
import type { CreateSubmissionData, UpdateSubmissionData } from '@/shared/types';

// Mock environment variables
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

// Mock Supabase
vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn()
    }
  }
}));

describe('submissionsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSubmission', () => {
    it('should create a new submission', async () => {
      const mockData: CreateSubmissionData = {
        level_id: 'level-123',
        code: 'print("Hello")',
        status: 'pending'
      };

      const mockResponse = {
        id: 'sub-123',
        user_id: 'user-123',
        ...mockData,
        submitted_at: new Date().toISOString(),
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockResponse,
            error: null
          })
        })
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any);

      const result = await submissionsApi.createSubmission(mockData);

      expect(supabase.from).toHaveBeenCalledWith('submissions');
      expect(mockInsert).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(mockResponse);
    });

    it('should throw error if creation fails', async () => {
      const mockData: CreateSubmissionData = {
        level_id: 'level-123',
        code: 'print("Hello")'
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Insert failed' }
          })
        })
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any);

      await expect(submissionsApi.createSubmission(mockData)).rejects.toThrow();
    });
  });

  describe('getSubmissionsByUser', () => {
    it('should fetch submissions for a user', async () => {
      const userId = 'user-123';
      const mockSubmissions = [
        {
          id: 'sub-1',
          user_id: userId,
          level_id: 'level-1',
          code: 'code1',
          status: 'passed',
          submitted_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockSubmissions,
            error: null
          })
        })
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      } as any);

      const result = await submissionsApi.getSubmissionsByUser(userId);

      expect(supabase.from).toHaveBeenCalledWith('submissions');
      expect(result).toEqual(mockSubmissions);
    });
  });

  describe('getSubmissionsByLevel', () => {
    it('should fetch submissions for a specific level', async () => {
      const levelId = 'level-123';
      const mockSubmissions = [
        {
          id: 'sub-1',
          user_id: 'user-1',
          level_id: levelId,
          code: 'code1',
          status: 'passed',
          submitted_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockSubmissions,
            error: null
          })
        })
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      } as any);

      const result = await submissionsApi.getSubmissionsByLevel(levelId);

      expect(result).toEqual(mockSubmissions);
    });
  });

  describe('getLatestSubmission', () => {
    it('should fetch the latest submission for a user and level', async () => {
      const userId = 'user-123';
      const levelId = 'level-123';
      const mockSubmission = {
        id: 'sub-latest',
        user_id: userId,
        level_id: levelId,
        code: 'latest code',
        status: 'pending',
        submitted_at: new Date().toISOString(),
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockSubmission,
              error: null
            })
          })
        })
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      } as any);

      const result = await submissionsApi.getLatestSubmission(userId, levelId);

      expect(result).toEqual(mockSubmission);
    });

    it('should return null if no submission exists', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' } // No rows returned
            })
          })
        })
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      } as any);

      const result = await submissionsApi.getLatestSubmission('user-123', 'level-123');

      expect(result).toBeNull();
    });
  });

  describe('updateSubmission', () => {
    it('should update a submission', async () => {
      const submissionId = 'sub-123';
      const updateData: UpdateSubmissionData = {
        status: 'passed',
        completed_at: new Date().toISOString()
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: submissionId, ...updateData },
              error: null
            })
          })
        })
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate
      } as any);

      const result = await submissionsApi.updateSubmission(submissionId, updateData);

      expect(mockUpdate).toHaveBeenCalledWith(updateData);
      expect(result).toHaveProperty('id', submissionId);
    });
  });

  describe('getUserProgress', () => {
    it('should calculate user progress statistics', async () => {
      const userId = 'user-123';

      // Mock submissions
      const mockSubmissions = [
        { status: 'passed', level_id: 'l1' },
        { status: 'passed', level_id: 'l2' },
        { status: 'failed', level_id: 'l3' },
        { status: 'pending', level_id: 'l4' }
      ];

      const mockSelectWithCount = vi.fn().mockResolvedValue({
        count: 10,
        error: null
      });

      const mockSelectSubmissions = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockSubmissions,
          error: null
        })
      });

      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: mockSelectWithCount
        } as any)
        .mockReturnValueOnce({
          select: mockSelectSubmissions
        } as any);

      const result = await submissionsApi.getUserProgress(userId);

      expect(result).toEqual({
        total_levels: 10,
        completed_levels: 2,
        in_progress_levels: 2,
        completion_percentage: 20,
        total_submissions: 4,
        passed_submissions: 2,
        failed_submissions: 1
      });
    });
  });
});
