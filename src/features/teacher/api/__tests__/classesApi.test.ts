import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/shared/lib/supabase';
import {
  getAllClasses,
  createClass,
  updateClass,
  deleteClass,
  getClassStudentCount,
} from '../classesApi';

// Mock supabase
vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('classesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllClasses', () => {
    it('should fetch all classes ordered by name', async () => {
      const mockClasses = [
        { id: '1', name: '10А' },
        { id: '2', name: '10Б' },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockClasses, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await getAllClasses();

      expect(supabase.from).toHaveBeenCalledWith('classes');
      expect(mockChain.select).toHaveBeenCalledWith('*');
      expect(mockChain.order).toHaveBeenCalledWith('name', { ascending: true });
      expect(result).toEqual(mockClasses);
    });

    it('should throw error on failure', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      await expect(getAllClasses()).rejects.toThrow('DB error');
    });
  });

  describe('createClass', () => {
    it('should create new class', async () => {
      const mockClass = { id: '1', name: '10А' };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockClass, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await createClass('10А');

      expect(supabase.from).toHaveBeenCalledWith('classes');
      expect(mockChain.insert).toHaveBeenCalledWith({ name: '10А' });
      expect(result).toEqual(mockClass);
    });
  });

  describe('getClassStudentCount', () => {
    it('should return student count for class', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      // The second call to eq() should return the promise
      mockChain.eq
        .mockReturnValueOnce(mockChain) // First call returns chain
        .mockResolvedValueOnce({ count: 15, error: null }); // Second call returns promise

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await getClassStudentCount('10А');

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockChain.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
      expect(mockChain.eq).toHaveBeenCalledWith('role', 'student');
      expect(mockChain.eq).toHaveBeenCalledWith('class', '10А');
      expect(result).toBe(15);
    });
  });
});
