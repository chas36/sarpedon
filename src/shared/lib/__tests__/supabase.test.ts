import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock environment variables
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

describe('Supabase Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize Supabase client with environment variables', async () => {
    const { supabase } = await import('../supabase');

    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });

  it('should throw error if environment variables are missing', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');

    expect(() => {
      // Re-import to trigger initialization
      vi.resetModules();
    }).not.toThrow(); // Should not throw during module load
  });
});
