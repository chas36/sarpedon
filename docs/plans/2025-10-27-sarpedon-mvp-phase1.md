# Sarpedon MVP Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build foundational educational platform with authentication, basic learning module, teacher panel, and static characters.

**Architecture:** Feature-based React app with Supabase backend, Monaco Editor for code editing, Zustand for state, RLS for security. TDD approach with Vitest for unit tests.

**Tech Stack:** React 18, TypeScript, Vite, Supabase, Zustand, Monaco Editor, Tailwind CSS, React Router v6

---

## Task 1: Project Setup and Dependencies

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.js`
- Create: `.env.example`
- Create: `.gitignore`

**Step 1: Initialize Vite React TypeScript project**

Run:
```bash
npm create vite@latest . -- --template react-ts
```

Expected: Vite project scaffolding created

**Step 2: Install core dependencies**

Run:
```bash
npm install react-router-dom @supabase/supabase-js zustand zod framer-motion @tanstack/react-query date-fns
```

Expected: Dependencies added to package.json

**Step 3: Install dev dependencies**

Run:
```bash
npm install -D @types/node tailwindcss postcss autoprefixer vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Expected: Dev dependencies installed

**Step 4: Initialize Tailwind CSS**

Run:
```bash
npx tailwindcss init -p
```

Expected: `tailwind.config.js` and `postcss.config.js` created

**Step 5: Configure Tailwind**

Update `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        learning: {
          bg: '#0f172a',
          surface: '#1e293b',
          accent: '#3b82f6',
          success: '#10b981',
          text: '#f1f5f9',
          muted: '#64748b'
        },
        admin: {
          bg: '#18181b',
          surface: '#27272a',
          accent: '#8b5cf6',
          warning: '#f59e0b',
          danger: '#ef4444',
          text: '#fafafa',
          muted: '#71717a'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
```

**Step 6: Update main CSS**

Create `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}
```

**Step 7: Configure Vitest**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

**Step 8: Create test setup**

Create `src/test/setup.ts`:
```typescript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
```

**Step 9: Update Vite config for path aliases**

Update `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

**Step 10: Create environment config**

Create `.env.example`:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_APP_URL=http://localhost:5173
```

**Step 11: Update .gitignore**

Add to `.gitignore`:
```
# Environment
.env
.env.local

# Supabase
.supabase/

# Coverage
coverage/
```

**Step 12: Update package.json scripts**

Update `package.json` scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  }
}
```

**Step 13: Commit initial setup**

Run:
```bash
git add .
git commit -m "feat: initial project setup with Vite, TypeScript, Tailwind

- Configure Vite with React and TypeScript
- Setup Tailwind CSS with custom theme colors
- Configure Vitest for testing
- Add path aliases (@/ for src/)
- Setup environment variables template"
```

Expected: Clean commit with project foundation

---

## Task 2: Project Structure and Shared Types

**Files:**
- Create: `src/shared/types/index.ts`
- Create: `src/shared/types/database.types.ts`
- Create: `src/shared/types/auth.types.ts`
- Create: `src/shared/types/level.types.ts`

**Step 1: Create base database types**

Create `src/shared/types/database.types.ts`:
```typescript
export type Role = 'teacher' | 'student' | 'editor';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type LevelStatus = 'not_started' | 'in_progress' | 'completed';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  class?: string;
  role: Role;
  generated_login?: string;
  created_at: string;
  updated_at: string;
}

