import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/shared/lib/supabase';
import {
  createStudent,
  updateStudent,
  deleteStudent,
  resetPassword,
  updateCredentials,
  bulkCreateStudents,
} from '../studentsApi';
import * as loginGenerator from '../../utils/loginGenerator';

vi.mock('@/shared/lib/supabase');
vi.mock('../../utils/loginGenerator');

describe('studentsApi - new functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createStudent', () => {
    it('should create student with generated login', async () => {
      const mockLogin = 'ОКРУГ460';
      vi.mocked(loginGenerator.generateUniqueLogin).mockResolvedValue(mockLogin);

      const authMock = {
        signUp: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      };

      const profileMock = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user-123',
              first_name: 'Иван',
              last_name: 'Иванов',
              class: '10А',
              generated_login: mockLogin,
              generated_password: mockLogin,
            },
            error: null,
          }),
        }),
      };

      vi.mocked(supabase).auth = authMock as any;
      vi.mocked(supabase.from).mockImplementation(profileMock.from as any);

      const result = await createStudent({
        firstName: 'Иван',
        lastName: 'Иванов',
        className: '10А',
      });

      expect(loginGenerator.generateUniqueLogin).toHaveBeenCalled();
      expect(authMock.signUp).toHaveBeenCalledWith({
        email: expect.stringContaining('@sarpedon.local'),
        password: mockLogin,
      });
      expect(result.generated_login).toBe(mockLogin);
    });

    it('should create student with provided login', async () => {
      const customLogin = 'ГРАНАТ622';

      const authMock = {
        signUp: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      };

      const profileMock = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user-123',
              first_name: 'Петр',
              last_name: 'Петров',
              generated_login: customLogin,
            },
            error: null,
          }),
        }),
      };

      vi.mocked(supabase).auth = authMock as any;
      vi.mocked(supabase.from).mockImplementation(profileMock.from as any);

      await createStudent({
        firstName: 'Петр',
        lastName: 'Петров',
        className: '10А',
        login: customLogin,
      });

      expect(loginGenerator.generateUniqueLogin).not.toHaveBeenCalled();
      expect(authMock.signUp).toHaveBeenCalledWith({
        email: expect.any(String),
        password: customLogin,
      });
    });
  });

  describe('updateStudent', () => {
    it('should update student profile', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '123', first_name: 'Новое Имя' },
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      await updateStudent('123', { firstName: 'Новое Имя' });

      expect(mockChain.update).toHaveBeenCalledWith({
        first_name: 'Новое Имя',
      });
    });
  });

  describe('deleteStudent', () => {
    it('should delete student via auth admin', async () => {
      const authMock = {
        admin: {
          deleteUser: vi.fn().mockResolvedValue({ error: null }),
        },
      };

      vi.mocked(supabase).auth = authMock as any;

      await deleteStudent('user-123');

      expect(authMock.admin.deleteUser).toHaveBeenCalledWith('user-123');
    });
  });

  describe('resetPassword', () => {
    it('should reset password to match login', async () => {
      const mockStudent = {
        data: { generated_login: 'ОКРУГ460' },
        error: null,
      };

      const selectMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockStudent),
      };

      const updateMock = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(selectMock as any)
        .mockReturnValueOnce(updateMock as any);

      const authMock = {
        admin: {
          updateUserById: vi.fn().mockResolvedValue({ error: null }),
        },
      };

      vi.mocked(supabase).auth = authMock as any;

      await resetPassword('user-123');

      expect(authMock.admin.updateUserById).toHaveBeenCalledWith('user-123', {
        password: 'ОКРУГ460',
      });
    });
  });

  describe('updateCredentials', () => {
    it('should update both login and password', async () => {
      const authMock = {
        admin: {
          updateUserById: vi.fn().mockResolvedValue({ error: null }),
        },
      };

      const updateMock = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      vi.mocked(supabase).auth = authMock as any;
      vi.mocked(supabase.from).mockReturnValue(updateMock as any);

      await updateCredentials('user-123', 'НОВЫЙЛОГИН123', 'новыйпароль');

      expect(authMock.admin.updateUserById).toHaveBeenCalledWith('user-123', {
        password: 'новыйпароль',
      });
      expect(updateMock.update).toHaveBeenCalledWith({
        generated_login: 'НОВЫЙЛОГИН123',
        generated_password: 'новыйпароль',
      });
    });
  });

  describe('bulkCreateStudents', () => {
    it('should create multiple students and report results', async () => {
      const mockLogin1 = 'ВОЛГА123';
      const mockLogin2 = 'ДНЕПР456';

      vi.mocked(loginGenerator.generateUniqueLogin)
        .mockResolvedValueOnce(mockLogin1)
        .mockResolvedValueOnce(mockLogin2);

      const authMock = {
        signUp: vi.fn()
          .mockResolvedValueOnce({
            data: { user: { id: 'user-1' } },
            error: null,
          })
          .mockResolvedValueOnce({
            data: { user: { id: 'user-2' } },
            error: null,
          }),
      };

      const profileMock = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn()
            .mockResolvedValueOnce({
              data: { id: 'user-1', first_name: 'Студент1', generated_login: mockLogin1 },
              error: null,
            })
            .mockResolvedValueOnce({
              data: { id: 'user-2', first_name: 'Студент2', generated_login: mockLogin2 },
              error: null,
            }),
        }),
      };

      vi.mocked(supabase).auth = authMock as any;
      vi.mocked(supabase.from).mockImplementation(profileMock.from as any);

      const students = [
        { firstName: 'Студент1', lastName: 'Один', className: '10А' },
        { firstName: 'Студент2', lastName: 'Два', className: '10А' },
      ];

      const result = await bulkCreateStudents(students);

      expect(result.success).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });
  });
});
