import { describe, it, expect } from 'vitest';
import type { Profile, Level, Role } from '../database.types';

describe('Database Types', () => {
  it('should create valid Profile', () => {
    const profile: Profile = {
      id: '123',
      first_name: 'Test',
      last_name: 'User',
      role: 'student',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    expect(profile.role).toBe('student');
  });

  it('should create valid Level', () => {
    const level: Level = {
      id: '456',
      title: 'Test Level',
      description: 'Test description',
      reference_solution: 'print("hello")',
      test_cases: [{ input: '', output: 'hello' }],
      difficulty: 'easy',
      order_index: 1,
      language: 'python',
      target_skills: ['basics'],
      is_remedial: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    expect(level.difficulty).toBe('easy');
  });
});