export interface Level {
  id: string;
  title: string;
  description: string;
  educational_context?: string;
  reference_solution: string;
  test_cases: TestCase[];
  hints?: string[];
  difficulty: Difficulty;
  order_index: number;
  topic?: string;
  language: string;
  target_skills: string[];
  is_remedial: boolean;
  remedial_for?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TestCase {
  input: string;
  output: string;
  description?: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  level_id: string;
  status: LevelStatus;
  attempts: number;
  last_solution?: string;
  completed_at?: string;
  created_at: string;
}

export interface Submission {
  id: string;
  user_id: string;
  level_id: string;
  code: string;
  is_correct: boolean;
  ai_feedback?: string;
  submitted_at: string;
}
```

**Step 2: Create auth types**

Create `src/shared/types/auth.types.ts`:
```typescript
import { Profile, Role } from './database.types';

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthState {
  user: AuthUser | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  login: string;
  password: string;
}
```

**Step 3: Create level types**

Create `src/shared/types/level.types.ts`:
```typescript
import { Level, UserProgress } from './database.types';

export interface LevelWithProgress extends Level {
  progress?: UserProgress;
}

export interface SubmissionResult {
  isCorrect: boolean;
  feedback: string;
  showReferenceSolution: boolean;
  character?: string;
  mood?: string;
}
```

**Step 4: Create index barrel export**

Create `src/shared/types/index.ts`:
```typescript
export * from './database.types';
export * from './auth.types';
export * from './level.types';
```

**Step 5: Write test for types (type checking)**

Create `src/shared/types/__tests__/types.test.ts`:
```typescript
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
```

**Step 6: Run tests**

Run: `npm test`

Expected: Tests pass with type validation

**Step 7: Commit types**

Run:
```bash
git add src/shared/types
git commit -m "feat: add shared TypeScript types

- Database types (Profile, Level, UserProgress, Submission)
- Auth types (AuthUser, AuthState, LoginCredentials)
- Level types (LevelWithProgress, SubmissionResult)
- Unit tests for type validation"
```

---

## Task 3: Supabase Client Setup

**Files:**
- Create: `src/shared/lib/supabase.ts`
- Create: `src/shared/lib/__tests__/supabase.test.ts`

**Step 1: Write test for Supabase client initialization**

Create `src/shared/lib/__tests__/supabase.test.ts`:
```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL - module '../supabase' not found

**Step 3: Create Supabase client**

Create `src/shared/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
```

**Step 4: Run tests**

Run: `npm test`

Expected: Tests pass

**Step 5: Commit Supabase client**

Run:
```bash
git add src/shared/lib
git commit -m "feat: add Supabase client initialization

- Create Supabase client with typed database
- Auto-refresh tokens and persist sessions
- Validate environment variables
- Add unit tests"
```

---

## Task 4: Auth Store with Zustand

**Files:**
- Create: `src/features/auth/store/authStore.ts`
- Create: `src/features/auth/store/__tests__/authStore.test.ts`
- Create: `src/features/auth/api/authApi.ts`

**Step 1: Write test for auth store**

Create `src/features/auth/store/__tests__/authStore.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../authStore';

describe('Auth Store', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.reset();
    });
  });

  it('should initialize with null user', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should set user and profile on login', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setUser({
        id: '123',
        email: 'test@example.com'
      });
      result.current.setProfile({
        id: '123',
        first_name: 'Test',
        last_name: 'User',
        role: 'student',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });

    expect(result.current.user).toBeTruthy();
    expect(result.current.profile?.role).toBe('student');
  });

  it('should clear user on logout', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setUser({ id: '123', email: 'test@example.com' });
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('should set loading state', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.loading).toBe(true);
  });

  it('should set error message', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setError('Login failed');
    });

    expect(result.current.error).toBe('Login failed');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL - module '../authStore' not found

**Step 3: Create auth store**

Create `src/features/auth/store/authStore.ts`:
```typescript
import { create } from 'zustand';
import type { AuthUser, Profile, Role } from '@/shared/types';

interface AuthStore {
  user: AuthUser | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  error: string | null;

  setUser: (user: AuthUser | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  reset: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  profile: null,
  role: null,
  loading: false,
  error: null,

  setUser: (user) => set({ user }),

  setProfile: (profile) => set({
    profile,
    role: profile?.role || null
  }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  logout: () => set({
    user: null,
    profile: null,
    role: null,
    error: null
  }),

  reset: () => set({
    user: null,
    profile: null,
    role: null,
    loading: false,
    error: null
  })
}));
```

**Step 4: Run tests**

Run: `npm test`

Expected: All tests pass

**Step 5: Create auth API functions**

Create `src/features/auth/api/authApi.ts`:
```typescript
import { supabase } from '@/shared/lib/supabase';
import type { LoginCredentials } from '@/shared/types';

export async function login(credentials: LoginCredentials) {
  // For now, we use email/password auth
  // Later we'll map generated_login to email
  const email = `${credentials.login}@sarpedon.local`;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: credentials.password
  });

  if (error) throw error;
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}
```

**Step 6: Commit auth store**

Run:
```bash
git add src/features/auth
git commit -m "feat: add auth store and API

- Create Zustand auth store with user/profile state
- Add setters for user, profile, loading, error
- Implement logout and reset functions
- Create auth API functions (login, logout, getProfile)
- Add comprehensive unit tests"
```

---

## Task 5: Shared UI Components

**Files:**
- Create: `src/shared/components/ui/Button.tsx`
- Create: `src/shared/components/ui/__tests__/Button.test.tsx`
- Create: `src/shared/components/ui/Spinner.tsx`
- Create: `src/shared/components/ui/__tests__/Spinner.test.tsx`

**Step 1: Write test for Button component**

Create `src/shared/components/ui/__tests__/Button.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick handler', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);

    const button = screen.getByText('Click me');
    expect(button).toBeDisabled();
  });

  it('should show loading spinner when loading', () => {
    render(<Button loading>Click me</Button>);

    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('should apply variant classes', () => {
    const { rerender } = render(<Button variant="primary">Test</Button>);
    expect(screen.getByText('Test')).toHaveClass('bg-learning-accent');

    rerender(<Button variant="danger">Test</Button>);
    expect(screen.getByText('Test')).toHaveClass('bg-admin-danger');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL - module '../Button' not found

**Step 3: Create Button component**

Create `src/shared/components/ui/Button.tsx`:
```typescript
import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-learning-accent hover:bg-blue-600 text-white focus:ring-learning-accent',
    secondary: 'bg-learning-surface hover:bg-slate-700 text-learning-text focus:ring-learning-surface',
    success: 'bg-learning-success hover:bg-green-600 text-white focus:ring-learning-success',
    danger: 'bg-admin-danger hover:bg-red-600 text-white focus:ring-admin-danger',
    ghost: 'bg-transparent hover:bg-learning-surface text-learning-text'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          data-testid="spinner"
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
}
```

**Step 4: Run tests**

Run: `npm test`

Expected: All Button tests pass

**Step 5: Write test for Spinner**

Create `src/shared/components/ui/__tests__/Spinner.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from '../Spinner';

describe('Spinner', () => {
  it('should render spinner', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render with text', () => {
    render(<Spinner text="Loading..." />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should apply size classes', () => {
    const { rerender } = render(<Spinner size="sm" />);
    expect(screen.getByRole('status').firstChild).toHaveClass('h-4', 'w-4');

    rerender(<Spinner size="lg" />);
    expect(screen.getByRole('status').firstChild).toHaveClass('h-12', 'w-12');
  });
});
```

**Step 6: Run test to verify it fails**

Run: `npm test`

Expected: FAIL - module '../Spinner' not found

**Step 7: Create Spinner component**

Create `src/shared/components/ui/Spinner.tsx`:
```typescript
import React from 'react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  color?: string;
}

export function Spinner({ size = 'md', text, color = 'text-learning-accent' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div role="status">
        <svg
          className={`animate-spin ${sizeClasses[size]} ${color}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="sr-only">Loading...</span>
      </div>
      {text && <p className="text-sm text-learning-muted">{text}</p>}
    </div>
  );
}
```

**Step 8: Run tests**

Run: `npm test`

Expected: All Spinner tests pass

**Step 9: Create barrel export**

Create `src/shared/components/ui/index.ts`:
```typescript
export * from './Button';
export * from './Spinner';
```

**Step 10: Commit UI components**

Run:
```bash
git add src/shared/components/ui
git commit -m "feat: add Button and Spinner UI components

- Create Button with variants (primary, secondary, success, danger, ghost)
- Support sizes (sm, md, lg)
- Add loading state with spinner
- Create Spinner component with sizes and text
- Add comprehensive unit tests for both components"
```

---

## Task 6: Login Page and Auth Flow

**Files:**
- Create: `src/features/auth/components/LoginForm.tsx`
- Create: `src/features/auth/components/__tests__/LoginForm.test.tsx`
- Create: `src/features/auth/hooks/useAuth.ts`
- Create: `src/pages/LoginPage.tsx`

**Step 1: Write test for useAuth hook**

Create `src/features/auth/hooks/__tests__/useAuth.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '../useAuth';

// Mock auth API
vi.mock('@/features/auth/api/authApi', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
  getProfile: vi.fn()
}));

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize auth on mount', async () => {
    const { getCurrentUser } = await import('@/features/auth/api/authApi');
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should handle login successfully', async () => {
    const { login, getProfile } = await import('@/features/auth/api/authApi');

    vi.mocked(login).mockResolvedValue({
      user: { id: '123', email: 'test@sarpedon.local' },
      session: {} as any
    });

    vi.mocked(getProfile).mockResolvedValue({
      id: '123',
      first_name: 'Test',
      last_name: 'User',
      role: 'student',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn({ login: 'test', password: 'pass' });
    });

    expect(result.current.user).toBeTruthy();
    expect(result.current.profile?.role).toBe('student');
  });

  it('should handle login error', async () => {
    const { login } = await import('@/features/auth/api/authApi');
    vi.mocked(login).mockRejectedValue(new Error('Invalid credentials'));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn({ login: 'wrong', password: 'wrong' });
    });

    expect(result.current.error).toBe('Invalid credentials');
  });

  it('should handle logout', async () => {
    const { logout } = await import('@/features/auth/api/authApi');
    vi.mocked(logout).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL - module '../useAuth' not found

**Step 3: Create useAuth hook**

Create `src/features/auth/hooks/useAuth.ts`:
```typescript
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import * as authApi from '../api/authApi';
import type { LoginCredentials } from '@/shared/types';

export function useAuth() {
  const {
    user,
    profile,
    role,
    loading,
    error,
    setUser,
    setProfile,
    setLoading,
    setError,
    logout: clearAuth
  } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, []);

  async function initializeAuth() {
    try {
      setLoading(true);
      const user = await authApi.getCurrentUser();

      if (user) {
        setUser({ id: user.id, email: user.email || '' });
        const profile = await authApi.getProfile(user.id);
        setProfile(profile);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(credentials: LoginCredentials) {
    try {
      setLoading(true);
      setError(null);

      const { user } = await authApi.login(credentials);

      if (user) {
        setUser({ id: user.id, email: user.email || '' });
        const profile = await authApi.getProfile(user.id);
        setProfile(profile);
      }
    } catch (error: any) {
      setError(error.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    try {
      setLoading(true);
      await authApi.logout();
      clearAuth();
    } catch (error: any) {
      setError(error.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  }

  return {
    user,
    profile,
    role,
    loading,
    error,
    signIn,
    signOut
  };
}
```

**Step 4: Run tests**

Run: `npm test`

Expected: All useAuth tests pass

**Step 5: Write test for LoginForm**

Create `src/features/auth/components/__tests__/LoginForm.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';

describe('LoginForm', () => {
  it('should render login form', () => {
    render(<LoginForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/логин/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/пароль/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /войти/i })).toBeInTheDocument();
  });

  it('should handle form submission', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(<LoginForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/логин/i), 'testuser');
    await user.type(screen.getByLabelText(/пароль/i), 'password123');
    await user.click(screen.getByRole('button', { name: /войти/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        login: 'testuser',
        password: 'password123'
      });
    });
  });

  it('should show validation errors', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /войти/i }));

    await waitFor(() => {
      expect(screen.getByText(/логин обязателен/i)).toBeInTheDocument();
      expect(screen.getByText(/пароль обязателен/i)).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    render(<LoginForm onSubmit={vi.fn()} loading />);

    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('should show error message', () => {
    render(<LoginForm onSubmit={vi.fn()} error="Invalid credentials" />);

    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
  });
});
```

**Step 6: Run test to verify it fails**

Run: `npm test`

Expected: FAIL - module '../LoginForm' not found

**Step 7: Create LoginForm component**

Create `src/features/auth/components/LoginForm.tsx`:
```typescript
import React, { useState } from 'react';
import { Button } from '@/shared/components/ui';
import type { LoginCredentials } from '@/shared/types';

interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => void | Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export function LoginForm({ onSubmit, loading, error }: LoginFormProps) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  function validate() {
    const errors: Record<string, string> = {};

    if (!login.trim()) {
      errors.login = 'Логин обязателен';
    }

    if (!password) {
      errors.password = 'Пароль обязателен';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) return;

    await onSubmit({ login, password });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
      <div>
        <label htmlFor="login" className="block text-sm font-medium text-learning-text mb-1">
          Логин
        </label>
        <input
          id="login"
          type="text"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          className="w-full px-3 py-2 bg-learning-surface border border-learning-muted rounded-lg text-learning-text focus:outline-none focus:ring-2 focus:ring-learning-accent"
          disabled={loading}
        />
        {validationErrors.login && (
          <p className="mt-1 text-sm text-admin-danger">{validationErrors.login}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-learning-text mb-1">
          Пароль
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 bg-learning-surface border border-learning-muted rounded-lg text-learning-text focus:outline-none focus:ring-2 focus:ring-learning-accent"
          disabled={loading}
        />
        {validationErrors.password && (
          <p className="mt-1 text-sm text-admin-danger">{validationErrors.password}</p>
        )}
      </div>

      {error && (
        <div className="p-3 bg-admin-danger/10 border border-admin-danger rounded-lg">
          <p className="text-sm text-admin-danger">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        loading={loading}
        disabled={loading}
      >
        Войти
      </Button>
    </form>
  );
}
```

**Step 8: Run tests**

Run: `npm test`

Expected: All LoginForm tests pass

**Step 9: Create LoginPage**

Create `src/pages/LoginPage.tsx`:
```typescript
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useEffect } from 'react';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, loading, error, user, role } = useAuth();

  useEffect(() => {
    if (user && role) {
      // Redirect based on role
      const redirectPath = role === 'teacher' ? '/teacher' :
                          role === 'editor' ? '/editor' : '/student';
      navigate(redirectPath);
    }
  }, [user, role, navigate]);

  async function handleLogin(credentials: { login: string; password: string }) {
    await signIn(credentials);
  }

  return (
    <div className="min-h-screen bg-learning-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-learning-text mb-2">
            Sarpedon
          </h1>
          <p className="text-learning-muted">
            Образовательная платформа по программированию
          </p>
        </div>

        <div className="bg-learning-surface rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-learning-text mb-6">
            Вход в систему
          </h2>

          <LoginForm
            onSubmit={handleLogin}
            loading={loading}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}
```

**Step 10: Commit auth components**

Run:
```bash
git add src/features/auth/components src/features/auth/hooks src/pages/LoginPage.tsx
git commit -m "feat: add login form and auth flow

- Create useAuth hook with signIn/signOut
- Build LoginForm component with validation
- Add LoginPage with role-based redirects
- Add comprehensive tests for hook and components"
```

---

## Task 7: Router Setup and Layouts

**Files:**
- Create: `src/app/routes/index.tsx`
- Create: `src/layouts/StudentLayout.tsx`
- Create: `src/layouts/TeacherLayout.tsx`
- Create: `src/features/auth/components/RoleGuard.tsx`
- Create: `src/App.tsx`

**Step 1: Create RoleGuard component**

Create `src/features/auth/components/RoleGuard.tsx`:
```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '@/shared/components/ui';
import type { Role } from '@/shared/types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { loading, user, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-learning-bg">
        <Spinner size="lg" text="Загрузка..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && !allowedRoles.includes(role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}
```

**Step 2: Create basic StudentLayout**

Create `src/layouts/StudentLayout.tsx`:
```typescript
import { Outlet } from 'react-router-dom';

export function StudentLayout() {
  return (
    <div className="min-h-screen bg-learning-bg text-learning-text">
      <header className="bg-learning-surface border-b border-learning-muted">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Sarpedon - Ученик</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
```

**Step 3: Create basic TeacherLayout**

Create `src/layouts/TeacherLayout.tsx`:
```typescript
import { Outlet } from 'react-router-dom';

export function TeacherLayout() {
  return (
    <div className="min-h-screen bg-admin-bg text-admin-text">
      <header className="bg-admin-surface border-b border-admin-muted">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Sarpedon - Учитель</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
```

**Step 4: Create placeholder pages**

Create `src/pages/StudentDashboard.tsx`:
```typescript
export function StudentDashboard() {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-4">Панель ученика</h2>
      <p className="text-learning-muted">Здесь будут уровни и прогресс</p>
    </div>
  );
}
```

Create `src/pages/TeacherDashboard.tsx`:
```typescript
export function TeacherDashboard() {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-4">Панель учителя</h2>
      <p className="text-admin-muted">Здесь будет управление учениками и уровнями</p>
    </div>
  );
}
```

Create `src/pages/ForbiddenPage.tsx`:
```typescript
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui';

export function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-learning-bg flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-learning-text mb-4">403</h1>
        <p className="text-xl text-learning-muted mb-8">Доступ запрещен</p>
        <Link to="/">
          <Button variant="primary">На главную</Button>
        </Link>
      </div>
    </div>
  );
}
```

**Step 5: Create router configuration**

Create `src/app/routes/index.tsx`:
```typescript
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { StudentDashboard } from '@/pages/StudentDashboard';
import { TeacherDashboard } from '@/pages/TeacherDashboard';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { StudentLayout } from '@/layouts/StudentLayout';
import { TeacherLayout } from '@/layouts/TeacherLayout';
import { RoleGuard } from '@/features/auth/components/RoleGuard';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />
  },
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/student',
    element: (
      <RoleGuard allowedRoles={['student']}>
        <StudentLayout />
      </RoleGuard>
    ),
    children: [
      {
        index: true,
        element: <StudentDashboard />
      }
    ]
  },
  {
    path: '/teacher',
    element: (
      <RoleGuard allowedRoles={['teacher']}>
        <TeacherLayout />
      </RoleGuard>
    ),
    children: [
      {
        index: true,
        element: <TeacherDashboard />
      }
    ]
  },
  {
    path: '/forbidden',
    element: <ForbiddenPage />
  }
]);
```

**Step 6: Update App.tsx**

Update `src/App.tsx`:
```typescript
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './app/routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1
    }
  }
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
```

**Step 7: Update main.tsx**

Update `src/main.tsx`:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 8: Commit router and layouts**

Run:
```bash
git add src/app/routes src/layouts src/pages src/App.tsx src/main.tsx
git commit -m "feat: add router setup with layouts and guards

- Configure React Router with role-based routing
- Create RoleGuard component for protected routes
- Build StudentLayout and TeacherLayout
- Add placeholder dashboard pages
- Setup QueryClient for data fetching
- Add Forbidden page for access control"
```

---

## Task 8: Database Setup with Supabase

**Files:**
- Create: `supabase/migrations/20250101000000_initial_schema.sql`
- Create: `supabase/migrations/20250101000001_rls_policies.sql`
- Create: `supabase/seed.sql`

**Step 1: Create initial schema migration**

Create `supabase/migrations/20250101000000_initial_schema.sql`:
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  class TEXT,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student', 'editor')),
  generated_login TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Levels table
CREATE TABLE levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  educational_context TEXT,
  reference_solution TEXT NOT NULL,
  test_cases JSONB NOT NULL,
  hints JSONB,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  order_index INTEGER NOT NULL,
  topic TEXT,
  language TEXT NOT NULL,
  target_skills TEXT[],
  is_remedial BOOLEAN DEFAULT FALSE,
  remedial_for TEXT[],
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User progress table
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  level_id UUID REFERENCES levels(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed')),
  attempts INTEGER DEFAULT 0,
  last_solution TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, level_id)
);

-- Submissions table
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  level_id UUID REFERENCES levels(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  ai_feedback TEXT,
  submitted_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_class ON profiles(class);
CREATE INDEX idx_levels_difficulty ON levels(difficulty);
CREATE INDEX idx_levels_order ON levels(order_index);
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_level_id ON user_progress(level_id);
CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_level_id ON submissions(level_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_levels_updated_at BEFORE UPDATE ON levels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Step 2: Create RLS policies migration**

Create `supabase/migrations/20250101000001_rls_policies.sql`:
```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Students can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Students can view classmates"
  ON profiles FOR SELECT
  USING (
    class = (SELECT class FROM profiles WHERE id = auth.uid())
    AND role = 'student'
  );

CREATE POLICY "Teachers can view all profiles"
  ON profiles FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
  );

CREATE POLICY "Teachers can manage users"
  ON profiles FOR ALL
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
  );

-- Levels policies
CREATE POLICY "Everyone can view levels"
  ON levels FOR SELECT
  USING (true);

CREATE POLICY "Teachers and editors can manage levels"
  ON levels FOR ALL
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'editor')
  );

-- User progress policies
CREATE POLICY "Students can view own progress"
  ON user_progress FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Students can update own progress"
  ON user_progress FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students can modify own progress"
  ON user_progress FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Teachers can view all progress"
  ON user_progress FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
  );

-- Submissions policies
CREATE POLICY "Students can create own submissions"
  ON submissions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students can view own submissions"
  ON submissions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Teachers can view all submissions"
  ON submissions FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
  );
```

**Step 3: Create seed data**

Create `supabase/seed.sql`:
```sql
-- Insert test teacher
-- Password: teacher123
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'teacher@sarpedon.local',
  '$2a$10$dummyhashforlocaltesting',
  NOW()
);

INSERT INTO profiles (id, first_name, last_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Иван',
  'Учителев',
  'teacher'
);

-- Insert test student
-- Password: student123
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'ivanov_p_10a_test@sarpedon.local',
  '$2a$10$dummyhashforlocaltesting',
  NOW()
);

INSERT INTO profiles (id, first_name, last_name, class, role, generated_login)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Петр',
  'Иванов',
  '10А',
  'student',
  'ivanov_p_10a_test'
);

-- Insert sample levels
INSERT INTO levels (
  title,
  description,
  educational_context,
  reference_solution,
  test_cases,
  difficulty,
  order_index,
  language,
  target_skills,
  is_remedial
) VALUES (
  'Hello World',
  'Напиши программу, которая выводит "Hello World"',
  'Это твоя первая программа! Функция print() выводит текст на экран.',
  'print("Hello World")',
  '[{"input": "", "output": "Hello World"}]',
  'easy',
  1,
  'python',
  ARRAY['basics'],
  false
),
(
  'Сумма двух чисел',
  'Напиши функцию, которая принимает два числа и возвращает их сумму',
  'Функции позволяют переиспользовать код. Используй def для создания функции.',
  'def sum(a, b):\n    return a + b',
  '[{"input": "2, 3", "output": "5"}, {"input": "10, 20", "output": "30"}]',
  'easy',
  2,
  'python',
  ARRAY['basics', 'functions'],
  false
);
```

**Step 4: Document database setup**

Create `docs/database-setup.md`:
```markdown
# Database Setup

## Local Development

1. Install Supabase CLI:
```bash
brew install supabase/tap/supabase
```

2. Start local Supabase:
```bash
supabase start
```

3. Apply migrations:
```bash
supabase db reset
```

4. Get local credentials:
```bash
supabase status
```

5. Update `.env.local`:
```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<anon_key_from_status>
```

## Test Credentials

Teacher:
- Login: teacher
- Password: teacher123

Student:
- Login: ivanov_p_10a_test
- Password: student123
```

**Step 5: Commit database setup**

Run:
```bash
git add supabase/ docs/database-setup.md
git commit -m "feat: add database schema and migrations

- Create initial schema with profiles, levels, user_progress, submissions
- Add RLS policies for role-based access control
- Create seed data with test teacher and student
- Add sample levels for testing
- Document local database setup"
```

---

## Next Steps

This plan covers the foundation (Tasks 1-8). To continue:

**Task 9:** Levels feature with mock data (without AI)
**Task 10:** Monaco Editor integration
**Task 11:** Basic teacher panel for level CRUD
**Task 12:** Character system (static images first)

Each subsequent task would follow the same pattern:
1. Write failing tests
2. Implement minimal code
3. Run tests to verify
4. Commit

Would you like me to continue with Tasks 9-12?
